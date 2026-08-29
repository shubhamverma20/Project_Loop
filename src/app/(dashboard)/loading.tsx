import { Loader2 } from "lucide-react"

export default function Loading() {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-4">
      <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Loading data...</p>
    </div>
  )
}
