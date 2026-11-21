import PolicyChunk from '../models/PolicyChunk.js';
import { memoryFindPolicyChunks, memoryStoreEnabled } from './memoryStore.js';
import mongoose from 'mongoose';

/**
 * Computes cosine similarity between two equal-length vectors.
 */
export function cosineSimilarity(vecA, vecB) {
  if (!vecA?.length || !vecB?.length || vecA.length !== vecB.length) {
    return 0;
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dot / denominator;
}

/**
 * Retrieves the most relevant policy chunks for a query embedding via cosine similarity.
 */
export async function searchPolicyChunks(queryEmbedding, userId, limit = 5) {
  let chunks = [];

  const useMemory =
    memoryStoreEnabled() || mongoose.connection.readyState !== 1;

  if (useMemory) {
    chunks = memoryFindPolicyChunks(userId);
  } else {
    const filter = userId ? { userId } : {};
    chunks = await PolicyChunk.find(filter).lean();
  }

  const ranked = chunks
    .map((chunk) => ({
      policyName: chunk.policyName,
      textChunk: chunk.textChunk,
      metadata: chunk.metadata,
      score: cosineSimilarity(queryEmbedding, chunk.embedding),
    }))
    .sort((a, b) => b.score - a.score);

  return ranked.slice(0, limit);
}
