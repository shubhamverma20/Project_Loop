"use client"

import { useEffect } from "react"
import { AlertTriangle } from "lucide-react"

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service in production
    console.error(error)
  }, [error])

  return (
    <div className="min-h-[60vh] bg-transparent flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 p-8 text-center">
        <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">Something went wrong!</h2>
        <p className="text-zinc-500 dark:text-zinc-400 mb-8">
          An unexpected error occurred while processing your request. Please try again.
        </p>
        <button
          onClick={() => reset()}
          className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-zinc-900 dark:bg-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors w-full"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
