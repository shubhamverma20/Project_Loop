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

export async function deleteReport(workspaceId: string, reportId: string) {
  try {
    await prisma.report.deleteMany({
      where: { id: reportId, workspaceId }
    })
    return { error: null, success: true }
  } catch (error) {
    console.error("Failed to delete report:", error)
    return { error: "Failed to delete report", success: false }
  }
}

export async function clearAllReports(workspaceId: string) {
  try {
    await prisma.report.deleteMany({
      where: { workspaceId }
    })
    return { error: null, success: true }
  } catch (error) {
    console.error("Failed to clear reports:", error)
    return { error: "Failed to clear reports history", success: false }
  }
}
