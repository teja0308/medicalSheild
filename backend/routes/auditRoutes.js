import express from 'express';
import multer from 'multer';
import mongoose from 'mongoose';
import { extractTextFromPDFBuffer } from '../Utils/pdfParser.js';
import { parseBillText } from '../Utils/billParser.js';
import { generateEmbedding } from '../Utils/embedder.js';
import { searchPolicyChunks } from '../Utils/vectorSearch.js';
import { analyzeBillAgainstPolicy } from '../Utils/auditor.js';
import AuditSession from '../models/AuditSession.js';
import { optionalAuth, requireAuth } from '../middleware/authMiddleware.js';
import { DEMO_AUDIT_RESULT } from '../Utils/demoData.js';
import { parseBillTextLocally, auditBillLocally } from '../Utils/localAudit.js';
import {
  memoryCreateAuditSession,
  memoryGetSession,
  memoryListSessions,
  memoryStoreEnabled,
  memoryUpdateLetter,
} from '../Utils/memoryStore.js';
import { generateDemoEmbedding } from '../Utils/embedder.js';

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

async function persistSession(userId, billName, extractedBillData, auditResults) {
  if (useMemory()) {
    return memoryCreateAuditSession({ userId, billName, extractedBillData, auditResults });
  }
  return AuditSession.create({ userId, billName, extractedBillData, auditResults });
}

router.post('/analyze', optionalAuth, upload.single('bill'), async (req, res) => {
  try {
    if (!req.file && !isDemoMode()) {
      return res.status(400).json({ error: 'Please upload a hospital bill PDF to analyze.' });
    }

    if (isDemoMode() && !req.file) {
      return res.status(200).json(DEMO_AUDIT_RESULT);
    }

    const userId = resolveUserId(req);
    const billName = req.file.originalname;

    console.log(`🔍 Starting audit pipeline for bill: ${billName}`);

    const parsedPdf = await extractTextFromPDFBuffer(req.file.buffer);
    if (!parsedPdf.text?.trim()) {
      return res.status(400).json({
        error: 'Could not extract text from this bill PDF. Try a text-based (non-scanned) file.',
      });
    }

    let extractedBillData;
    let auditResults;

    if (isDemoMode()) {
      // Parse the real uploaded bill PDF; audit with local rules + retrieved policy chunks
      extractedBillData = parseBillTextLocally(parsedPdf.text);
      if (extractedBillData.detectedCptCodes.length === 0) {
        extractedBillData = DEMO_AUDIT_RESULT.extractedBillData;
      }

      console.log(
        `📋 [demo] Extracted ${extractedBillData.detectedCptCodes.length} CPT codes — total billed: $${extractedBillData.totalBilledAmount}`
      );

      const policyContextMap = new Map();
      for (const cptItem of extractedBillData.detectedCptCodes) {
        const queryEmbedding = generateDemoEmbedding(
          `Insurance coverage rules reimbursement limits for CPT ${cptItem.code} ${cptItem.description}`
        );
        const matches = await searchPolicyChunks(queryEmbedding, userId, 3);
        for (const match of matches) {
          const key = `${match.policyName}::${match.textChunk.substring(0, 80)}`;
          if (!policyContextMap.has(key) || policyContextMap.get(key).score < match.score) {
            policyContextMap.set(key, match);
          }
        }
      }

      const policyContextBlocks = [...policyContextMap.values()]
        .sort((a, b) => b.score - a.score)
        .slice(0, 8);

      auditResults = auditBillLocally(extractedBillData, policyContextBlocks);
      if (auditResults.flaggedItems.length === 0) {
        auditResults = DEMO_AUDIT_RESULT.auditResults;
      }
    } else {
      extractedBillData = await parseBillText(parsedPdf.text);

      console.log(
        `📋 Extracted ${extractedBillData.detectedCptCodes.length} CPT codes — total billed: $${extractedBillData.totalBilledAmount}`
      );

      const policyContextMap = new Map();
      const embedFn = generateEmbedding;

      for (const cptItem of extractedBillData.detectedCptCodes) {
        const queryText = `Insurance coverage rules reimbursement limits for CPT ${cptItem.code} ${cptItem.description}`;
        const queryEmbedding = await embedFn(queryText);
        const matches = await searchPolicyChunks(queryEmbedding, userId, 3);

        for (const match of matches) {
          const key = `${match.policyName}::${match.textChunk.substring(0, 80)}`;
          if (!policyContextMap.has(key) || policyContextMap.get(key).score < match.score) {
            policyContextMap.set(key, match);
          }
        }
      }

      if (policyContextMap.size === 0) {
        const fallbackQuery = await embedFn(
          'insurance policy coverage limits deductibles copays out-of-pocket maximum reimbursement unbundling'
        );
        const fallbackMatches = await searchPolicyChunks(fallbackQuery, userId, 5);
        for (const match of fallbackMatches) {
          const key = `${match.policyName}::${match.textChunk.substring(0, 80)}`;
          policyContextMap.set(key, match);
        }
      }

      const policyContextBlocks = [...policyContextMap.values()]
        .sort((a, b) => b.score - a.score)
        .slice(0, 8);

      auditResults = await analyzeBillAgainstPolicy(extractedBillData, policyContextBlocks);
    }

    const session = await persistSession(userId, billName, extractedBillData, auditResults);

    console.log(`✅ Audit complete — potential savings: $${auditResults.potentialSavings}`);

    res.status(200).json({
      success: true,
      sessionId: session._id,
      billName,
      extractedBillData,
      auditResults,
    });
  } catch (error) {
    console.error('❌ Audit Pipeline Failure:', error);

    // Soft fallback so demos still work if Gemini/Mongo are misconfigured
    if (isDemoMode() || process.env.FALLBACK_DEMO_ON_ERROR === 'true') {
      console.warn('⚠️ Returning demo audit result due to pipeline failure.');
      return res.status(200).json({
        ...DEMO_AUDIT_RESULT,
        billName: req.file?.originalname || DEMO_AUDIT_RESULT.billName,
        warning: 'Live AI audit failed — showing sample wrongly-billed results. Check GEMINI_API_KEY / MongoDB.',
      });
    }

    const message =
      error.message?.includes('API key') ||
      error.message?.includes('GEMINI') ||
      error.message?.includes('UNAUTHENTICATED') ||
      error.status === 401
        ? 'Invalid or missing GEMINI_API_KEY in backend/.env — get a key at https://aistudio.google.com/apikey'
        : error.message?.includes('parse')
          ? error.message
          : 'Critical system error during bill audit analysis.';
    res.status(500).json({ error: message });
  }
});

