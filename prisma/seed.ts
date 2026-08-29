import { PrismaClient, Role, Status, Sentiment } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import bcrypt from 'bcryptjs'

const pool = new Pool({ connectionString: process.env.DATABASE_URL as string })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Starting seed...')
  
  // Clean up existing data
  await prisma.workspace.deleteMany()
  console.log('Deleted existing workspaces.')

  // 1. Create Workspace
  const workspace = await prisma.workspace.create({
    data: {
      name: 'Acme Corp',
    },
  })
  console.log(`Created workspace: ${workspace.name}`)

  // 2. Create Users (ADMIN, ANALYST, VIEWER)
  const passwordHash = await bcrypt.hash('password123', 10)

  const admin = await prisma.user.create({
    data: {
      name: 'Alice Admin',
      email: 'admin@acme.com',
      passwordHash,
      role: Role.ADMIN,
      workspaceId: workspace.id,
    },
  })

  const analyst = await prisma.user.create({
    data: {
      name: 'Bob Analyst',
      email: 'analyst@acme.com',
      passwordHash,
      role: Role.ANALYST,
      workspaceId: workspace.id,
    },
  })

  const viewer = await prisma.user.create({
    data: {
      name: 'Charlie Viewer',
      email: 'viewer@acme.com',
      passwordHash,
      role: Role.VIEWER,
      workspaceId: workspace.id,
    },
  })

  console.log('Created 3 users: Admin, Analyst, Viewer')

  // 3. Create 120 realistic feedback items
  const channels = ['Email', 'In-App', 'Twitter', 'Support Ticket', 'Survey']
  const feedbackData = []

  const templates = [
    { text: "Great product, but the UI is a bit clunky.", sentiment: Sentiment.NEU, score: 0.2, category: "UI/UX" },
    { text: "I absolutely love the new feature! It saved me so much time.", sentiment: Sentiment.POS, score: 0.9, category: "Feature Request" },
    { text: "I can't seem to figure out how to export my data.", sentiment: Sentiment.NEG, score: -0.5, category: "Bug" },
    { text: "The app crashed when I tried to upload a file.", sentiment: Sentiment.NEG, score: -0.8, category: "Bug" },
    { text: "It's okay, does the job. Could be faster.", sentiment: Sentiment.NEU, score: 0.1, category: "Performance" },
    { text: "Customer support was amazing and solved my issue in 5 minutes.", sentiment: Sentiment.POS, score: 0.8, category: "Customer Support" },
    { text: "Pricing is way too high for what you get.", sentiment: Sentiment.NEG, score: -0.7, category: "Pricing" },
    { text: "Please add a dark mode!", sentiment: Sentiment.NEU, score: 0.0, category: "Feature Request" },
    { text: "Integration with Slack is flawless.", sentiment: Sentiment.POS, score: 0.7, category: "Integration" },
    { text: "The onboarding process was confusing.", sentiment: Sentiment.NEG, score: -0.4, category: "UI/UX" },
    { text: "I wish there was an Android app.", sentiment: Sentiment.NEU, score: 0.0, category: "Feature Request" },
    { text: "Security features like MFA give me peace of mind.", sentiment: Sentiment.POS, score: 0.85, category: "Security" },
    { text: "The new dashboard is very slow to load.", sentiment: Sentiment.NEG, score: -0.6, category: "Performance" },
    { text: "Can we get role-based access control?", sentiment: Sentiment.NEU, score: 0.1, category: "Security" },
    { text: "Billing page keeps throwing a 500 error.", sentiment: Sentiment.NEG, score: -0.9, category: "Bug" },
  ]

  for (let i = 0; i < 150; i++) {
    const template = templates[i % templates.length]
    const channel = channels[i % channels.length]
    
    // Add some random variation to dates (over last 90 days)
    const date = new Date()
    date.setDate(date.getDate() - Math.floor(Math.random() * 90))

    feedbackData.push({
      content: `${template.text} (Feedback #${i + 1})`,
      channel: channel,
      sentiment: template.sentiment,
      sentimentScore: template.score,
      category: template.category,
      status: i % 5 === 0 ? Status.REVIEWED : (i % 10 === 0 ? Status.ACTIONED : Status.NEW),
      workspaceId: workspace.id,
      createdAt: date
    })
  }

  await prisma.feedback.createMany({
    data: feedbackData
  })

  console.log(`Created 120 feedback items for workspace ${workspace.name}`)
  console.log('Seed completed successfully.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
