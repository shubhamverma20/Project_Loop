"use client"

import { useState } from "react"
import { CsvUploader } from "@/components/CsvUploader"
import { simulateChannelSync } from "@/app/actions/ingestion"
import { Cable, Loader2, CheckCircle2, AlertCircle } from "lucide-react"

export default function SourcesPage() {
  const [loadingChannel, setLoadingChannel] = useState<string | null>(null)
  const [syncResult, setSyncResult] = useState<{ message: string; type: "success" | "error" } | null>(null)

  const handleSimulateSync = async (channelName: string) => {
    setLoadingChannel(channelName)
    setSyncResult(null)

    try {
      const res = await simulateChannelSync(channelName)
      if (res.error) {
        setSyncResult({ message: res.error, type: "error" })
      } else if (res.message) {
        setSyncResult({ message: res.message, type: "success" })
      }
    } catch {
      setSyncResult({ message: "An unexpected error occurred", type: "error" })
    } finally {
      setLoadingChannel(null)
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">Data Sources</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Connect integrations or manually upload data to ingest feedback into your workspace.
        </p>
      </div>

      {syncResult && (
        <div className={`p-4 rounded-lg flex items-center space-x-3 text-sm animate-in fade-in slide-in-from-top-2 ${
          syncResult.type === "success" 
            ? "bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-900/50 dark:text-emerald-300" 
            : "bg-red-50 text-red-800 border border-red-200 dark:bg-red-900/20 dark:border-red-900/50 dark:text-red-300"
        }`}>
          {syncResult.type === "success" ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <p>{syncResult.message}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CSV Upload Section */}
        <CsvUploader />

        {/* Simulated Integrations Section */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400">
              <Cable className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-zinc-900 dark:text-white">Active Integrations</h3>
          </div>

          <div className="space-y-4">
            {/* Zendesk Integration */}
            <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-lg">
              <div>
                <h4 className="font-medium text-zinc-900 dark:text-white text-sm">Zendesk Support</h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Sync support tickets automatically.</p>
              </div>
              <button
                onClick={() => handleSimulateSync("Zendesk")}
                disabled={loadingChannel !== null}
                className="flex items-center space-x-2 px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-md text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
              >
                {loadingChannel === "Zendesk" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <span>Sync Now</span>
                )}
              </button>
            </div>

            {/* App Store Integration */}
            <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-lg">
              <div>
                <h4 className="font-medium text-zinc-900 dark:text-white text-sm">App Store Reviews</h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Sync iOS app store reviews.</p>
              </div>
              <button
                onClick={() => handleSimulateSync("App Store")}
                disabled={loadingChannel !== null}
                className="flex items-center space-x-2 px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-md text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
              >
                {loadingChannel === "App Store" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <span>Sync Now</span>
                )}
              </button>
            </div>
            
            {/* Intercom Integration */}
            <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-lg">
              <div>
                <h4 className="font-medium text-zinc-900 dark:text-white text-sm">Intercom Chat</h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Sync customer conversations.</p>
              </div>
              <button
                onClick={() => handleSimulateSync("Intercom")}
                disabled={loadingChannel !== null}
                className="flex items-center space-x-2 px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-md text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
              >
                {loadingChannel === "Intercom" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <span>Sync Now</span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
