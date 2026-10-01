"use client"

import { useState } from "react"
import { api } from "@/lib/api-client"
import { Bot, Search, Sparkles, CheckCircle, AlertCircle, ExternalLink, ShieldCheck } from "lucide-react"

interface Citation {
  id: string
  content: string
  category?: string
  sentiment?: string
  channel: string
  customerLabel?: string
  createdAt: string
  similarity: number
}

interface AskLoopResponse {
  answer: string
  hasSufficientEvidence: boolean
  evidence: Citation[]
  error?: string
}

export function AskLoopCard() {
  const [question, setQuestion] = useState("")
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState<AskLoopResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!question.trim()) return

    setLoading(true)
    setError(null)
    setResponse(null)

    try {
      const res = await api.post<AskLoopResponse>("/api/feedback/ask", {
        question: question.trim()
      })

      if (res.error) {
        setError(res.error)
      } else if (res.data) {
        setResponse(res.data)
      }
    } catch {
      setError("Failed to connect to Ask LOOP AI service.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-gradient-to-br from-slate-900 to-zinc-900 text-white rounded-xl border border-zinc-800 p-6 shadow-xl space-y-6">
      <div className="flex items-center space-x-3">
        <div className="p-2.5 bg-blue-600/20 text-blue-400 rounded-lg border border-blue-500/30">
          <Bot className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
            Ask LOOP <span className="text-xs bg-blue-500/20 text-blue-300 border border-blue-400/30 px-2 py-0.5 rounded-full font-mono">Grounded RAG Q&A</span>
          </h2>
          <p className="text-xs text-zinc-400">
            Ask questions answered STRICTLY from your retrieved customer feedback evidence.
          </p>
        </div>
      </div>

      <form onSubmit={handleAsk} className="flex flex-col sm:flex-row gap-2 sm:relative">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g., What are the main complaints regarding billing?"
          className="w-full pl-4 pr-4 sm:pr-28 py-2.5 sm:py-3 bg-zinc-950/80 border border-zinc-800 rounded-lg text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
        />
        <button
          type="submit"
          disabled={loading || !question.trim()}
          className="w-full sm:w-auto sm:absolute sm:right-2 sm:top-1/2 sm:-translate-y-1/2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold rounded-md flex items-center justify-center space-x-1.5 transition-colors shrink-0"
        >
          {loading ? (
            <span>Analyzing...</span>
          ) : (
            <>
              <Search className="w-3.5 h-3.5" />
              <span>Ask AI</span>
            </>
          )}
        </button>
      </form>

      {error && (
        <div className="p-3 bg-red-950/50 border border-red-800/50 rounded-lg text-xs text-red-300 flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {response && (
        <div className="space-y-4 pt-2 border-t border-zinc-800/80">
          <div className="p-4 bg-zinc-950/60 rounded-lg border border-zinc-800 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-blue-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Gemini AI Answer
              </span>
              {response.hasSufficientEvidence ? (
                <span className="text-[10px] bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Grounded in Evidence
                </span>
              ) : (
                <span className="text-[10px] bg-amber-950/60 text-amber-400 border border-amber-800/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Insufficient Evidence
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed font-medium">
              {response.answer}
            </p>
          </div>

          {response.evidence && response.evidence.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-zinc-400 tracking-wider uppercase">
                Evidence Citations ({response.evidence.length})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
                {response.evidence.map((item, idx) => (
                  <div key={item.id} className="p-3 bg-zinc-950/40 border border-zinc-800/60 rounded-lg space-y-1.5 hover:border-zinc-700 transition-colors">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-blue-300">#Evidence {idx + 1}</span>
                      <span className="text-zinc-500 font-mono">Similarity: {Math.round(item.similarity * 100)}%</span>
                    </div>
                    <p className="text-xs text-zinc-300 line-clamp-2 italic">
                      "{item.content}"
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-zinc-500">
                      <span>{item.channel} • {item.category || "General"}</span>
                      <a href={`/feedback?query=${encodeURIComponent(item.id)}`} className="text-blue-400 hover:underline flex items-center gap-0.5">
                        View item <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
