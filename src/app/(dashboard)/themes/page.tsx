import { getWorkspaceThemes, getThemeTrends } from "@/app/actions/themes"
import Link from "next/link"
import { TrendingUp, TrendingDown, Hash, AlertTriangle } from "lucide-react"

export default async function ThemesPage() {
  const [themesRes, trendsRes] = await Promise.all([
    getWorkspaceThemes(),
    getThemeTrends()
  ])

  if (themesRes.error || trendsRes.error) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-lg border border-red-200">
        Failed to load themes data.
      </div>
    )
  }

  const themes = themesRes.data || []
  const trends = trendsRes.data || []

  const spikingThemes = trends.filter(t => t.isSpiking)

  return (
    <div className="space-y-8 max-w-6xl mx-auto h-full flex flex-col">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">Theme Clusters</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Explore AI-generated feedback categories and analyze trends.
        </p>
      </div>

      {/* Spiking Trends Banner */}
      {spikingThemes.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-6">
          <div className="flex items-center space-x-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-500" />
            <h2 className="font-semibold text-amber-900 dark:text-amber-500">Spiking Themes</h2>
            <span className="text-sm text-amber-700 dark:text-amber-400/80 ml-2">(Last 7 Days)</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {spikingThemes.map(trend => (
              <Link 
                key={trend.id} 
                href={`/themes/${trend.id}`}
                className="bg-white dark:bg-zinc-900 p-4 rounded-lg border border-amber-100 dark:border-amber-500/10 shadow-sm hover:shadow-md transition-shadow group"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-zinc-900 dark:text-zinc-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                      {trend.name}
                    </h3>
                    <p className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">
                      {trend.currentVolume}
                    </p>
                  </div>
                  <div className="flex items-center space-x-1 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-md text-sm font-medium">
                    <TrendingUp className="w-4 h-4" />
                    <span>+{trend.growth}%</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Theme Grid */}
      <div>
        <h2 className="font-semibold text-zinc-900 dark:text-white mb-4">All Themes</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {themes.map((theme) => {
            const trendData = trends.find(t => t.id === theme.id)
            const isGrowing = (trendData?.growth || 0) > 0
            // removed isShrinking

            return (
              <Link 
                key={theme.id} 
                href={`/themes/${theme.id}`}
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-md transition-all group"
              >
                <div className="flex items-center space-x-2 text-zinc-500 dark:text-zinc-400 mb-3">
                  <Hash className="w-4 h-4" />
                  <h3 className="font-medium text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
                    {theme.name}
                  </h3>
                </div>
                
                <div className="flex items-end justify-between mt-4">
                  <div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">Total Feedback</p>
                    <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                      {theme._count.feedbacks}
                    </p>
                  </div>
                  
                  {trendData && trendData.growth !== 0 && (
                    <div className={`flex items-center space-x-1 text-xs font-medium ${isGrowing ? "text-emerald-600" : "text-rose-600"}`}>
                      {isGrowing ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      <span>{Math.abs(trendData.growth)}%</span>
                    </div>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
        
        {themes.length === 0 && (
          <div className="text-center py-12 text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/20 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">
            No themes have been generated yet. Import feedback to start auto-clustering.
          </div>
        )}
      </div>
    </div>
  )
}
