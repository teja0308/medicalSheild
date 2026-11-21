/**
 * Sample audit payload used when DEMO_MODE=true or APIs are unavailable.
 * Mirrors a realistic wrong-billing scenario for demos and local testing.
 */
export const DEMO_AUDIT_RESULT = {
  success: true,
  sessionId: 'demo-session-001',
  billName: 'Sample_Hospital_Bill.pdf',
  extractedBillData: {
    totalBilledAmount: 18450.0,
    detectedCptCodes: [
      { code: '99223', description: 'Initial hospital care, high complexity', charge: 1850.0 },
      { code: '93000', description: 'Electrocardiogram, complete', charge: 425.0 },
      { code: '80053', description: 'Comprehensive metabolic panel', charge: 890.0 },
      { code: '70450', description: 'CT head without contrast', charge: 4200.0 },
      { code: 'J3490', description: 'Unclassified drugs (IV saline bags)', charge: 680.0 },
      { code: '99223', description: 'Initial hospital care, high complexity (duplicate)', charge: 1850.0 },
      { code: '94640', description: 'Pressurized inhalation treatment', charge: 315.0 },
      { code: 'A0425', description: 'Ground mileage ambulance', charge: 1240.0 },
      { code: '99070', description: 'Supplies and materials', charge: 2100.0 },
      { code: '96365', description: 'IV infusion, initial hour', charge: 4900.0 },
    ],
  },
  auditResults: {
    potentialSavings: 7125.0,
    flaggedItems: [
      {
        cptCode: '99223',
        description: 'Initial hospital care, high complexity (duplicate)',
        hospitalCharge: 1850.0,
        estimatedSaving: 1850.0,
        insuranceCoverageRules:
          'Policy §4.2 — Evaluation & Management: only one initial hospital visit (99223) is reimbursable per admission date.',
        savingExplanation:
          'The same high-complexity initial visit was billed twice on the same admission. Duplicate E/M charges are not payable.',
        actionRequired: 'Request removal of the duplicate 99223 line and reissue an itemized statement.',
      },
      {
        cptCode: '70450',
        description: 'CT head without contrast',
        hospitalCharge: 4200.0,
        estimatedSaving: 2100.0,
        insuranceCoverageRules:
          'Policy §7.1 — Imaging: in-network CT without contrast is capped at the contracted rate of $2,100.',
        savingExplanation:
          'Hospital charged $4,200 — roughly 2× the plan’s allowed amount for an in-network facility CT head.',
        actionRequired: 'Appeal for adjustment to the contracted allowed amount; attach EOB and fee schedule cite.',
      },
      {
        cptCode: 'J3490',
        description: 'Unclassified drugs (IV saline bags)',
        hospitalCharge: 680.0,
        estimatedSaving: 620.0,
        insuranceCoverageRules:
          'Policy §9.4 — Facility supplies: routine IV fluids are bundled into room/observation charges and not separately billable.',
        savingExplanation:
          'Saline bags are typically unbundled “facility fee” padding. Separate J3490 charges for routine saline are usually denied.',
        actionRequired: 'Dispute as unbundled supply; demand credit for routine IV fluids already covered under room rate.',
      },
      {
        cptCode: '99070',
        description: 'Supplies and materials',
        hospitalCharge: 2100.0,
        estimatedSaving: 1555.0,
        insuranceCoverageRules:
          'Policy §9.2 — Miscellaneous supplies: generic 99070 requires itemization; undocumented supplies are limited to $545 max.',
        savingExplanation:
          'Catch-all supply code with no itemized list. Without documentation, most of this charge is not payable.',
        actionRequired: 'Demand a fully itemized supply list or write-off of undocumented 99070 charges.',
      },
    ],
    generatedAppealLetter: `Dear Claims Review Department,

I am writing to formally dispute charges on the enclosed hospital bill (Sample_Hospital_Bill.pdf) totaling $18,450.00. After comparing the itemized statement to my policy coverage rules, I have identified $7,125.00 in charges that appear improperly billed.

1. CPT 99223 — Duplicate initial hospital visit ($1,850)
   Policy §4.2 allows only one initial hospital E/M code per admission. A second 99223 on the same stay is a duplicate and should be removed.

2. CPT 70450 — CT head without contrast ($4,200)
   Policy §7.1 caps the in-network allowed amount at $2,100. Please adjust this line to the contracted rate (estimated overcharge: $2,100).

3. CPT J3490 — Unclassified IV saline ($680)
   Policy §9.4 states routine IV fluids are bundled into facility/room charges and are not separately reimbursable. Please reverse this unbundled supply charge.

4. CPT 99070 — Undocumented supplies ($2,100)
   Policy §9.2 requires itemization for miscellaneous supplies. Absent a detailed list, please write off the amount exceeding the $545 documentation threshold ($1,555).

Please reopen this claim, apply the corrections above, and issue a revised Explanation of Benefits reflecting the adjusted balance. I am happy to provide any additional documentation you require.

Sincerely,
[Patient Name]
[Policy / Member ID]
[Date]`,
  },
};

export const DEMO_POLICY_RESULT = {
  success: true,
  message:
    "Demo policy 'Sample_PPO_Gold_2026.pdf' indexed (simulated). Upload a bill or click Run Demo Audit to see flagged overcharges.",
  chunksStored: 24,
  demo: true,
};
