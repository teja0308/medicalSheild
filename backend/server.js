import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import policyRoutes from './routes/policyRoutes.js';
import auditRoutes from './routes/auditRoutes.js';
import authRoutes from './routes/authRoutes.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/policies', policyRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/auth', authRoutes);

app.get('/api/health', (req, res) => {
  const dbReady = mongoose.connection.readyState === 1;
  res.json({
    status: 'active',
    subsystem: 'MERN-RAG Pipeline operational',
    database: dbReady ? 'connected' : process.env.DEMO_MODE === 'true' ? 'memory (demo)' : 'disconnected',
    demoMode: process.env.DEMO_MODE === 'true',
  });
});

const PORT = process.env.PORT || 5000;

async function startServer() {
  const demoMode = process.env.DEMO_MODE === 'true';
  const geminiKey = process.env.GEMINI_API_KEY?.trim();

  if (!demoMode && (!geminiKey || geminiKey === 'your_actual_gemini_api_key')) {
    console.warn('⚠️  GEMINI_API_KEY is missing or still a placeholder in backend/.env');
    console.warn('   Get a key from https://aistudio.google.com/apikey');
    console.warn('   Or set DEMO_MODE=true to try the app with sample wrongly-billed results.');
  }

  let dbConnected = false;

  if (process.env.MONGODB_URI) {
    try {
      await mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 8000,
      });
      dbConnected = true;
      console.log('✅ MongoDB Connected');
    } catch (err) {
      console.error('❌ MongoDB Connection Error:', err.message);
      if (demoMode || process.env.USE_MEMORY_STORE === 'true') {
        console.warn('⚠️  Continuing with in-memory store (demo / offline mode).');
      } else {
        console.warn('⚠️  Starting without MongoDB — set DEMO_MODE=true or whitelist your IP in Atlas.');
        console.warn('   App will use in-memory storage until Mongo reconnects.');
      }
    }
  }

  app.listen(PORT, () => {
    console.log(`🚀 MediShield Backend live on port ${PORT}`);
    console.log(`   Mode: ${demoMode ? 'DEMO' : 'LIVE'} · DB: ${dbConnected ? 'MongoDB' : 'memory'}`);
  });
}

startServer();
