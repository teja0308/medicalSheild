/**
 * Offline bill parser for DEMO_MODE / missing Gemini.
 * Pulls CPT/HCPCS codes and charges from plain bill text.
 */
export function parseBillTextLocally(rawText) {
  const text = String(rawText || '');
  const detectedCptCodes = [];

  // Prefer lines that start with a CPT/HCPCS code
  const lineRe =
    /(?:^|\n)\s*([A-Z]\d{4}|\d{5})\b([^\n]*?)(\d{1,3}(?:,\d{3})*\.\d{2}|\d+\.\d{2})\s*(?=\n|$)/g;

  let match;
  while ((match = lineRe.exec(text)) !== null) {
    const code = match[1];
    const charge = Number(String(match[3]).replace(/,/g, ''));
    if (!Number.isFinite(charge) || charge < 1) continue;

    const desc = match[2]
      .replace(/[$]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    detectedCptCodes.push({
      code,
      description: desc || `Procedure ${code}`,
      charge,
    });
  }

  const totalMatch =
    text.match(/TOTAL\s*(?:AMOUNT\s*)?(?:DUE|BILLED)?[:\s]*\$?\s*([\d,]+\.?\d*)/i) ||
    text.match(/SUBTOTAL[:\s]*\$?\s*([\d,]+\.?\d*)/i);

  const totalBilledAmount = totalMatch
    ? Number(String(totalMatch[1]).replace(/,/g, ''))
    : detectedCptCodes.reduce((sum, item) => sum + item.charge, 0);

  return { totalBilledAmount, detectedCptCodes };
}

/**
 * Rule-based auditor used when Gemini is unavailable / DEMO_MODE file upload.
 * Flags duplicates, known unbundled supplies, and over-cap imaging using policy text.
 */
export function auditBillLocally(extractedBillData, policyContextBlocks = []) {
  const policyText = policyContextBlocks.map((b) => b.textChunk).join('\n').toLowerCase();
  const flaggedItems = [];
  const seenCodes = new Map();

  for (const item of extractedBillData.detectedCptCodes || []) {
    const count = (seenCodes.get(item.code) || 0) + 1;
    seenCodes.set(item.code, count);

    // Duplicate E/M / any duplicate CPT
    if (count > 1) {
      flaggedItems.push({
        cptCode: item.code,
        description: `${item.description} (duplicate)`,
        hospitalCharge: item.charge,
        estimatedSaving: item.charge,
        insuranceCoverageRules:
          policyText.includes('duplicate') || policyText.includes('only one initial')
            ? 'Policy excerpt: only one initial hospital visit / duplicate codes are not payable.'
            : 'Duplicate procedure codes on the same bill are typically not reimbursable.',
        savingExplanation: `CPT ${item.code} appears more than once. The duplicate charge of $${item.charge.toFixed(2)} is likely wrongly billed.`,
        actionRequired: `Request removal of the duplicate ${item.code} line item.`,
      });
      continue;
    }

    // CT over allowed amount (~2100)
    if (item.code === '70450' && item.charge > 2100) {
      const saving = item.charge - 2100;
      flaggedItems.push({
        cptCode: item.code,
        description: item.description,
        hospitalCharge: item.charge,
        estimatedSaving: saving,
        insuranceCoverageRules:
          policyText.includes('2100') || policyText.includes('ct head')
            ? 'Policy §7.1 — CT head without contrast capped at $2,100 contracted allowed amount.'
            : 'In-network CT imaging is commonly capped at a contracted allowed amount.',
        savingExplanation: `Hospital charged $${item.charge.toFixed(2)} vs allowed $2,100 (overcharge $${saving.toFixed(2)}).`,
        actionRequired: 'Appeal for adjustment to the contracted allowed amount.',
      });
    }

    // Unbundled saline / unclassified drugs
    if (item.code === 'J3490') {
      flaggedItems.push({
        cptCode: item.code,
        description: item.description,
        hospitalCharge: item.charge,
        estimatedSaving: Math.max(0, item.charge - 60),
        insuranceCoverageRules:
          policyText.includes('saline') || policyText.includes('bundled')
            ? 'Policy §9.4 — Routine IV saline billed under J3490 is bundled into room charges.'
            : 'Routine IV fluids are typically bundled and not separately payable.',
        savingExplanation: 'Separate saline/unclassified drug charge appears unbundled from facility fees.',
        actionRequired: 'Dispute as unbundled supply and request credit.',
      });
    }

    // Undocumented supplies 99070 over $545
    if (item.code === '99070' && item.charge > 545) {
      const saving = item.charge - 545;
      flaggedItems.push({
        cptCode: item.code,
        description: item.description,
        hospitalCharge: item.charge,
        estimatedSaving: saving,
        insuranceCoverageRules:
          policyText.includes('99070') || policyText.includes('itemization')
            ? 'Policy §9.2 — Undocumented 99070 supplies limited to $545 without itemization.'
            : 'Miscellaneous supply codes require itemization to be fully payable.',
        savingExplanation: `Undocumented supplies exceed the $545 documentation threshold by $${saving.toFixed(2)}.`,
        actionRequired: 'Demand an itemized supply list or write-off of excess charges.',
      });
    }
  }

  const potentialSavings = flaggedItems.reduce((sum, i) => sum + i.estimatedSaving, 0);

  const letterLines = flaggedItems.map(
    (f, i) =>
      `${i + 1}. CPT ${f.cptCode} — $${f.hospitalCharge.toFixed(2)}\n   ${f.savingExplanation}\n   Requested savings: $${f.estimatedSaving.toFixed(2)}`
  );

  const generatedAppealLetter =
    flaggedItems.length === 0
      ? 'Dear Claims Review Department,\n\nAfter reviewing this bill against the uploaded policy excerpts, no clear wrongful charges were identified.\n\nSincerely,\n[Patient Name]'
      : `Dear Claims Review Department,

I am disputing wrongful charges on the enclosed hospital bill totaling $${Number(extractedBillData.totalBilledAmount || 0).toFixed(2)}. Estimated recoverable amount: $${potentialSavings.toFixed(2)}.

${letterLines.join('\n\n')}

Please reopen this claim, apply the corrections above, and issue a revised EOB.

Sincerely,
[Patient Name]
[Policy / Member ID]
[Date]`;

  return { potentialSavings, flaggedItems, generatedAppealLetter };
}
