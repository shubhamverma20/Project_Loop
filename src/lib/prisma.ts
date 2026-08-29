import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const globalForPrisma = global as unknown as { prisma: PrismaClient }

// We only want one pool instance, so we attach it to global too if in dev
const globalForPool = global as unknown as { pool: Pool }

const pool = globalForPool.pool || new Pool({ connectionString: process.env.DATABASE_URL as string })
if (process.env.NODE_ENV !== 'production') globalForPool.pool = pool

const adapter = new PrismaPg(pool)

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
