import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import 'dotenv/config'

// Use a separate pool for seeding to avoid connection limits
const pool = new Pool({ connectionString: process.env.DATABASE_URL as string })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  if (process.env.NODE_ENV === 'production') {
    console.warn('Seeding is disabled in production.')
    process.exit(0)
  }

  console.log('Seeding database with development data...')

  // Fetch all workspaces to associate the feedback with
  let workspaces = await prisma.workspace.findMany()
  
  if (workspaces.length === 0) {
    const workspace = await prisma.workspace.create({
      data: {
        name: 'Development Workspace',
      }
    })
    console.log(`Created workspace: ${workspace.id}`)
    workspaces = [workspace]
  }

  for (const workspace of workspaces) {
    console.log(`Seeding feedback for workspace: ${workspace.id} (${workspace.name})`)
    
    const sampleFeedbacks = [
      {
        content: 'The new dashboard is amazing, very fast and responsive!',
        channel: 'Web App',
        customerLabel: 'User123',
        category: 'UI/UX',
        sentiment: 'POS' as const,
        workspaceId: workspace.id,
        status: 'NEW' as const,
      },
      {
        content: 'I keep getting an error when trying to export reports to PDF.',
        channel: 'Email Support',
        customerLabel: 'EnterpriseClient',
        category: 'Bug',
        sentiment: 'NEG' as const,
        workspaceId: workspace.id,
        status: 'NEW' as const,
      },
      {
        content: 'Is there a way to integrate this with Slack?',
        channel: 'Community Forum',
        customerLabel: 'DevUser',
        category: 'Feature Request',
        sentiment: 'NEU' as const,
        workspaceId: workspace.id,
        status: 'NEW' as const,
      },
      {
        content: 'Love the AI insights feature! It saves me so much time.',
        channel: 'Twitter',
        customerLabel: 'SocialUser',
        category: 'Productivity',
        sentiment: 'POS' as const,
        workspaceId: workspace.id,
        status: 'REVIEWED' as const,
      },
      {
        content: 'Navigation is a bit confusing on mobile devices.',
        channel: 'App Store',
        customerLabel: 'MobileUser',
        category: 'UI/UX',
        sentiment: 'NEG' as const,
        workspaceId: workspace.id,
        status: 'ACTIONED' as const,
      }
    ]

    for (const fb of sampleFeedbacks) {
      await prisma.feedback.create({
        data: fb
      })
    }
  }

  console.log('Database seeded successfully.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
