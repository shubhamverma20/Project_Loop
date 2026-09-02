"use client"

import { useFormStatus } from "react-dom"
import { useState } from "react"
import { Loader2, AlertCircle } from "lucide-react"

export function GenerateButton() {
  const { pending } = useFormStatus()
  
  return (
    <button 
      disabled={pending} 
      type="submit" 
      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-sm font-medium rounded-md transition-colors shadow-sm disabled:opacity-50 flex-shrink-0"
    >
      {pending ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Generating Report...</span>
        </>
      ) : (
        <span>Generate Report</span>
      )}
    </button>
  )
}

export function GenerateForm({ action }: { action: (formData: FormData) => Promise<{error?: string | null}> }) {
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  return (
    <div className="flex flex-col items-end gap-2">
      <form 
        action={async (formData) => {
          setError(null)
          setIsSubmitting(true)
          try {
            const result = await action(formData)
            if (result?.error) {
              setError(result.error)
            }
          } catch (err: unknown) {
            const msg = (err as { message?: string })?.message || "Failed to generate report"
            setError(msg)
          } finally {
            setIsSubmitting(false)
          }
        }} 
        className="flex items-center space-x-2"
      >
        <select 
          name="range" 
          disabled={isSubmitting}
          className="text-sm rounded-md border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white px-3 py-2 disabled:opacity-50" 
          defaultValue="30d"
        >
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
          <option value="90d">Last 90 Days</option>
        </select>
        <GenerateButton />
      </form>

      {error && (
        <div className="flex items-center space-x-1.5 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 p-2 rounded-md max-w-md animate-in fade-in">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}
