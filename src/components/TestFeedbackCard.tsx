"use client"

import { useState } from "react"
import { ingestSingleFeedback, IngestionResult } from "@/app/actions/ingestion"
import { Send, Loader2, CheckCircle2, AlertCircle, Sparkles, Tag, Smile } from "lucide-react"

export function TestFeedbackCard() {
  const [content, setContent] = useState("")
  const [channel, setChannel] = useState("Test Ingestion")
  const [customerLabel, setCustomerLabel] = useState("QA Tester")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<IngestionResult | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return

    setLoading(true)
    setResult(null)

    try {
      const res = await ingestSingleFeedback({
        content,
        channel,
        customerLabel
      })
      setResult(res)
      if (res.success) {
        setContent("")
      }
    } catch {
      setResult({
        success: false,
        error: "Failed to submit test feedback"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm space-y-4">
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-semibold text-zinc-900 dark:text-white">Live Feedback Test Ingestion</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Submit a real feedback item directly into the AI classification pipeline & PostgreSQL
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Feedback Content
          </label>
          <textarea
            rows={3}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="e.g., Love the new vector search feature! However export PDF button is a bit slow on mobile."
            className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:text-white placeholder-zinc-400"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Source Channel
            </label>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:text-white"
            >
              <option value="Test Ingestion">Test Ingestion</option>
              <option value="API">API</option>
              <option value="Support Ticket">Support Ticket</option>
              <option value="User Review">User Review</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Customer Label
            </label>
            <input
              type="text"
              value={customerLabel}
              onChange={(e) => setCustomerLabel(e.target.value)}
              placeholder="e.g. Enterprise Client"
              className="w-full px-3 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:text-white"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !content.trim()}
          className="flex items-center justify-center space-x-2 w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Processing with AI...</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span>Submit & Classify Feedback</span>
            </>
          )}
        </button>
      </form>

      {result && (
        <div className={`p-4 rounded-lg text-xs space-y-2 border ${
          result.success
            ? "bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-900/50 dark:text-emerald-300"
            : "bg-red-50 text-red-900 border-red-200 dark:bg-red-950/40 dark:border-red-900/50 dark:text-red-300"
        }`}>
          <div className="flex items-center space-x-2 font-medium">
            {result.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
            )}
            <span>{result.success ? result.message : result.error}</span>
          </div>

          {result.success && result.feedback && (
            <div className="pt-2 border-t border-emerald-200 dark:border-emerald-800/60 grid grid-cols-3 gap-2">
              <div className="flex items-center space-x-1">
                <Tag className="w-3 h-3 text-blue-500" />
                <span className="font-semibold">{result.feedback.category || "Uncategorized"}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Smile className="w-3 h-3 text-amber-500" />
                <span className="font-semibold">{result.feedback.sentiment || "NEU"}</span>
              </div>
              <div className="text-right text-[11px] text-zinc-500">
                <span>ID: {result.feedback.id.substring(0, 8)}...</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
