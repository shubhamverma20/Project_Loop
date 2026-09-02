"use client"

import { useEffect, useState } from "react"
import { api } from "@/lib/api-client"
import { InsightReport } from "@/types/insights"
import { ReportView } from "@/components/insights/ReportView"
import { AnalyticsSkeleton } from "@/components/analytics/AnalyticsSkeleton"
import { GenerateForm } from "@/components/insights/GenerateForm"
import { format } from "date-fns"
import { Bot, Sparkles, Trash2, RotateCcw } from "lucide-react"

interface ReportRecord {
  id: string
  title: string
  createdAt: string
  contentJson: unknown
}

export default function InsightsPage() {
  const [reports, setReports] = useState<ReportRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [clearingAll, setClearingAll] = useState(false)

  const fetchReports = async (showSkeleton = true) => {
    if (showSkeleton) setLoading(true)
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
      if (showSkeleton) setLoading(false)
    }
  }

  useEffect(() => {
    fetchReports(true)
  }, [])

  const handleDeleteReport = async (reportId: string) => {
    if (!confirm("Are you sure you want to delete this report?")) return
    setDeletingId(reportId)
    try {
      const res = await api.delete(`/api/reports/${reportId}`)
      if (res.error) {
        alert(res.error)
      } else {
        setReports((prev) => prev.filter((r) => r.id !== reportId))
      }
    } catch {
      alert("Failed to delete report")
    } finally {
      setDeletingId(null)
    }
  }

  const handleClearAllReports = async () => {
    if (!confirm("Are you sure you want to clear all report history? This action cannot be undone.")) return
    setClearingAll(true)
    try {
      const res = await api.delete("/api/reports")
      if (res.error) {
        alert(res.error)
      } else {
        setReports([])
      }
    } catch {
      alert("Failed to clear reports history")
    } finally {
      setClearingAll(false)
    }
  }

  const renderContent = () => {
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
          onDelete={() => handleDeleteReport(latestReport.id)}
        />

        {reports.length > 1 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg text-zinc-900 dark:text-white">Past Reports ({reports.length - 1})</h3>
              <button
                onClick={handleClearAllReports}
                disabled={clearingAll}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 rounded-md text-xs font-medium transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{clearingAll ? "Clearing..." : "Clear All Reports"}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reports.slice(1).map((r) => (
                <div key={r.id} className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg relative group">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium text-sm text-zinc-900 dark:text-white">{r.title}</h4>
                      <p className="text-xs text-zinc-500">{format(new Date(r.createdAt), "MMM d, yyyy h:mm a")}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteReport(r.id)}
                      disabled={deletingId === r.id}
                      title="Delete this past report"
                      className="p-1.5 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-md transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-zinc-700 dark:text-zinc-300 mt-2 line-clamp-2 leading-relaxed">
                    {((r.contentJson as any)?.summary || (r.contentJson as any)?.executiveSummary || "No summary provided.")}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

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

        <div className="flex items-center space-x-3">
          {reports.length > 0 && (
            <button
              onClick={handleClearAllReports}
              disabled={clearingAll}
              title="Clear all reports history"
              className="flex items-center space-x-1.5 px-3 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-red-50 dark:hover:bg-red-950/40 text-zinc-600 dark:text-zinc-300 hover:text-red-600 dark:hover:text-red-400 border border-zinc-200 dark:border-zinc-700 rounded-md text-xs font-medium transition-colors disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear History</span>
            </button>
          )}
          <GenerateForm onGenerated={() => fetchReports(false)} />
        </div>
      </div>

      {renderContent()}
    </div>
  )
}
