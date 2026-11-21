# MediShield

AI medical bill auditor. Upload an **insurance policy PDF** and a **hospital bill PDF** — MediShield extracts CPT codes, matches them against policy rules (RAG), and highlights **wrongly billed** charges with a draft dispute letter.

## How it works

1. **Policy upload** → PDF text → chunks → Gemini embeddings → stored for retrieval  
2. **Bill upload** → Gemini extracts CPT/HCPCS line items  
3. **Audit** → vector search pulls relevant policy clauses → Gemini flags overcharges / duplicates / unbundling  
4. **Results** → potential savings, wrongly billed list, full CPT table, editable appeal letter  

## Quick start (demo — works offline)

Demo mode uses sample wrongly-billed results and an in-memory store (no Atlas / Gemini required).

```bash
# Backend
cd backend
npm install
# DEMO_MODE=true is already set in .env
npm start

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 → click **Run Demo Audit**.

## Live AI mode

1. Get a Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey) (keys usually start with `AIza…`).  
2. In MongoDB Atlas → Network Access → allow your current IP (or `0.0.0.0/0` for testing).  
3. Update `backend/.env`:

```env
DEMO_MODE=false
USE_MEMORY_STORE=false
FALLBACK_DEMO_ON_ERROR=false
GEMINI_API_KEY=AIza...your_key...
MONGODB_URI=mongodb+srv://...
JWT_SECRET=long_random_secret
```

4. Restart the backend, upload a real policy PDF, then a bill PDF.

## API

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Log in |
| POST | `/api/policies/upload` | Index policy PDF (`multipart`: `policy`) |
| POST | `/api/audit/analyze` | Audit bill PDF (`multipart`: `bill`) |
| POST | `/api/audit/demo` | Sample wrongly-billed audit |
| GET | `/api/audit/sessions` | List saved audits (auth) |
| PUT | `/api/audit/sessions/:id/letter` | Save dispute letter (auth) |
| GET | `/api/health` | Health check |

## Stack

- **Frontend:** React + Vite + Tailwind  
- **Backend:** Express + Multer + pdf-parse  
- **AI:** Google Gemini (`gemini-2.5-flash`, `gemini-embedding-2`)  
- **DB:** MongoDB Atlas (or in-memory in demo mode)  
