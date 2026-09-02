"use client"

import { useState, useTransition } from "react"
import { api } from "@/lib/api-client"
import { Loader2 } from "lucide-react"

export type Status = "NEW" | "REVIEWED" | "ACTIONED"

interface StatusDropdownProps {
  id: string
  currentStatus: Status
}

export function StatusDropdown({ id, currentStatus }: StatusDropdownProps) {
  const [isPending, startTransition] = useTransition()
  const [optimisticStatus, setOptimisticStatus] = useState<Status>(currentStatus)

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value as Status
    setOptimisticStatus(newStatus)

    startTransition(async () => {
      const res = await api.post("/api/feedback/status", { feedbackId: id, status: newStatus })
      if (res.error) {
        setOptimisticStatus(currentStatus)
        alert(res.error)
      }
    })
  }

  const getStatusColor = (status: Status) => {
    switch (status) {
      case "NEW": return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20"
      case "REVIEWED": return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20"
      case "ACTIONED": return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
    }
  }

  return (
    <div className="relative inline-flex items-center">
      <select
        value={optimisticStatus}
        onChange={handleChange}
        disabled={isPending}
        className={`appearance-none text-xs font-semibold px-2.5 py-1 pr-6 border rounded-full outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 transition-colors cursor-pointer ${getStatusColor(optimisticStatus)} ${isPending ? 'opacity-70 cursor-wait' : ''}`}
      >
        <option value="NEW">New</option>
        <option value="REVIEWED">Reviewed</option>
        <option value="ACTIONED">Actioned</option>
      </select>
      
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 text-zinc-500">
        <svg className="h-3 w-3 fill-current" viewBox="0 0 20 20">
          <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
        </svg>
      </div>

      {isPending && (
        <Loader2 className="absolute -right-5 w-4 h-4 text-zinc-400 animate-spin" />
      )}
    </div>
  )
}
