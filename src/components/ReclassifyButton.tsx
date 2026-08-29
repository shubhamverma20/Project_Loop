"use client"

import { useTransition } from "react"
import { reclassifyFeedback } from "@/app/actions/feedback"
import { Sparkles, Loader2 } from "lucide-react"

export function ReclassifyButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition()

  const handleReclassify = () => {
    startTransition(async () => {
      const res = await reclassifyFeedback(id)
      if (res.error) {
        alert(res.error)
      }
    })
  }

  return (
    <button
      onClick={handleReclassify}
      disabled={isPending}
      title="Re-classify with AI"
      className="p-1.5 text-zinc-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-md transition-colors disabled:opacity-50"
    >
      {isPending ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Sparkles className="w-4 h-4" />
      )}
    </button>
  )
}
