# Week 2 Walkthrough: Semantic Search & AI Classification

Week 2 has been fully implemented! Here is a summary of the capabilities added to Project LOOP.

## 1. Local Vector Embeddings (No API Cost)
- **`pgvector` Integration**: Updated `prisma/schema.prisma` to add the vector extension and map the `Embedding` model directly to `Unsupported("vector(384)")`.
- **Local Generation**: Configured `@xenova/transformers` (running the `all-MiniLM-L6-v2` model) in Node.js to generate semantic vectors without external API calls, ensuring high privacy and zero recurring embedding costs.

## 2. Advanced Feedback Ingestion & Classification
- **AI Auto-Classification**: Configured Anthropic Claude 3 Haiku to rigidly categorize incoming feedback into `Bug`, `Feature Request`, `Complaint`, `Praise`, `Question`, or `Other`.
- **Resilience Strategy**: Implemented exponential backoff and a 10-second `Promise.race` timeout on the AI. If the AI is unresponsive, the ingestion pipeline safely falls back to a default categorization instead of dropping the data.
- **Normalization Pipeline**: All feedback is now stripped of extra whitespace and special characters to produce a clean vector string (`normalizedContent`).

## 3. Feedback Explorer UI (Tenant-Isolated)
- **Semantic Search**: Added a `searchFeedback` Server Action that queries Postgres using raw SQL cosine similarity (`<=>`) against `pgvector`.
- **Advanced Filters**: A brand new interactive Client Component (`AdvancedFilters`) that injects state cleanly via URL searchParams to dynamically filter by:
  - Natural language semantic queries ("complaints about checkout")
  - Category (Bug, Praise, etc.)
  - Sentiment
  - Channel (Twitter, Typeform, etc.)
- **Strict Isolation**: Both the raw vector query and standard Prisma filters enforce absolute `workspaceId` tenant isolation.

## 4. Testing & Stability
- Added a robust `vitest` configuration testing the core tenant isolation logic and ingestion validation.
- All 4/4 automated tests passed, asserting that invalid AI/ingestion flows gracefully fail and cross-tenant leakage is impossible.
- Re-generated Prisma typings to strictly type the new schema additions (`category` and `normalizedContent`).

> [!TIP]
> **To Test Semantic Search**: Open the Feedback Explorer and type a conceptual query rather than exact keywords (e.g. "users struggling to use the product") to see the embedding engine fetch contextually relevant feedback!
