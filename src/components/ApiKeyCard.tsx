"use client"

import { useEffect, useState } from "react"
import { generateApiKey } from "@/app/actions/settings"
import { getWorkspaceApiKey } from "@/app/actions/ingestion"
import { Key, Copy, Check, ShieldCheck, AlertCircle, RefreshCw } from "lucide-react"

interface ApiKeyCardProps {
  hasApiKey?: boolean
  userRole?: string
}

interface GenerateApiKeyResponse {
  success: boolean
  error?: string | null
  apiKey?: string | null
}

export function ApiKeyCard({ hasApiKey = false, userRole = "ADMIN" }: ApiKeyCardProps) {
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadApiKey() {
      try {
        const res = await getWorkspaceApiKey()
        if (res.apiKey) {
          setApiKey(res.apiKey)
        }
      } catch (err) {
        console.error("Failed to load API key:", err)
      }
    }
    loadApiKey()
  }, [])

  const handleGenerate = async () => {
    if (userRole !== "ADMIN") return
    setLoading(true)
    setError(null)

    try {
      const res: GenerateApiKeyResponse = await generateApiKey()
      if (res.success && res.apiKey) {
        setApiKey(res.apiKey)
      } else {
        setError(res.error || "Failed to generate API key")
      }
    } catch {
      setError("An unexpected error occurred while generating the API key.")
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    if (!apiKey) return
    navigator.clipboard.writeText(apiKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-zinc-900 dark:text-white">Workspace API Key</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Use for automated REST API feedback ingestion (`POST /api/feedback`)
            </p>
          </div>
        </div>

        {userRole === "ADMIN" && (
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="flex items-center space-x-2 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-medium transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>{apiKey || hasApiKey ? "Regenerate Key" : "Generate Key"}</span>
          </button>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-800 border border-red-200 dark:bg-red-950/40 dark:border-red-900/50 dark:text-red-300 rounded-lg text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {apiKey ? (
        <div className="space-y-2 p-4 bg-zinc-50 dark:bg-zinc-800/50 border border-amber-300 dark:border-amber-700/50 rounded-lg">
          <div className="flex items-center justify-between text-xs text-amber-800 dark:text-amber-300 font-medium">
            <span className="flex items-center space-x-1">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>New API Key Generated Successfully!</span>
            </span>
            <span className="text-[11px] text-zinc-500">Save this now — it will not be shown again</span>
          </div>
          <div className="flex items-center space-x-2">
            <code className="flex-1 p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded font-mono text-xs text-zinc-900 dark:text-zinc-100 select-all">
              {apiKey}
            </code>
            <button
              onClick={handleCopy}
              className="p-2 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded transition-colors flex items-center space-x-1 text-xs"
              title="Copy to clipboard"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? "Copied" : "Copy"}</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center space-x-2 text-xs text-zinc-500 dark:text-zinc-400">
          <span className={`inline-block w-2 h-2 rounded-full ${hasApiKey ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-700"}`} />
          <span>{hasApiKey ? "API Key configured & active (hashed in database)" : "No API key generated yet for this workspace"}</span>
        </div>
      )}
    </div>
  )
}
