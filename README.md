# 🚀 Project LOOP - Customer Feedback & AI Analytics Platform

[![E2E Tests](https://img.shields.io/badge/Playwright-E2E%20Passing-brightgreen?logo=playwright)](https://playwright.dev)
[![Backend Tests](https://img.shields.io/badge/Vitest-Backend%20Passing-blue?logo=vitest)](https://vitest.dev)
[![Next.js](https://img.shields.io/badge/Next.js-14%20App%20Router-black?logo=next.js)](https://nextjs.org)
[![Express](https://img.shields.io/badge/Express-Backend-lightgrey?logo=express)](https://expressjs.com)
[![PostgreSQL](https://img.shields.io/badge/Neon-PostgreSQL%20%2B%20pgvector-blue?logo=postgresql)](https://neon.tech)
[![Gemini AI](https://img.shields.io/badge/Google%20Gemini-AI%20Engine-orange?logo=google)](https://ai.google.dev)

---

## 📌 Overview

**Project LOOP** is a modern, enterprise-ready Customer Feedback Ingestion & AI Analytics Platform built on a decoupled full-stack architecture:

* **Frontend**: Next.js 14 App Router, Tailwind CSS, Recharts, Lucide Icons, and PapaParse.
* **Backend**: Express.js REST API with Server-Sent Events (SSE) for real-time live streaming feedback.
* **Database**: Neon Serverless PostgreSQL with Prisma ORM and `pgvector` extension.
* **AI Engine**: **Google Gemini AI** (`@google/genai`) for automated sentiment scoring, tag extraction, auto-categorization, and executive report generation.
* **Security & Auth**: Dual authentication via HTTP-Only JWT cookies or `Bearer` tokens, Google OAuth 2.0, and Brevo Email OTP verification.

### 🌐 Live Production Deployments
* **Live Frontend App**: [project-loop-fu2f-git-main-shubhamverma20s-projects.vercel.app](https://project-loop-fu2f-git-main-shubhamverma20s-projects.vercel.app)
* **Live Backend API**: [https://project-loop-1-5zzp.onrender.com](https://project-loop-1-5zzp.onrender.com)
* **API Health Check**: `https://project-loop-1-5zzp.onrender.com/health`
* **Testing**: Comprehensive E2E testing suite powered by **Playwright** and backend unit/integration tests with **Vitest**.

---

## ✨ Features

- 🔐 **Authentication & Sessions**: Email/Password Registration & Login, Google One-Tap Sign-In, Password Reset via Brevo 6-digit OTP, Session management with `GET /api/auth/me`.
- 📥 **Smart CSV Importer**: Automated column header analysis and synonym mapping supporting Customer Feedback CSVs (content, review, comment, rating) and E-Commerce Product Catalog CSVs.
- ⚡ **Real-Time Live Streaming (SSE)**: Server-Sent Events endpoint pushing real-time customer feedback updates directly to the UI.
- 🤖 **AI Executive Insights**: Powered by Google Gemini AI (`@google/genai`) for automatic sentiment classification, pain point extraction, and downloadable executive summary reports.
- 📊 **Interactive Analytics Dashboard**: Filter feedback by date range (`7d`, `30d`, `90d`, `custom`), channel, sentiment distribution, and category trends.
- 🛡️ **Role-Based Access Control (RBAC)**: Admin, Analyst, and Viewer permissions for team management and workspace settings.

---

## 📁 Repository Structure

```
Project_Loop/
├── backend/                  # Express REST API & SSE Server
│   ├── prisma/               # Schema & DB Migrations (Prisma)
│   │   ├── schema.prisma
│   │   └── seed.ts
│   ├── src/
│   │   ├── middleware/       # Auth JWT, CORS, Error Handling, Rate Limiting
│   │   ├── routes/           # Auth, Feedback, CSV, Analytics, Insights, Reports, Settings
│   │   ├── services/         # Gemini AI, CSV Processing, Brevo OTP, Ingestion
│   │   └── server.ts         # Server entry point
│   ├── tests/                # Vitest test suite
│   └── package.json
│
├── frontend/                 # Next.js 14 App Router
│   ├── src/
│   │   ├── app/              # (auth) & (dashboard) routes
│   │   ├── components/       # Analytics charts, CSV Uploader, Insights components
│   │   ├── hooks/            # useLiveFeedback SSE hook
│   │   └── lib/              # API Client (credentials: "include")
│   └── package.json
│
├── tests/
│   └── e2e/                  # Playwright End-to-End test suite
│       └── smoke.spec.ts
│
├── playwright.config.ts      # Playwright test & auto-webServer config
├── package.json              # Monorepo root script runner
└── README.md
```

---

## ⚙️ Environment Configuration

### Backend Environment Variables (`backend/.env`)

```env
# Database & Server
PORT=5000
DATABASE_URL="postgresql://<user>:<password>@<host>/<database>?sslmode=require"
FRONTEND_URL="http://localhost:3000"

# Authentication
JWT_SECRET="your-secure-jwt-secret"
AUTH_SECRET="your-secure-auth-secret"

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# AI & Email Services
GEMINI_API_KEY="your-gemini-api-key"
BREVO_API_KEY="your-brevo-api-key"
BREVO_SENDER_EMAIL="your-email@domain.com"
BREVO_SENDER_NAME="Project LOOP"
```

### Frontend Environment Variables (`frontend/.env.local`)

```env
NEXT_PUBLIC_API_URL="http://localhost:5000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_GOOGLE_CLIENT_ID="your-google-client-id"
```

---

## 🛠️ Quick Start & Local Setup

### 1. Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- PostgreSQL (or Neon.tech instance)

### 2. Install Dependencies
```bash
npm install
npm run install --prefix backend
npm run install --prefix frontend
```

### 3. Setup Database & Prisma
```bash
cd backend
npx prisma db push
npx prisma db seed
cd ..
```

### 4. Run Development Servers
Run both frontend and backend concurrently from the root directory:
```bash
npm run dev
```
* **Frontend UI**: `http://localhost:3000`
* **Express Backend**: `http://localhost:5000`

---

## 🧪 Running Automated Tests

### 🎭 Playwright E2E Tests
Playwright automatically handles spinning up the local dev server using the configured `webServer` option in `playwright.config.ts`.

Run headless E2E test suite:
```bash
npx playwright test
```

Run in UI / Headed mode:
```bash
npx playwright test --ui
# or
npx playwright test --headed
```

### ⚡ Backend Unit & Integration Tests (Vitest)
```bash
npm test
# or
npm test --prefix backend
```

---

## 🚢 Deployment Guide

### Backend (Render / Railway)
1. Set Root Directory: `backend`
2. Build Command: `npm install && npx prisma generate && npm run build`
3. Start Command: `npm start`
4. Health Check URL: `GET /health`

### Frontend (Vercel)
1. Set Root Directory: `frontend`
2. Framework Preset: `Next.js`
3. Set `NEXT_PUBLIC_API_URL` to your production backend URL.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for details.
