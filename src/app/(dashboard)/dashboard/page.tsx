import { Suspense } from "react"
import { getDashboardStats, DateRange } from "@/app/actions/analytics"
import { VolumeChart } from "@/components/analytics/VolumeChart"
import { SentimentChart } from "@/components/analytics/SentimentChart"
import { ThemesChart } from "@/components/analytics/ThemesChart"
import { CategoryChart } from "@/components/analytics/CategoryChart"
import { SourceChart } from "@/components/analytics/SourceChart"
import { AnalyticsSkeleton } from "@/components/analytics/AnalyticsSkeleton"
import Link from "next/link"
import { BarChart3, TrendingUp, TrendingDown, Inbox, Calendar } from "lucide-react"

async function DashboardContent({ range, customStart, customEnd }: { range: DateRange, customStart?: string, customEnd?: string }) {
  const { data, error } = await getDashboardStats(range, customStart, customEnd)

  if (error || !data) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-lg border border-red-200">
        {error || "Failed to load dashboard data."}
      </div>
    )
  }

  const { stats, charts } = data

  return (
    <div className="space-y-6">
      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
              <Inbox className="w-5 h-5" />
            </div>
            <h3 className="font-medium text-zinc-600 dark:text-zinc-400">Total Feedback</h3>
          </div>
          <p className="text-3xl font-bold text-zinc-900 dark:text-white">
            {stats.totalFeedback.toLocaleString()}
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h3 className="font-medium text-zinc-600 dark:text-zinc-400">Positive Feedback</h3>
          </div>
          <p className="text-3xl font-bold text-zinc-900 dark:text-white">
            {stats.positiveFeedbackCount.toLocaleString()}
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2 bg-rose-100 dark:bg-rose-900/30 rounded-lg text-rose-600 dark:text-rose-400">
              <TrendingDown className="w-5 h-5" />
            </div>
            <h3 className="font-medium text-zinc-600 dark:text-zinc-400">Negative Feedback</h3>
          </div>
          <p className="text-3xl font-bold text-zinc-900 dark:text-white">
            {stats.negativeFeedbackCount.toLocaleString()}
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-zinc-600 dark:text-zinc-400">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h3 className="font-medium text-zinc-600 dark:text-zinc-400">New This Week</h3>
          </div>
          <p className="text-3xl font-bold text-zinc-900 dark:text-white">
            +{stats.newThisWeek.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Main Volume Chart */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
        <div className="flex items-center space-x-2 mb-6">
          <BarChart3 className="w-5 h-5 text-zinc-400" />
          <h2 className="font-semibold text-zinc-900 dark:text-white">Feedback Volume Trends</h2>
        </div>
        <div className="h-[300px] w-full">
          <VolumeChart data={charts.volumeData} />
        </div>
      </div>

      {/* Grid Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm flex flex-col">
          <h2 className="font-semibold text-zinc-900 dark:text-white mb-6">Category Distribution</h2>
          <div className="h-[250px] w-full flex-1">
            <CategoryChart data={charts.categoryData} />
          </div>
        </div>
        
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm flex flex-col">
          <h2 className="font-semibold text-zinc-900 dark:text-white mb-6">Source Channels</h2>
          <div className="h-[250px] w-full flex-1">
            <SourceChart data={charts.channelData} />
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
          <h2 className="font-semibold text-zinc-900 dark:text-white mb-6">Sentiment Breakdown</h2>
          <div className="h-[250px] w-full">
            <SentimentChart data={charts.sentimentData} />
          </div>
        </div>
        
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
          <h2 className="font-semibold text-zinc-900 dark:text-white mb-6">Top Themes (Auto-Classified)</h2>
          <div className="h-[250px] w-full">
            <ThemesChart data={charts.themeData} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined }
}) {
  const range = (searchParams.range as DateRange) || "30d"
  const customStart = searchParams.start
  const customEnd = searchParams.end

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between space-y-4 xl:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">Analytics Dashboard</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Monitor feedback trends, categories, and sentiment across your workspace.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          {/* Custom Date Form (Simple native inputs via GET form to update URL searchParams) */}
          <form className="flex items-center space-x-2 bg-white dark:bg-zinc-900 p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm" method="GET">
            <input type="hidden" name="range" value="custom" />
            <div className="flex items-center space-x-2 px-2">
              <Calendar className="w-4 h-4 text-zinc-400" />
              <input type="date" name="start" defaultValue={customStart} required className="text-sm border-none bg-transparent focus:ring-0 text-zinc-700 dark:text-zinc-300 w-32" />
              <span className="text-zinc-400 text-sm">to</span>
              <input type="date" name="end" defaultValue={customEnd} required className="text-sm border-none bg-transparent focus:ring-0 text-zinc-700 dark:text-zinc-300 w-32" />
            </div>
            <button type="submit" className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs font-medium rounded transition-colors">
              Apply
            </button>
          </form>

          {/* Quick Date Range Selector */}
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-900 p-1 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <Link 
              href="?range=7d" 
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${range === "7d" ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"}`}
            >
              7 Days
            </Link>
            <Link 
              href="?range=30d" 
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${range === "30d" ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"}`}
            >
              30 Days
            </Link>
            <Link 
              href="?range=90d" 
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${range === "90d" ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"}`}
            >
              90 Days
            </Link>
          </div>
        </div>
      </div>

      <Suspense fallback={<AnalyticsSkeleton />} key={`${range}-${customStart}-${customEnd}`}>
        <DashboardContent range={range} customStart={customStart} customEnd={customEnd} />
      </Suspense>
    </div>
  )
}
