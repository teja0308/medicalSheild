import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const AUDIT_RESULT_SCHEMA = {
  type: 'object',
  properties: {
    potentialSavings: {
      type: 'number',
      description: 'Total estimated savings in USD across all flagged line items.',
    },
    flaggedItems: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          cptCode: { type: 'string' },
          description: { type: 'string' },
          hospitalCharge: { type: 'number' },
          insuranceCoverageRules: { type: 'string' },
          savingExplanation: { type: 'string' },
          actionRequired: { type: 'string' },
          estimatedSaving: { type: 'number' },
        },
        required: [
          'cptCode',
          'description',
          'hospitalCharge',
          'insuranceCoverageRules',
          'savingExplanation',
          'actionRequired',
          'estimatedSaving',
        ],
      },
    },
    generatedAppealLetter: {
      type: 'string',
      description: 'Formal dispute letter addressed to the insurance provider.',
    },
  },
  required: ['potentialSavings', 'flaggedItems', 'generatedAppealLetter'],
};

/**
 * Uses Gemini to compare bill line items against retrieved policy context.
 */
export async function analyzeBillAgainstPolicy(extractedBillData, policyContextBlocks) {
  const policyContext = policyContextBlocks
    .map(
      (block, index) =>
        `[Policy Excerpt ${index + 1} — ${block.policyName} | relevance: ${block.score.toFixed(3)}]\n${block.textChunk}`
    )
    .join('\n\n---\n\n');

  const billSummary = JSON.stringify(extractedBillData, null, 2);

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `You are an expert medical bill auditor and insurance appeals specialist.

Analyze the hospital bill below against the insurance policy excerpts. For each CPT line item:
1. Determine whether the charge appears inflated, duplicated, not covered, unbundled, or misclassified.
2. Only include items that are WRONGLY billed in flaggedItems (skip clean charges).
3. Cite the relevant policy language in insuranceCoverageRules.
4. Explain the overcharge in savingExplanation and recommend actionRequired.
5. Estimate realistic savings in estimatedSaving (must be > 0 for every flagged item).

Set potentialSavings to the sum of all estimatedSaving values.
Draft a professional, formal dispute/appeal letter in generatedAppealLetter referencing specific CPT codes and policy clauses.

If no overcharges are found, return potentialSavings as 0, an empty flaggedItems array, and a letter stating the bill appears compliant.

--- EXTRACTED BILL DATA ---
${billSummary}

--- RETRIEVED POLICY CONTEXT ---
${policyContext || 'No policy context available. Flag items that appear unusually high based on standard medical billing norms (duplicate codes, unbundled supplies, above-market imaging rates).'}`,
          },
        ],
      },
    ],
    config: {
      responseMimeType: 'application/json',
      responseJsonSchema: AUDIT_RESULT_SCHEMA,
    },
  });

  const rawJson = response.text;
  if (!rawJson) {
    throw new Error('Gemini returned an empty audit response.');
  }

  const parsed = JSON.parse(rawJson);

  const flaggedItems = Array.isArray(parsed.flaggedItems)
    ? parsed.flaggedItems
        .map((item) => ({
          cptCode: String(item.cptCode ?? ''),
          description: String(item.description ?? ''),
          hospitalCharge: Number(item.hospitalCharge) || 0,
          insuranceCoverageRules: String(item.insuranceCoverageRules ?? ''),
          savingExplanation: String(item.savingExplanation ?? ''),
          actionRequired: String(item.actionRequired ?? ''),
          estimatedSaving: Number(item.estimatedSaving) || 0,
        }))
        .filter((item) => item.estimatedSaving > 0 || item.savingExplanation)
    : [];

  const potentialSavings =
    Number(parsed.potentialSavings) ||
    flaggedItems.reduce((sum, item) => sum + item.estimatedSaving, 0);

  return {
    potentialSavings,
    flaggedItems,
    generatedAppealLetter: String(parsed.generatedAppealLetter ?? ''),
  };
}