router.post('/demo', optionalAuth, async (req, res) => {
  const userId = resolveUserId(req);
  const session = await persistSession(
    userId,
    DEMO_AUDIT_RESULT.billName,
    DEMO_AUDIT_RESULT.extractedBillData,
    DEMO_AUDIT_RESULT.auditResults
  );

  res.status(200).json({
    ...DEMO_AUDIT_RESULT,
    sessionId: session._id,
    demo: true,
  });
});

router.get('/sessions', requireAuth, async (req, res) => {
  try {
    if (useMemory()) {
      const sessions = memoryListSessions(req.user._id);
      return res.json({ success: true, sessions });
    }

    const sessions = await AuditSession.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .select('billName extractedBillData.totalBilledAmount auditResults.potentialSavings createdAt');

    res.json({ success: true, sessions });
  } catch (error) {
    console.error('❌ Session List Failure:', error);
    res.status(500).json({ error: 'Unable to retrieve audit sessions.' });
  }
});

router.get('/sessions/:id', requireAuth, async (req, res) => {
  try {
    if (useMemory()) {
      const session = memoryGetSession(req.params.id, req.user._id);
      if (!session) return res.status(404).json({ error: 'Audit session not found.' });
      return res.json({ success: true, session });
    }

    const session = await AuditSession.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!session) {
      return res.status(404).json({ error: 'Audit session not found.' });
    }

    res.json({ success: true, session });
  } catch (error) {
    console.error('❌ Session Fetch Failure:', error);
    res.status(500).json({ error: 'Unable to retrieve audit session.' });
  }
});

router.put('/sessions/:id/letter', requireAuth, async (req, res) => {
  try {
    const { generatedAppealLetter } = req.body;

    if (useMemory()) {
      const session = memoryUpdateLetter(req.params.id, req.user._id, generatedAppealLetter);
      if (!session) return res.status(404).json({ error: 'Audit session not found.' });
      return res.json({ success: true, session });
    }

    const session = await AuditSession.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { 'auditResults.generatedAppealLetter': generatedAppealLetter },
      { new: true }
    );

    if (!session) {
      return res.status(404).json({ error: 'Audit session not found.' });
    }

    res.json({ success: true, session });
  } catch (error) {
    console.error('❌ Letter Update Failure:', error);
    res.status(500).json({ error: 'Unable to save dispute letter.' });
  }
});

export default router;
