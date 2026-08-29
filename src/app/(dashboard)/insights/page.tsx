import { Suspense } from "react"
import { getReports, generateInsightsReport } from "@/app/actions/insights"
import { InsightReport } from "@/types/insights"
import { ReportView } from "@/components/insights/ReportView"
import { AnalyticsSkeleton } from "@/components/analytics/AnalyticsSkeleton"
import { format } from "date-fns"
import { Bot } from "lucide-react"
import { revalidatePath } from "next/cache"

async function InsightsContent() {
  const { data: reports, error } = await getReports()

  if (error) {
    return <div className="text-red-500">{error}</div>
  }

  if (!reports || reports.length === 0) {
    return (
      <div className="text-center py-24 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
        <Bot className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-zinc-900 dark:text-white">No Insights Generated</h3>
        <p className="text-zinc-500 mt-2 max-w-sm mx-auto">
          Generate your first AI-powered report to automatically surface themes and customer pain points.
        </p>
      </div>
    )
  }

  // Display the most recent report prominently
  const latestReport = reports[0]
  const reportData = latestReport.contentJson as unknown as InsightReport
  
  return (
    <div className="space-y-12">
      <ReportView 
        report={reportData} 
        title={latestReport.title}
        dateStr={`Generated ${format(new Date(latestReport.createdAt), "MMMM d, yyyy h:mm a")}`} 
      />

      {reports.length > 1 && (
        <div>
          <h3 className="font-semibold text-lg mb-4">Past Reports</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reports.slice(1).map(r => (
              <div key={r.id} className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                <h4 className="font-medium">{r.title}</h4>
                <p className="text-sm text-zinc-500">{format(new Date(r.createdAt), "MMM d, yyyy")}</p>
                <p className="text-sm text-zinc-700 dark:text-zinc-300 mt-2 line-clamp-2">
                  {(r.contentJson as unknown as InsightReport).summary}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function InsightsPage() {
  // Server action to generate report manually via form
  async function handleGenerate(formData: FormData) {
    "use server"
    const range = formData.get("range") as "7d" | "30d" | "90d" | "custom"
    await generateInsightsReport(range)
    revalidatePath("/insights")
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
            AI Insights <SparklesIcon className="w-5 h-5 text-blue-500" />
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Claude 3 AI analysis of customer feedback. Generates themes, risks, and recommendations.
          </p>
        </div>

        <form action={handleGenerate} className="flex items-center space-x-2">
          <select name="range" className="text-sm rounded-md border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <option value="7d">Last 7 Days</option>
            <option value="30d" selected>Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
          <button type="submit" className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium rounded-md transition-colors shadow-sm">
            Generate Report
          </button>
        </form>
      </div>

      <Suspense fallback={<AnalyticsSkeleton />}>
        <InsightsContent />
      </Suspense>
    </div>
  )
}

function SparklesIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
      <path d="M5 3v4"/>
      <path d="M19 17v4"/>
      <path d="M3 5h4"/>
      <path d="M17 19h4"/>
    </svg>
  )
}
