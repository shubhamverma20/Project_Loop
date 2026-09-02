"use client"

import { useState } from "react"
import { api } from "@/lib/api-client"
import { Loader2, AlertCircle } from "lucide-react"

export function GenerateForm({ onGenerated }: { onGenerated?: () => void }) {
  const [range, setRange] = useState("30d")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await api.post("/api/reports/generate", { range })
      if (res.error) {
        setError(res.error)
      } else {
        if (onGenerated) onGenerated()
      }
    } catch {
      setError("Failed to generate report")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <form onSubmit={handleSubmit} className="flex items-center space-x-2">
        <select 
          value={range}
          onChange={(e) => setRange(e.target.value)}
          disabled={loading}
          className="text-sm rounded-md border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white px-3 py-2 disabled:opacity-50" 
        >
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
          <option value="90d">Last 90 Days</option>
        </select>
        <button 
          disabled={loading} 
          type="submit" 
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-sm font-medium rounded-md transition-colors shadow-sm disabled:opacity-50 flex-shrink-0"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Generating Report...</span>
            </>
          ) : (
            <span>Generate Report</span>
          )}
        </button>
      </form>

      {error && (
        <div className="flex items-center space-x-1.5 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 p-2 rounded-md max-w-md animate-in fade-in">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}
