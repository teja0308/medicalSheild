import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * Communicates with Gemini to turn text into a 768-dimension embedding vector.
 */
export async function generateEmbedding(textChunk) {
  try {
    const response = await ai.models.embedContent({
      model: 'gemini-embedding-2',
      contents: textChunk,
      config: { outputDimensionality: 768 },
    });

    if (response.embeddings && response.embeddings[0]) {
      return response.embeddings[0].values;
    }

    throw new Error('Failed to extract valid matrix values from Gemini response.');
  } catch (error) {
    console.error('❌ Gemini Vector Generation Failure:', error.message || error);
    throw error;
  }
}

/**
 * Simple hash-based pseudo-embedding for DEMO_MODE (deterministic, 768-dim).
 */
export function generateDemoEmbedding(textChunk) {
  const dim = 768;
  const vector = new Array(dim).fill(0);
  const text = String(textChunk || '');

  for (let i = 0; i < text.length; i++) {
    const idx = (text.charCodeAt(i) * (i + 17)) % dim;
    vector[idx] += ((text.charCodeAt(i) % 13) - 6) / 10;
  }

  let norm = 0;
  for (let i = 0; i < dim; i++) norm += vector[i] * vector[i];
  norm = Math.sqrt(norm) || 1;
  return vector.map((v) => v / norm);
}
