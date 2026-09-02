"use client"

import { useRouter } from "next/navigation"
import { useLiveFeedback } from "@/hooks/useLiveFeedback"
import { Sparkles, RefreshCw, Radio } from "lucide-react"

export function LiveFeedbackBanner() {
  const router = useRouter()
  const { newCount, connected, clearNewCount } = useLiveFeedback()

  if (newCount === 0) {
    return (
      <div className="flex items-center justify-end space-x-2 text-[11px] text-zinc-400">
        <span className={`w-2 h-2 rounded-full ${connected ? "bg-emerald-500 animate-pulse" : "bg-zinc-400"}`} />
        <span>{connected ? "Live Real-Time Stream Active" : "Stream Reconnecting..."}</span>
      </div>
    )
  }

  const handleRefresh = () => {
    clearNewCount()
    router.refresh()
  }

  return (
    <div className="p-3 bg-gradient-to-r from-blue-500/10 via-emerald-500/10 to-blue-500/10 border border-blue-200 dark:border-blue-800/60 rounded-xl flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-2">
      <div className="flex items-center space-x-2.5 text-xs text-zinc-900 dark:text-white font-medium">
        <div className="p-1.5 bg-blue-600 text-white rounded-lg animate-bounce">
          <Sparkles className="w-4 h-4" />
        </div>
        <div className="flex items-center space-x-2">
          <span className="flex items-center space-x-1">
            <Radio className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
            <strong className="text-blue-600 dark:text-blue-400">{newCount} new feedback item(s)</strong>
          </span>
          <span className="text-zinc-500">received via live ingestion</span>
        </div>
      </div>

      <button
        onClick={handleRefresh}
        className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-medium transition-colors shadow-sm"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        <span>Update Inbox</span>
      </button>
    </div>
  )
}
