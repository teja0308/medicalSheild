import mongoose from 'mongoose';

const AuditSessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  billName: { type: String, required: true },
  extractedBillData: {
    totalBilledAmount: { type: Number },
    detectedCptCodes: [{
      code: { type: String },
      description: { type: String },
      charge: { type: Number }
    }]
  },
  auditResults: {
    potentialSavings: { type: Number },
    flaggedItems: [{
      cptCode: { type: String },
      description: { type: String },
      hospitalCharge: { type: Number },
      estimatedSaving: { type: Number },
      insuranceCoverageRules: { type: String }, // RAG contextual background
      savingExplanation: { type: String },      // Explanation of overcharge
      actionRequired: { type: String }          // Reconsideration steps
    }],
    generatedAppealLetter: { type: String }     // Final pre-drafted appeal letter
  },
  createdAt: { type: Date, default: Date.now }
});


export default mongoose.model('AuditSession',AuditSessionSchema);
