import { z } from "zod"

export const InsightReportSchema = z.object({
  summary: z.string(),
  keyThemes: z.array(z.string()),
  painPoints: z.array(z.string()),
  positiveTrends: z.array(z.string()),
  negativeTrends: z.array(z.string()),
  featureRequests: z.array(z.string()),
  risks: z.array(z.string()),
  recommendedActions: z.array(z.string()),
  metrics: z.object({
    totalFeedback: z.number(),
    positive: z.number(),
    neutral: z.number(),
    negative: z.number(),
  }).optional()
})

export type InsightReport = z.infer<typeof InsightReportSchema>
