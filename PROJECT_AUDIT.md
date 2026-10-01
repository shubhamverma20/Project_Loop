# Project LOOP - Comprehensive Audit Report

**Date:** September 17, 2026  
**Status:** Audit Complete — Awaiting Approval Before Code Modifications  
**AI Platform:** Google Gemini AI (`@google/genai`) — Approved by Mentor  

---

## Executive Summary
An in-depth audit of the **Project LOOP** codebase was conducted across both backend (Express/Prisma/PostgreSQL) and frontend (Next.js 14 App Router) systems. The application is well-structured, functional, and mostly feature-complete with robust authentication, real-time SSE feedback streaming, CSV processing, and Gemini AI-driven text classification and report generation.

However, several critical gaps, security issues, schema mismatches, and mock implementations (specifically in vector embeddings and environment configuration) must be resolved to achieve full production readiness.

---

## 1. Completed Features

- [x] **User Authentication & Session Management**:
  - Email/Password Registration and Login using bcrypt password hashing and JWT sessions.
  - HTTP-Only secure cookies with fallback support for Authorization header tokens (`Bearer ...`).
  - Google OAuth integration (`/api/auth/google`) for one-tap sign-in and automated workspace provisioning.
  - Current session verification endpoint (`GET /api/auth/me`).

- [x] **Password Reset & OTP Verification**:
  - Secure 6-digit OTP generation with 10-minute expiry and 1-minute request cooldown.
  - Integration with **Brevo (Sendinblue) Transactional Email API** for delivering password reset emails.
  - Attempt counter (max 5 attempts) to prevent brute-forcing.

- [x] **Feedback Ingestion System**:
  - RESTful ingestion endpoint (`POST /api/feedback`).
  - Dual Authentication support: Workspace API Keys (`x-api-key` / `Bearer loop_sk_...`) or User JWT session.
  - Input sanitization (stripping HTML tags via `sanitize-html`) and content normalization.
  - Deduplication mechanism to prevent redundant database inserts.
  - Rate limiting per IP and per Workspace ID.

- [x] **Real-Time Live Streaming (SSE)**:
  - Server-Sent Events endpoint (`GET /api/feedback/stream`) pushing real-time feedback items to connected clients.
  - Frontend custom hook (`useLiveFeedback`) with real-time UI notification banner.

- [x] **Intelligent CSV Import**:
  - Automatic column header detection with support for custom synonym mapping (Feedbacks vs E-Commerce products).
  - Batch ingestion with import status summary (inserted, skipped duplicates, failed).

- [x] **Analytics & Interactive Dashboards**:
  - Date range filtering (`7d`, `30d`, `90d`, `custom`).
  - Aggregated metrics: total feedback, sentiment distribution (POS, NEU, NEG), weekly trend, volume over time, category/channel counts, and top themes.

- [x] **AI Executive Insights & Reports**:
  - Automated report generation powered by Gemini AI (`@google/genai`).
  - Structured output parsing: Executive Summary, Key Trends, Top Customer Pain Points, Recommended Actions, Sentiment Drivers.
  - Report storage, caching, listing, and deletion.

- [x] **Settings & Team Workspace Management**:
  - Profile updates and password changes.
  - Workspace API key generation/rotation for Admin roles.
  - Workspace renaming.
  - Team invitations via Brevo email notifications with Role-Based Access Control (`ADMIN`, `ANALYST`, `VIEWER`).

---

## 2. Gemini AI Integration Status

> [!IMPORTANT]
> Google Gemini AI (`@google/genai`) is approved for AI tasks. Below is the current implementation status:

- **Installed SDK:** `@google/genai` (v2.20.0).
- **Text Classification (`backend/src/lib/ai.ts`):**
  - **Status:** **Implemented & Working.**
  - **Details:** Uses structured outputs (`responseMimeType: "application/json"`, `responseSchema`) to extract sentiment score, sentiment category, feature area, and tags.
- **Executive Report Generation (`backend/src/services/insights.ts`):**
  - **Status:** **Implemented & Working.**
  - **Details:** Passes feedback samples to Gemini AI and enforces a JSON schema for executive reports.
- **Vector Embeddings (`backend/src/lib/embeddings.ts`):**
  - **Status:** **MOCK IMPLEMENTATION (DEFECT).**
  - **Details:** Currently uses a pseudo-hash fallback generating a dummy 384-element array instead of calling Gemini AI's `text-embedding-004` (or `embedding-001`) model.
- **Semantic Vector Search / RAG:**
  - **Status:** **MISSING.**
  - **Details:** No vector similarity query endpoint exists to query feedback using vector embeddings.

