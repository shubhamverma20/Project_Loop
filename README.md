# Project LOOP - Production Architecture

## Overview
Project LOOP is a modern, enterprise-ready Customer Feedback & AI Analytics Platform split into a decoupled Production Architecture:
- **FRONTEND**: Next.js 14 (App Router) deployed on **Vercel**
- **BACKEND**: Node.js Express REST API & SSE Stream server deployed on **Render**
- **DATABASE**: **Neon Serverless PostgreSQL** with `pgvector` vector database extension
- **AI AGENT**: **Google Gemini AI** (`@google/genai`) for automated sentiment analysis, auto-categorization, vector embeddings, and executive report generation
- **EMAIL & OTP**: **Brevo (Sendinblue)** API for transactional email verification and password reset OTPs

---

## Workspace Structure
```
Project_Loop/
├── backend/                  # Express REST API Server
│   ├── prisma/               # Database schema & migrations (Prisma ONLY lives here)
│   │   ├── schema.prisma
│   │   └── seed.ts
│   ├── src/
│   │   ├── middleware/       # CORS, Auth JWT verification, Error handling
│   │   ├── routes/           # REST endpoints (/api/auth, /api/feedback, /api/analytics, /api/settings, /api/reports)
│   │   ├── services/         # Gemini AI, Brevo OTP, CSV Ingestion, Analytics, RBAC
│   │   └── server.ts         # Express server listener (reads process.env.PORT)
│   ├── tests/                # Vitest backend tests (GET /health)
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                 # Next.js 14 App Router UI
│   ├── src/
│   │   ├── app/              # Auth pages & (dashboard) layout/routes
│   │   ├── components/       # UI cards, analytics charts, settings forms, filters
│   │   ├── hooks/            # useLiveFeedback (SSE streaming hook)
│   │   └── lib/              # api-client (fetch client with credentials: "include")
│   ├── package.json
│   └── tsconfig.json
└── README.md
```

---

## Environment Variables Matrix

### Backend Environment Variables (`backend/.env`)
| Variable | Description | Example |
| :--- | :--- | :--- |
| `PORT` | Express listener port (set by Render automatically) | `5000` |
| `DATABASE_URL` | Neon PostgreSQL pooled connection string | `postgresql://user:pass@ep-xyz.neon.tech/neondb?sslmode=require` |
| `DIRECT_URL` | Neon PostgreSQL direct connection string for migrations | `postgresql://user:pass@ep-xyz.neon.tech/neondb?sslmode=require` |
| `JWT_SECRET` | Secret key for signing JWT cookies | `your_long_random_jwt_secret_key` |
| `FRONTEND_URL` | Vercel frontend URL(s) allowed by CORS | `https://project-loop-frontend.vercel.app,http://localhost:3000` |
| `GEMINI_API_KEY` | Google Gemini AI Key | `AIzaSy...` |
| `BREVO_API_KEY` | Brevo API key for emails/OTPs | `xkeysib-...` |
| `SENDER_EMAIL` | Sender email registered in Brevo | `noreply@yourdomain.com` |
| `SENDER_NAME` | Sender display name | `Project LOOP Security` |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | `xyz.apps.googleusercontent.com` |

### Frontend Environment Variables (`frontend/.env.local`)
| Variable | Description | Example |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | Express Backend URL | `https://project-loop-backend.onrender.com` |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Google OAuth Client ID | `xyz.apps.googleusercontent.com` |

---

## Deployment Step-by-Step Instructions

### 1. Database Setup (Neon PostgreSQL)
1. Create a PostgreSQL project on [Neon.tech](https://neon.tech).
2. Copy the **Pooled Connection String** (`DATABASE_URL`) and **Direct Connection String** (`DIRECT_URL`).
3. Run migrations and seed data from `backend/`:
   ```bash
   cd backend
   npx prisma db push
   npx prisma db seed
   ```

### 2. Backend Deployment (Render)
1. Create a new **Web Service** on [Render.com](https://render.com).
2. Connect your GitHub repository and set Root Directory to `backend`.
3. Set Build Command:
   ```bash
   npm install && npx prisma generate && npm run build
   ```
4. Set Start Command:
   ```bash
   npm start
   ```
5. Add all Backend environment variables in the Render Dashboard.
6. Verify deployment by visiting `https://your-backend.onrender.com/health`. Output must be:
   ```json
   { "status": "ok" }
   ```

### 3. Frontend Deployment (Vercel)
1. Create a new project on [Vercel](https://vercel.com).
2. Connect your GitHub repository and set Root Directory to `frontend`.
3. Framework Preset: **Next.js**.
4. Set Build Command: `npm run build`.
5. Add Environment Variables:
   - `NEXT_PUBLIC_API_URL` = `https://your-backend.onrender.com`
   - `NEXT_PUBLIC_GOOGLE_CLIENT_ID` = `your_google_client_id`
6. Deploy!

---

## Verification & Build Commands

### Backend Verification
```bash
cd backend
npm install
npx tsc --noEmit
npm test
npm run build
```

### Frontend Verification
```bash
cd frontend
npm install
npx tsc --noEmit
npm run build
```
