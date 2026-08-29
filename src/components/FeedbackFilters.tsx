"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useCallback, useState, useEffect } from "react"
import { Search } from "lucide-react"

export function FeedbackFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const currentSearch = searchParams.get("search") || ""
  const currentStatus = searchParams.get("status") || "ALL"
  const currentSentiment = searchParams.get("sentiment") || "ALL"

  const [searchTerm, setSearchTerm] = useState(currentSearch)

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value === "ALL" || value === "") {
        params.delete(name)
      } else {
        params.set(name, value)
      }
      params.delete("page") // Reset to page 1 on filter change
      return params.toString()
    },
    [searchParams]
  )

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchTerm !== currentSearch) {
        router.push("?" + createQueryString("search", searchTerm))
      }
    }, 400) // 400ms debounce

    return () => clearTimeout(delayDebounceFn)
  }, [searchTerm, currentSearch, createQueryString, router])

  return (
    <div className="flex flex-col md:flex-row md:items-center space-y-3 md:space-y-0 md:space-x-4 bg-white dark:bg-zinc-900 p-4 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm mb-6">
      <div className="relative flex-1">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-zinc-400" />
        </div>
        <input
          type="text"
          placeholder="Search feedback..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="block w-full pl-10 pr-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-950 text-sm focus:ring-blue-500 focus:border-blue-500 dark:text-white"
        />
      </div>

      <div className="flex items-center space-x-3">
        <select
          value={currentStatus}
          onChange={(e) => router.push("?" + createQueryString("status", e.target.value))}
          className="block w-full py-2 pl-3 pr-8 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-950 text-sm focus:ring-blue-500 focus:border-blue-500 dark:text-white"
        >
          <option value="ALL">All Statuses</option>
          <option value="NEW">New</option>
          <option value="REVIEWED">Reviewed</option>
          <option value="ACTIONED">Actioned</option>
        </select>

        <select
          value={currentSentiment}
          onChange={(e) => router.push("?" + createQueryString("sentiment", e.target.value))}
          className="block w-full py-2 pl-3 pr-8 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-950 text-sm focus:ring-blue-500 focus:border-blue-500 dark:text-white"
        >
          <option value="ALL">All Sentiments</option>
          <option value="POS">Positive</option>
          <option value="NEU">Neutral</option>
          <option value="NEG">Negative</option>
        </select>
      </div>
    </div>
  )
}
