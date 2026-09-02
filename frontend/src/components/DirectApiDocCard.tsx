"use client"

import { useState } from "react"
import { ApiKeyCard } from "@/components/ApiKeyCard"
import { Terminal, Copy, Check, Code2, Globe, Shield } from "lucide-react"

export function DirectApiDocCard() {
  const [copiedUrl, setCopiedUrl] = useState(false)
  const [copiedSnippet, setCopiedSnippet] = useState(false)
  const [activeTab, setActiveTab] = useState<"curl" | "fetch">("curl")

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
  const endpointUrl = `${baseUrl}/api/feedback`

  const curlSnippet = `curl -X POST "${endpointUrl}" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_WORKSPACE_API_KEY" \\
  -d '{
    "content": "The checkout process is too slow on mobile",
    "channel": "Website",
    "customerLabel": "VIP Customer"
  }'`

  const fetchSnippet = `await fetch("${endpointUrl}", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": "YOUR_WORKSPACE_API_KEY"
  },
  body: JSON.stringify({
    content: "The checkout process is too slow on mobile",
    channel: "Website",
    customerLabel: "VIP Customer"
  })
});`

  const copyUrl = () => {
    navigator.clipboard.writeText(endpointUrl)
    setCopiedUrl(true)
    setTimeout(() => setCopiedUrl(false), 2000)
  }

  const copySnippet = () => {
    const textToCopy = activeTab === "curl" ? curlSnippet : fetchSnippet
    navigator.clipboard.writeText(textToCopy)
    setCopiedSnippet(true)
    setTimeout(() => setCopiedSnippet(false), 2000)
  }

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm space-y-6">
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
          <Globe className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-semibold text-zinc-900 dark:text-white">Direct Feedback REST API</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Ingest live customer feedback directly from your web/mobile app into Neon PostgreSQL & AI Processing
          </p>
        </div>
      </div>

      <ApiKeyCard hasApiKey={true} userRole="ADMIN" />

      <div className="space-y-2">
        <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
          Endpoint URL
        </label>
        <div className="flex items-center space-x-2">
          <span className="px-2.5 py-1.5 text-xs font-mono font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 rounded-md">
            POST
          </span>
          <code className="flex-1 p-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md font-mono text-xs text-zinc-900 dark:text-zinc-100 select-all overflow-x-auto">
            {endpointUrl}
          </code>
          <button
            onClick={copyUrl}
            className="p-2 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md transition-colors flex items-center space-x-1 text-xs"
            title="Copy URL"
          >
            {copiedUrl ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            <span>{copiedUrl ? "Copied" : "Copy"}</span>
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 border-b border-zinc-200 dark:border-zinc-800 w-full">
            <button
              onClick={() => setActiveTab("curl")}
              className={`pb-2 px-3 text-xs font-medium border-b-2 transition-colors flex items-center space-x-1 ${
                activeTab === "curl"
                  ? "border-blue-600 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400"
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>cURL</span>
            </button>
            <button
              onClick={() => setActiveTab("fetch")}
              className={`pb-2 px-3 text-xs font-medium border-b-2 transition-colors flex items-center space-x-1 ${
                activeTab === "fetch"
                  ? "border-blue-600 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400"
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>JavaScript (Fetch)</span>
            </button>
          </div>
        </div>

        <div className="relative">
          <pre className="p-4 bg-zinc-950 text-zinc-100 rounded-lg text-xs font-mono overflow-x-auto leading-relaxed border border-zinc-800">
            {activeTab === "curl" ? curlSnippet : fetchSnippet}
          </pre>
          <button
            onClick={copySnippet}
            className="absolute top-3 right-3 p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded transition-colors flex items-center space-x-1 text-[11px]"
          >
            {copiedSnippet ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedSnippet ? "Copied" : "Copy"}</span>
          </button>
        </div>
      </div>

      <div className="p-3.5 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 rounded-lg text-xs space-y-1 text-blue-900 dark:text-blue-200">
        <div className="flex items-center space-x-1.5 font-semibold">
          <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span>Security & Integration Rules</span>
        </div>
        <ul className="list-disc list-inside space-y-0.5 text-zinc-600 dark:text-zinc-400 text-[11px]">
          <li>Pass your Workspace API Key in the <code className="text-blue-600 dark:text-blue-300 font-mono">x-api-key</code> header or <code className="text-blue-600 dark:text-blue-300 font-mono">Authorization: Bearer &lt;key&gt;</code> header.</li>
          <li>Never expose your raw API key in client-side code repositories. Store keys in secure backend environment variables.</li>
          <li>All feedback is automatically deduplicated, sanitized, and queued for real-time AI classification.</li>
        </ul>
      </div>
    </div>
  )
}