---

## 3. Database & Schema Issues

- **Vector Dimension Mismatch:**
  - `backend/prisma/schema.prisma` defines vector embedding as `Unsupported("vector(384)")`.
  - Gemini's `text-embedding-004` model returns **768-dimensional** vectors. The database column size must be updated to `vector(768)` via Prisma migration.
- **Missing Vector Index:**
  - No `ivfflat` or `hnsw` index is defined on the `Embedding` table for fast pgvector similarity search.
- **Unused NextAuth Schema Models:**
  - `schema.prisma` contains `Account`, `Session`, and `VerificationToken` models from NextAuth, while the system uses a custom JWT architecture. (Can be kept or retained to avoid breaking working code).

---

## 4. Bugs & Technical Defects

1. **Environment Variable Mismatch (`JWT_SECRET` vs `AUTH_SECRET`):**
   - Code in `backend/src/services/auth.ts` and `backend/src/middleware/auth.ts` inspects `process.env.AUTH_SECRET`.
   - `README.md` and `.env.example` specify `JWT_SECRET`. If only `JWT_SECRET` is set in production, JWT fallback defaults to `"default_dev_secret_key_32_chars_long"`.
2. **Gemini Model Naming Compatibility:**
   - Code references model `"gemini-2.5-flash"`. If the API endpoint expects standard model identifiers like `"gemini-1.5-flash"` or `"gemini-2.0-flash"`, API calls could fail in specific regions or API versions.
3. **Hardcoded Production Fallback URL in Frontend:**
   - `frontend/src/lib/api-client.ts` contains hardcoded fallback `"https://project-loop-llid.onrender.com"`. It should dynamically fallback to relative `/api` or explicit `NEXT_PUBLIC_API_URL`.
4. **Duplicate Dashboard Routes:**
   - `frontend/src/app/(dashboard)/sources` and `frontend/src/app/(dashboard)/data-sources` exist simultaneously.

---

## 5. Security Issues

> [!WARNING]
> The following security considerations require attention:

1. **Insecure Default JWT Fallback:**
   - Hardcoded secret key string fallback in auth middleware and auth service when environment variables are missing.
2. **SSE Stream Auth via Query Parameter:**
   - `GET /api/feedback/stream` allows passing `token` in query parameters (`?token=...`), which can leak session tokens in web server logs, proxy logs, and browser histories.
3. **Role-Based Access Control (RBAC) Gaps:**
   - While settings endpoints enforce `requireRole(["ADMIN"])`, feedback status updates (`POST /api/feedback/status`) and reclassification (`POST /api/feedback/reclassify`) do not enforce role restrictions (allow `VIEWER` role).
4. **Plaintext Password Transmission in Invites:**
   - Generated temporary passwords for invited members are logged and sent directly.

---

## 6. Partial & Missing Features

### Partial Features:
- **Embedding Generation:** Code exists in pipeline, but uses dummy vector logic.
- **Channel Sync:** `simulateChannelSync` in `ingestion.ts` creates mock items for Zendesk, Intercom, and Play Store.
- **Feedback Explorer:** Keyword search and filtering by category/sentiment exist; semantic vector similarity search is missing.

### Missing Features:
- **Real Gemini Vector Embeddings (`text-embedding-004`):** Production embedding pipeline using Gemini API.
- **Semantic Vector Similarity Endpoint:** Search feedback using natural language query embeddings (`pgvector` `<->` cosine distance).
- **Report PDF / CSV Export:** Client-side download or backend generation of downloadable PDF/CSV reports.

---

## 7. Recommended Action Plan (Post-Approval)

1. **Fix Env Var Consistency:** Synchronize `JWT_SECRET` and `AUTH_SECRET` in `auth.ts`, `middleware/auth.ts`, and `.env` files.
2. **Upgrade Vector Embeddings to Real Gemini AI (`text-embedding-004`):**
   - Update `backend/src/lib/embeddings.ts` to call Gemini `@google/genai` embeddings API.
   - Update `schema.prisma` vector dimension to `vector(768)` and run Prisma migration.
3. **Add Semantic Vector Search Endpoint:** Implement vector search endpoint in backend and connect to Explorer UI.
4. **Harden Security & RBAC:** Enforce strict role permissions on feedback status/reclassify endpoints and ensure secure secret enforcement.
5. **Clean Up Frontend Route Duplication & Fallbacks:** Streamline API client configuration and dashboard routing.

---

*Please review this audit report. Once approved, implementation of fixes will commence without rewriting existing code.*
