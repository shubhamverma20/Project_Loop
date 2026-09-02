import pkg from 'pg'
const { Pool } = pkg
import dotenv from 'dotenv'

dotenv.config()

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error("DATABASE_URL is not set")
  process.exit(1)
}

const pool = new Pool({ connectionString })

async function syncDb() {
  console.log("Synchronizing Neon PostgreSQL database schema...")
  const client = await pool.connect()
  try {
    // 1. Create Enums if not exists
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE "Role" AS ENUM ('ADMIN', 'ANALYST', 'VIEWER');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
        CREATE TYPE "Sentiment" AS ENUM ('POS', 'NEU', 'NEG');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
        CREATE TYPE "Status" AS ENUM ('NEW', 'REVIEWED', 'ACTIONED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
        CREATE TYPE "OtpPurpose" AS ENUM ('SIGNUP_VERIFICATION', 'PASSWORD_RESET');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `)

    // 2. Workspace table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "Workspace" (
        "id" TEXT PRIMARY KEY,
        "name" TEXT NOT NULL,
        "apiKey" TEXT UNIQUE,
        "apiKeyHash" TEXT UNIQUE,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      ALTER TABLE "Workspace" ADD COLUMN IF NOT EXISTS "apiKeyHash" TEXT UNIQUE;
    `)

    // 3. User table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "User" (
        "id" TEXT PRIMARY KEY,
        "name" TEXT,
        "email" TEXT UNIQUE,
        "emailVerified" TIMESTAMP(3),
        "image" TEXT,
        "passwordHash" TEXT,
        "role" "Role" NOT NULL DEFAULT 'VIEWER',
        "workspaceId" TEXT REFERENCES "Workspace"("id") ON DELETE CASCADE
      );
      ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT;
      ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "role" "Role" NOT NULL DEFAULT 'VIEWER';
      ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
    `)

    // 4. OtpVerification table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "OtpVerification" (
        "id" TEXT PRIMARY KEY,
        "email" TEXT NOT NULL,
        "otpHash" TEXT NOT NULL,
        "purpose" "OtpPurpose" NOT NULL,
        "expiresAt" TIMESTAMP(3) NOT NULL,
        "attempts" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `)

    // 5. Feedback table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "Feedback" (
        "id" TEXT PRIMARY KEY,
        "content" TEXT NOT NULL,
        "normalizedContent" TEXT,
        "channel" TEXT NOT NULL,
        "sourceRef" TEXT,
        "customerLabel" TEXT,
        "category" TEXT,
        "sentiment" "Sentiment",
        "sentimentScore" DOUBLE PRECISION,
        "featureArea" TEXT,
        "status" "Status" NOT NULL DEFAULT 'NEW',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "workspaceId" TEXT NOT NULL REFERENCES "Workspace"("id") ON DELETE CASCADE
      );
      ALTER TABLE "Feedback" ADD COLUMN IF NOT EXISTS "normalizedContent" TEXT;
    `)

    // 6. Theme & FeedbackTheme tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS "Theme" (
        "id" TEXT PRIMARY KEY,
        "name" TEXT NOT NULL,
        "description" TEXT,
        "color" TEXT,
        "workspaceId" TEXT NOT NULL REFERENCES "Workspace"("id") ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS "FeedbackTheme" (
        "feedbackId" TEXT NOT NULL REFERENCES "Feedback"("id") ON DELETE CASCADE,
        "themeId" TEXT NOT NULL REFERENCES "Theme"("id") ON DELETE CASCADE,
        "confidence" DOUBLE PRECISION,
        PRIMARY KEY ("feedbackId", "themeId")
      );
    `)

    // 7. Report table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "Report" (
        "id" TEXT PRIMARY KEY,
        "title" TEXT NOT NULL,
        "periodStart" TIMESTAMP(3) NOT NULL,
        "periodEnd" TIMESTAMP(3) NOT NULL,
        "contentJson" JSONB NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "workspaceId" TEXT NOT NULL REFERENCES "Workspace"("id") ON DELETE CASCADE,
        "generatedById" TEXT
      );
    `)

    // 8. Account & Session tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS "Account" (
        "id" TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
        "type" TEXT NOT NULL,
        "provider" TEXT NOT NULL,
        "providerAccountId" TEXT NOT NULL,
        "refresh_token" TEXT,
        "access_token" TEXT,
        "expires_at" INTEGER,
        "token_type" TEXT,
        "scope" TEXT,
        "id_token" TEXT,
        "session_state" TEXT,
        UNIQUE("provider", "providerAccountId")
      );

      CREATE TABLE IF NOT EXISTS "Session" (
        "id" TEXT PRIMARY KEY,
        "sessionToken" TEXT UNIQUE NOT NULL,
        "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
        "expires" TIMESTAMP(3) NOT NULL
      );
    `)

    console.log("✅ Neon PostgreSQL database schema successfully synchronized!")
  } catch (err) {
    console.error("❌ Database sync error:", err)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

syncDb()
