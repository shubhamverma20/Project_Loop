import { z } from "zod"

export const CategoryAnalysisSchema = z.object({
  category: z.string(),
  count: z.number(),
  percentage: z.number()
})

export const PriorityImpactSchema = z.object({
  issue: z.string(),
  impact: z.enum(["HIGH", "MEDIUM", "LOW"]),
  recommendation: z.string()
})

export const InsightReportSchema = z.object({
  summary: z.string(),
  keyThemes: z.array(z.string()),
  painPoints: z.array(z.string()),
  positiveTrends: z.array(z.string()).optional().default([]),
  negativeTrends: z.array(z.string()).optional().default([]),
  featureRequests: z.array(z.string()).optional().default([]),
  risks: z.array(z.string()).optional().default([]),
  recommendedActions: z.array(z.string()),
  categoryAnalysis: z.array(CategoryAnalysisSchema).optional().default([]),
  priorityImpact: z.array(PriorityImpactSchema).optional().default([]),
  metrics: z.object({
    totalFeedback: z.number(),
    positive: z.number(),
    neutral: z.number(),
    negative: z.number(),
  }).optional()
})

export type InsightReport = z.infer<typeof InsightReportSchema>
