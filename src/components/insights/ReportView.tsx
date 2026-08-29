"use client"

import { InsightReport } from "@/types/insights"
import Link from "next/link"
import { Sparkles, TrendingUp, TrendingDown, Lightbulb, AlertTriangle, CheckCircle2, Printer } from "lucide-react"

export function ReportView({ report, title, dateStr }: { report: InsightReport, title: string, dateStr: string }) {
  const SectionHeader = ({ icon: Icon, title, color }: { icon: React.ElementType, title: string, color: string }) => (
    <div className="flex items-center space-x-2 mb-4">
      <div className={`p-2 rounded-lg ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">{title}</h3>
    </div>
  )

  const ItemList = ({ items }: { items: string[] }) => {
    if (!items || items.length === 0) return <p className="text-sm text-zinc-500">None identified.</p>
    
    return (
      <ul className="space-y-3">
        {items.map((item, i) => (
          <li key={i} className="flex items-start bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-lg border border-zinc-100 dark:border-zinc-800 print:break-inside-avoid">
            <span className="flex-1 text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{item}</span>
            <Link
              href={`/feedback?query=${encodeURIComponent(item)}`}
              className="ml-4 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline flex-shrink-0 print:hidden"
            >
              Drill down &rarr;
            </Link>
          </li>
        ))}
      </ul>
    )
  }

  const PlainList = ({ items }: { items: string[] }) => {
    if (!items || items.length === 0) return <p className="text-sm text-zinc-500">None identified.</p>
    return (
      <ul className="list-disc pl-5 space-y-1">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-zinc-700 dark:text-zinc-300 print:break-inside-avoid">{item}</li>
        ))}
      </ul>
    )
  }

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm overflow-hidden print:border-none print:shadow-none">
      {/* Header */}
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
        
        {report.metrics && (
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

        {/* Summary */}
        <section>
          <p className="text-zinc-700 dark:text-zinc-300 text-lg leading-relaxed font-medium print:text-black">
            {report.summary}
          </p>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Themes */}
          <section>
            <SectionHeader icon={CheckCircle2} title="Key Themes" color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" />
            <ItemList items={report.keyThemes} />
          </section>

          {/* Pain Points */}
          <section>
            <SectionHeader icon={AlertTriangle} title="Customer Pain Points" color="bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400" />
            <ItemList items={report.painPoints} />
          </section>

          {/* Trends */}
          <section className="space-y-6">
            <div>
              <SectionHeader icon={TrendingUp} title="Positive Trends" color="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400" />
              <PlainList items={report.positiveTrends} />
            </div>
            <div>
              <SectionHeader icon={TrendingDown} title="Negative Trends" color="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" />
              <PlainList items={report.negativeTrends} />
            </div>
          </section>

          {/* Actionable */}
          <section className="space-y-6">
            <div>
              <SectionHeader icon={Lightbulb} title="Feature Requests" color="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" />
              <PlainList items={report.featureRequests} />
            </div>
            <div>
              <SectionHeader icon={CheckCircle2} title="Recommended Actions" color="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" />
              <PlainList items={report.recommendedActions} />
            </div>
            {report.risks && report.risks.length > 0 && (
              <div>
                <SectionHeader icon={AlertTriangle} title="Risks" color="bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400" />
                <PlainList items={report.risks} />
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
