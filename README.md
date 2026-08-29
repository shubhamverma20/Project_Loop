# Project LOOP - Customer Intelligence Platform

Zidio Project LOOP is an AI-powered SaaS customer feedback intelligence platform designed to ingest, classify, and analyze customer feedback using Large Language Models and vector semantics.

## Technology Stack

- **Framework**: Next.js 14 App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS & Lucide Icons
- **Database**: PostgreSQL (hosted on Neon) with `pgvector` extension
- **ORM**: Prisma
- **Authentication**: NextAuth.js (Auth.js) Credentials Provider
- **AI Classification/Narrative**: Anthropic Claude 3 Haiku API
- **Embeddings**: Local `@xenova/transformers` (MiniLM-L6-v2)
- **Charts**: Recharts
- **Validation**: Zod
- **Deployment**: Vercel

## Architecture & Folder Structure

```
Project_Loop/
├── prisma/                 # Database schema and seed data
├── src/
│   ├── app/                # Next.js App Router
│   │   ├── (dashboard)/    # Authenticated Routes (Dashboard, Feedback, Insights)
│   │   ├── actions/        # Next.js Server Actions (Analytics, Insights, Feedback)
│   │   ├── api/            # Route Handlers (Auth, Feedback Ingestion webhook)
│   ├── components/         # Reusable UI components and charts
│   ├── lib/                # Core utilities (Auth session, Prisma client, Embeddings init)
│   └── types/              # Global TypeScript interfaces and Zod Schemas
├── __tests__/              # Vitest suite
└── README.md
```

## Features

- **Multi-tenant Architecture**: Isolated workspaces using Prisma middleware & row-level security concepts.
- **Authentication**: Secure NextAuth/Auth.js with bcrypt hashed passwords.
- **Semantic Search**: Powered by `pgvector` and `@xenova/transformers`. Search feedback by natural language meaning rather than exact keywords.
- **AI Classification**: Auto-tagging, categorization, and sentiment analysis via Anthropic Claude 3 Haiku.
- **Analytics Dashboard**: Highly performant server-side aggregations for Category, Channel, Sentiment, and Volume over custom Date Ranges.
- **Voice of Customer (VoC) Reports**: AI-generated synthesized reports (Summary, Pain Points, Opportunities, Risks) from raw feedback. Caches natively to PostgreSQL to prevent duplicate AI costs. Exports cleanly to PDF.

## Setup & Initialization

### Environment Variables

To run the project, ensure you have the following `.env` variables:

```env
# Database (Neon PostgreSQL with pgvector)
DATABASE_URL="postgres://user:password@hostname/dbname?pgbouncer=true&connect_timeout=15"

# NextAuth
NEXTAUTH_SECRET="your-32-character-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# AI Configuration
ANTHROPIC_API_KEY="sk-ant-api03-..."
```

### Local Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Sync Database & Extensions:
   Make sure your Postgres instance supports `pgvector` (e.g., Neon).
   ```bash
   npx prisma db push
   ```

3. Seed Data:
   Generates a mock workspace, Admin/Viewer users, and 150 realistic feedback entries.
   ```bash
   npx prisma db seed
   ```

4. Run Development Server:
   ```bash
   npm run dev
   ```

## Testing

Run the automated test suite (powered by Vitest):

```bash
npm run test
```

## Production Deployment (Vercel)

The application is heavily optimized for Vercel deployment. 

1. Push your code to a GitHub repository.
2. In the Vercel dashboard, click **Add New... > Project**.
3. Import your GitHub repository.
4. Set the **Framework Preset** to Next.js.
5. Under **Environment Variables**, add the three required variables: `DATABASE_URL`, `NEXTAUTH_SECRET`, and `ANTHROPIC_API_KEY`.
6. (Optional) Set the NextAuth URL to your production domain: `NEXTAUTH_URL=https://your-domain.vercel.app`.
7. Override the **Build Command** if you want to automatically push DB schema: `npx prisma generate && npx prisma db push && next build`
8. Click **Deploy**.

*Note: Since the embeddings model is loaded locally via `@xenova/transformers`, Vercel's Node environment handles the caching automatically during the serverless function cold start.*

## Security Hardening
- **Prisma Tenant Isolation**: All Prisma `findMany` and `count` operations explicitly require a `workspaceId` matching the authenticated user's session.
- **Action Protection**: All `use server` files explicitly check `verifySession()` before processing payloads.
- **Error Handling**: Graceful fallback UI provided via `app/error.tsx` and `app/not-found.tsx`.
