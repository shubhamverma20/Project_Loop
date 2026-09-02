"use client"

import { useEffect, useState, Suspense } from "react"
import { api } from "@/lib/api-client"
import { InsightReport } from "@/types/insights"
import { ReportView } from "@/components/insights/ReportView"
import { AnalyticsSkeleton } from "@/components/analytics/AnalyticsSkeleton"
import { GenerateForm } from "@/components/insights/GenerateForm"
import { format } from "date-fns"
import { Bot, Sparkles } from "lucide-react"

interface ReportRecord {
  id: string
  title: string
  createdAt: string
  contentJson: unknown
}

function InsightsView() {
  const [reports, setReports] = useState<ReportRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchReports = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get("/api/reports")
      if (res.error) {
        setError(res.error)
      } else if (res.data?.data) {
        setReports(res.data.data)
      }
    } catch {
      setError("Failed to fetch reports")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReports()
  }, [])

  if (loading) return <AnalyticsSkeleton />

  if (error) {
    return <div className="p-4 bg-red-50 text-red-600 rounded-lg border border-red-200">{error}</div>
  }

  if (!reports || reports.length === 0) {
    return (
      <div className="text-center py-24 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
        <Bot className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-zinc-900 dark:text-white">No Insights Generated</h3>
        <p className="text-zinc-500 mt-2 max-w-sm mx-auto">
          Generate your first AI-powered report to automatically surface themes and customer pain points.
        </p>
      </div>
    )
  }

  const latestReport = reports[0]
  const reportData = latestReport.contentJson as unknown as InsightReport

  return (
    <div className="space-y-12">
      <ReportView 
        report={reportData} 
        title={latestReport.title}
        dateStr={`Generated ${format(new Date(latestReport.createdAt), "MMMM d, yyyy h:mm a")}`} 
      />

      {reports.length > 1 && (
        <div>
          <h3 className="font-semibold text-lg mb-4">Past Reports</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reports.slice(1).map((r) => (
              <div key={r.id} className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                <h4 className="font-medium">{r.title}</h4>
                <p className="text-sm text-zinc-500">{format(new Date(r.createdAt), "MMM d, yyyy")}</p>
                <p className="text-sm text-zinc-700 dark:text-zinc-300 mt-2 line-clamp-2">
                  {(r.contentJson as unknown as InsightReport).summary}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function InsightsPage() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
            AI Insights <Sparkles className="w-5 h-5 text-blue-500" />
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Gemini AI analysis of customer feedback. Generates themes, risks, and recommendations.
          </p>
        </div>

        <GenerateForm onGenerated={() => window.location.reload()} />
      </div>

      <Suspense fallback={<AnalyticsSkeleton />}>
        <InsightsView />
      </Suspense>
    </div>
  )
}
