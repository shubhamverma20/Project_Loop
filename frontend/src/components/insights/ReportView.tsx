"use client"

import Link from "next/link"
import { Sparkles, TrendingUp, TrendingDown, Lightbulb, AlertTriangle, CheckCircle2, Printer, Layers, Zap } from "lucide-react"

function getItemText(item: any): string {
  if (!item) return ""
  if (typeof item === "string") return item
  if (typeof item === "object") {
    if (item.action) {
      return `${item.action}${item.priority ? ` [${item.priority}]` : ""}${item.rationale ? `: ${item.rationale}` : ""}`
    }
    if (item.issue) {
      return `${item.issue}${item.suggestedAction ? ` — Action: ${item.suggestedAction}` : ""}${item.frequency ? ` (${item.frequency} times)` : ""}`
    }
    if (item.title) {
      return `${item.title}${item.description ? `: ${item.description}` : ""}`
    }
    return Object.values(item).filter((val) => typeof val === "string" || typeof val === "number").join(" - ")
  }
  return String(item)
}

export function ReportView({ report, title, dateStr }: { report: any, title: string, dateStr: string }) {
  const summaryText = report?.summary || report?.executiveSummary || "No summary provided."
  const keyThemes = report?.keyThemes || report?.keyTrends || []
  const painPoints = report?.painPoints || report?.topCustomerPains || []
  const positiveTrends = report?.positiveTrends || report?.sentimentAnalysis?.positiveDrivers || []
  const negativeTrends = report?.negativeTrends || report?.sentimentAnalysis?.negativeDrivers || []
  const featureRequests = report?.featureRequests || []
  const recommendedActions = report?.recommendedActions || []
  const risks = report?.risks || []

  const SectionHeader = ({ icon: Icon, title, color }: { icon: React.ElementType, title: string, color: string }) => (
    <div className="flex items-center space-x-2 mb-4">
      <div className={`p-2 rounded-lg ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">{title}</h3>
    </div>
  )

  const ItemList = ({ items }: { items?: any[] }) => {
    if (!items || items.length === 0) return <p className="text-sm text-zinc-500">None identified.</p>
    
    return (
      <ul className="space-y-3">
        {items.map((item, i) => {
          const text = getItemText(item)
          return (
            <li key={i} className="flex items-start bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-lg border border-zinc-100 dark:border-zinc-800 print:break-inside-avoid">
              <span className="flex-1 text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{text}</span>
              <Link
                href={`/feedback?query=${encodeURIComponent(text)}`}
                className="ml-4 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline flex-shrink-0 print:hidden"
              >
                Drill down &rarr;
              </Link>
            </li>
          )
        })}
      </ul>
    )
  }

  const PlainList = ({ items }: { items?: any[] }) => {
    if (!items || items.length === 0) return <p className="text-sm text-zinc-500">None identified.</p>
    return (
      <ul className="list-disc pl-5 space-y-2">
        {items.map((item, i) => {
          const text = getItemText(item)
          return (
            <li key={i} className="text-sm text-zinc-700 dark:text-zinc-300 print:break-inside-avoid">
              {text}
            </li>
          )
        })}
      </ul>
    )
  }

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm overflow-hidden print:border-none print:shadow-none">
      <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 bg-gradient-to-r from-blue-50/50 to-transparent dark:from-blue-900/10 print:bg-none print:border-b-2 print:border-black">
        <div className="flex items-center space-x-2 mb-2">
          <Sparkles className="w-5 h-5 text-blue-500 print:hidden" />
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white print:text-black">{title}</h2>
          <div className="flex-1" />
          <button 
            onClick={() => window.print()}
            className="print:hidden flex items-center space-x-2 px-3 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Export PDF</span>
          </button>
        </div>
        <p className="text-sm text-zinc-500 print:text-zinc-600">{dateStr}</p>
      </div>

      <div className="p-6 space-y-8 print:p-0 print:py-6">
        {report?.metrics && (
          <section className="grid grid-cols-2 md:grid-cols-4 gap-4 print:break-inside-avoid">
            <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-100 dark:border-zinc-800 print:border-zinc-300">
              <p className="text-sm text-zinc-500 print:text-black">Total Feedback</p>
              <p className="text-2xl font-bold print:text-black">{report.metrics.totalFeedback}</p>
            </div>
            <div className="p-4 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-100 dark:border-green-900/20 print:border-zinc-300">
              <p className="text-sm text-green-600 dark:text-green-400 print:text-black">Positive</p>
              <p className="text-2xl font-bold text-green-700 dark:text-green-300 print:text-black">{report.metrics.positive}</p>
            </div>
            <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-100 dark:border-zinc-800 print:border-zinc-300">
              <p className="text-sm text-zinc-500 print:text-black">Neutral</p>
              <p className="text-2xl font-bold print:text-black">{report.metrics.neutral}</p>
            </div>
            <div className="p-4 bg-rose-50 dark:bg-rose-900/10 rounded-lg border border-rose-100 dark:border-rose-900/20 print:border-zinc-300">
              <p className="text-sm text-rose-600 dark:text-rose-400 print:text-black">Negative</p>
              <p className="text-2xl font-bold text-rose-700 dark:text-rose-300 print:text-black">{report.metrics.negative}</p>
            </div>
          </section>
        )}

        <section className="bg-blue-50/50 dark:bg-blue-950/20 p-4 rounded-xl border border-blue-100 dark:border-blue-900/30">
          <h3 className="text-xs font-bold text-blue-900 dark:text-blue-200 uppercase tracking-wider mb-2">Executive Summary</h3>
          <p className="text-zinc-800 dark:text-zinc-200 text-base leading-relaxed font-medium print:text-black">
            {summaryText}
          </p>
        </section>

        {report?.categoryAnalysis && report.categoryAnalysis.length > 0 && (
          <section>
            <SectionHeader icon={Layers} title="Category Breakdown" color="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400" />
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {report.categoryAnalysis.map((cat: any, idx: number) => (
                <div key={idx} className="p-3 bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                  <div className="flex items-center justify-between text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    <span>{cat.category}</span>
                    <span className="font-mono text-blue-600 dark:text-blue-400">{cat.count} ({cat.percentage}%)</span>
                  </div>
                  <div className="w-full bg-zinc-200 dark:bg-zinc-700 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-blue-500 h-full rounded-full" style={{ width: `${Math.min(cat.percentage, 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <section>
            <SectionHeader icon={CheckCircle2} title="Key Themes & Trends" color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" />
            <ItemList items={keyThemes} />
          </section>

          <section>
            <SectionHeader icon={AlertTriangle} title="Customer Pain Points" color="bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400" />
            <ItemList items={painPoints} />
          </section>

          {report?.priorityImpact && report.priorityImpact.length > 0 && (
            <section className="lg:col-span-2">
              <SectionHeader icon={Zap} title="Priority & Impact Recommendations" color="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400" />
              <div className="space-y-3">
                {report.priorityImpact.map((item: any, idx: number) => (
                  <div key={idx} className="p-4 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${
                          item.impact === 'HIGH' ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' :
                          item.impact === 'MEDIUM' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' :
                          'bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-300'
                        }`}>
                          {item.impact || "MEDIUM"} IMPACT
                        </span>
                        <h4 className="font-semibold text-xs text-zinc-900 dark:text-white">{item.issue}</h4>
                      </div>
                      <p className="text-xs text-zinc-600 dark:text-zinc-400">{item.recommendation}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="space-y-6">
            <div>
              <SectionHeader icon={TrendingUp} title="Positive Trends" color="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400" />
              <PlainList items={positiveTrends} />
            </div>
            <div>
              <SectionHeader icon={TrendingDown} title="Negative Trends" color="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" />
              <PlainList items={negativeTrends} />
            </div>
          </section>

          <section className="space-y-6">
            {featureRequests.length > 0 && (
              <div>
                <SectionHeader icon={Lightbulb} title="Feature Requests" color="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" />
                <PlainList items={featureRequests} />
              </div>
            )}
            <div>
              <SectionHeader icon={CheckCircle2} title="Recommended Actions" color="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" />
              <PlainList items={recommendedActions} />
            </div>
            {risks && risks.length > 0 && (
              <div>
                <SectionHeader icon={AlertTriangle} title="Risks" color="bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400" />
                <PlainList items={risks} />
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
