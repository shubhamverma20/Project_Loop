"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CsvUploader } from "@/components/CsvUploader"
import { simulateChannelSync } from "@/app/actions/ingestion"
import { Cable, Loader2, CheckCircle2, AlertCircle, Clock, Check } from "lucide-react"

interface ChannelSyncMeta {
  lastSyncTime: string | null
  lastCount: number | null
}

export default function SourcesPage() {
  const router = useRouter()
  const [loadingChannel, setLoadingChannel] = useState<string | null>(null)
  const [syncResult, setSyncResult] = useState<{ message: string; type: "success" | "error" } | null>(null)
  const [channelMeta, setChannelMeta] = useState<Record<string, ChannelSyncMeta>>({
    Zendesk: { lastSyncTime: null, lastCount: null },
    Intercom: { lastSyncTime: null, lastCount: null },
    "Play Store": { lastSyncTime: null, lastCount: null },
  })

  const handleSimulateSync = async (channelName: string) => {
    setLoadingChannel(channelName)
    setSyncResult(null)

    try {
      const res = await simulateChannelSync(channelName)
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })

      if (res.error) {
        setSyncResult({ message: res.error, type: "error" })
      } else if (res.message) {
        setSyncResult({ message: res.message, type: "success" })
        setChannelMeta(prev => ({
          ...prev,
          [channelName]: {
            lastSyncTime: now,
            lastCount: res.count ?? 0
          }
        }))
        // Refresh router cache so Feedback Explorer, Dashboard Analytics & AI Insights have latest state
        router.refresh()
      }
    } catch {
      setSyncResult({ message: "An unexpected error occurred during channel sync", type: "error" })
    } finally {
      setLoadingChannel(null)
    }
  }

  const channels = [
    {
      id: "Zendesk",
      title: "Zendesk Support",
      description: "Sync support tickets and customer service issues automatically.",
      tag: "Ticket Ingestion"
    },
    {
      id: "Intercom",
      title: "Intercom Chat",
      description: "Sync live customer conversations and app feedback.",
      tag: "Live Chat"
    },
    {
      id: "Play Store",
      title: "Play Store Reviews",
      description: "Sync Android mobile app user reviews and ratings.",
      tag: "App Reviews"
    }
  ]

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">Data Sources</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Ingest customer feedback via CSV Upload or Active Integrations.
        </p>
      </div>

      {syncResult && (
        <div className={`p-4 rounded-lg flex items-center space-x-3 text-sm animate-in fade-in slide-in-from-top-2 ${
          syncResult.type === "success" 
            ? "bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-900/50 dark:text-emerald-300" 
            : "bg-red-50 text-red-800 border border-red-200 dark:bg-red-900/20 dark:border-red-900/50 dark:text-red-300"
        }`}>
          {syncResult.type === "success" ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
          <p>{syncResult.message}</p>
        </div>
      )}

      {/* CSV Upload & Integrations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CsvUploader />

        {/* Simulated Integrations Section */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400">
                <Cable className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-zinc-900 dark:text-white">Active Integrations</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Seed & simulated production data sources</p>
              </div>
            </div>

            <div className="space-y-4">
              {channels.map(channel => {
                const meta = channelMeta[channel.id]
                const isLoading = loadingChannel === channel.id

                return (
                  <div 
                    key={channel.id} 
                    className="p-4 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-lg space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium text-zinc-900 dark:text-white text-sm">{channel.title}</h4>
                          <span className="px-2 py-0.5 text-[10px] font-medium bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-full">
                            {channel.tag}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{channel.description}</p>
                      </div>

                      <button
                        onClick={() => handleSimulateSync(channel.id)}
                        disabled={loadingChannel !== null}
                        className="flex items-center space-x-2 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-medium transition-colors disabled:opacity-50 flex-shrink-0 ml-3"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Syncing...</span>
                          </>
                        ) : (
                          <span>Sync Now</span>
                        )}
                      </button>
                    </div>

                    {/* Metadata display: Synced count & Last sync time */}
                    <div className="flex items-center space-x-4 pt-2 border-t border-zinc-200/60 dark:border-zinc-700/60 text-[11px] text-zinc-500 dark:text-zinc-400">
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3 text-zinc-400" />
                        <span>
                          {meta?.lastSyncTime ? `Last synced: ${meta.lastSyncTime}` : "Last synced: Never"}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Check className="w-3 h-3 text-emerald-500" />
                        <span>
                          {meta?.lastCount !== null ? `Latest sync: ${meta.lastCount} items` : "Synced count: 0"}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
