export function AnalyticsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Top Stats Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-10 h-10 bg-zinc-200 dark:bg-zinc-800 rounded-lg"></div>
              <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-24"></div>
            </div>
            <div className="h-8 bg-zinc-200 dark:bg-zinc-800 rounded w-16 mb-2"></div>
            <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-32"></div>
          </div>
        ))}
      </div>

      {/* Main Chart Skeleton */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
        <div className="h-5 bg-zinc-200 dark:bg-zinc-800 rounded w-48 mb-6"></div>
        <div className="h-[300px] bg-zinc-100 dark:bg-zinc-800/50 rounded-lg w-full"></div>
      </div>

      {/* Grid Charts Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
          <div className="h-5 bg-zinc-200 dark:bg-zinc-800 rounded w-36 mb-6"></div>
          <div className="h-[250px] bg-zinc-100 dark:bg-zinc-800/50 rounded-lg w-full flex items-center justify-center">
             <div className="w-32 h-32 rounded-full bg-zinc-200 dark:bg-zinc-800"></div>
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
          <div className="h-5 bg-zinc-200 dark:bg-zinc-800 rounded w-40 mb-6"></div>
          <div className="h-[250px] bg-zinc-100 dark:bg-zinc-800/50 rounded-lg w-full"></div>
        </div>
      </div>
    </div>
  )
}
