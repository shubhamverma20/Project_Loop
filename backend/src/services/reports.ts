import { prisma } from "../lib/prisma.js"
import { generateInsightsReport } from "./insights.js"
import { DateRange } from "./analytics.js"

export async function getReportsList(workspaceId: string) {
  try {
    const reports = await prisma.report.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        periodStart: true,
        periodEnd: true,
        createdAt: true,
        contentJson: true
      }
    })

    return { error: null, data: reports }
  } catch (error) {
    console.error("Failed to fetch reports list:", error)
    return { error: "Failed to load reports history", data: [] }
  }
}

export async function createNewReport(workspaceId: string, range: DateRange = "30d") {
  return generateInsightsReport(workspaceId, range)
}
