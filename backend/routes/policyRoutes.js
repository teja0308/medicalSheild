import express from 'express';
import multer from 'multer';
import mongoose from 'mongoose';
import { extractTextFromPDFBuffer } from '../Utils/pdfParser.js';
import { splitTextIntoChunks } from '../Utils/textSplitter.js';
import { generateEmbedding, generateDemoEmbedding } from '../Utils/embedder.js';
import PolicyChunk from '../models/PolicyChunk.js';
import { optionalAuth } from '../middleware/authMiddleware.js';
import {
  memoryClearUserPolicies,
  memorySavePolicyChunk,
  memoryStoreEnabled,
} from '../Utils/memoryStore.js';
import { DEMO_POLICY_RESULT } from '../Utils/demoData.js';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});

const PLACEHOLDER_USER_ID = '65a0b765c71d2b34a8eef001';

function resolveUserId(req) {
  // Prefer authenticated user only — never trust a stale body userId from another account.
  if (req.user?._id) return req.user._id.toString();
  return PLACEHOLDER_USER_ID;
}

function isDemoMode() {
  return process.env.DEMO_MODE === 'true';
}

function useMemory() {
  return memoryStoreEnabled() || mongoose.connection.readyState !== 1;
}

router.post('/upload', optionalAuth, upload.single('policy'), async (req, res) => {
  try {
    if (!req.file && !isDemoMode()) {
      return res.status(400).json({ error: 'Please select an insurance policy PDF to upload.' });
    }

    if (isDemoMode() && !req.file) {
      return res.status(200).json(DEMO_POLICY_RESULT);
    }

    const policyName = req.file.originalname;
    const userId = resolveUserId(req);

    console.log(`⏳ Commencing ingestion pipeline for: ${policyName}`);

    const parsedPdf = await extractTextFromPDFBuffer(req.file.buffer);
    if (!parsedPdf.text?.trim()) {
      return res.status(400).json({
        error: 'Could not extract text from this PDF. Try a text-based (non-scanned) policy file.',
      });
    }

    const textChunks = splitTextIntoChunks(parsedPdf.text).filter((c) => c.trim().length > 40);
    if (textChunks.length === 0) {
      return res.status(400).json({ error: 'Policy PDF did not contain enough readable text to index.' });
    }

    console.log(`🔪 Document successfully cut into ${textChunks.length} individual fragments.`);

    if (useMemory()) {
      memoryClearUserPolicies(userId);
    } else {
      await PolicyChunk.deleteMany({ userId });
    }

    const embedFn = isDemoMode() ? generateDemoEmbedding : generateEmbedding;

    // Process in small batches to avoid Gemini rate limits
    const batchSize = 5;
    let stored = 0;

    for (let i = 0; i < textChunks.length; i += batchSize) {
      const batch = textChunks.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (chunk, batchIndex) => {
          const index = i + batchIndex;
          const vectorValues = await embedFn(chunk);
          const doc = {
            userId,
            policyName,
            textChunk: chunk,
            embedding: vectorValues,
            metadata: {
              pageNumber: Math.floor(index / 3) + 1,
              sectionTitle: 'Insurance Policy Provision',
            },
          };

          if (useMemory()) {
            memorySavePolicyChunk(doc);
          } else {
            await new PolicyChunk(doc).save();
          }
          stored += 1;
        })
      );
    }

    console.log(`✅ Success: Added ${stored} document vectors.`);

    res.status(200).json({
      success: true,
      message: `Policy '${policyName}' processed and indexed (${stored} chunks). You can now upload a hospital bill.`,
      chunksStored: stored,
      policyName,
    });
  } catch (error) {
    console.error('❌ Ingestion Pipeline Failure:', error);

    if (isDemoMode()) {
      return res.status(200).json(DEMO_POLICY_RESULT);
    }

    const message =
      error.message?.includes('API key') ||
      error.message?.includes('GEMINI') ||
      error.message?.includes('UNAUTHENTICATED') ||
      error.status === 401
        ? 'Invalid or missing GEMINI_API_KEY in backend/.env — get a key at https://aistudio.google.com/apikey'
        : error.message?.includes('parse')
          ? error.message
          : 'Critical system error encountered during policy vectorization.';
    res.status(500).json({ error: message });
  }
});

router.post('/demo', optionalAuth, (_req, res) => {
  res.status(200).json(DEMO_POLICY_RESULT);
});

export default router;
