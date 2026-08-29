import Link from "next/link"
import { AlertCircle } from "lucide-react"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 p-8 text-center">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">Page Not Found</h2>
        <p className="text-zinc-500 dark:text-zinc-400 mb-8">
          We couldn&apos;t find the page you were looking for. It might have been moved or deleted.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors w-full"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  )
}
