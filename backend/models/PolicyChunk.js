import mongoose from 'mongoose';

const PolicyChunkSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  policyName: { type: String, required: true }, // e.g., "Standard_PPO_Gold_2026.pdf"
  textChunk: { type: String, required: true },   // Individual extracted paragraphs/sections
  embedding: { type: [Number], required: true }, // 768-dimension floating-point vector
  metadata: {
    pageNumber: { type: Number },
    sectionTitle: { type: String }
  }
});

export default mongoose.model('PolicyChunk', PolicyChunkSchema);
