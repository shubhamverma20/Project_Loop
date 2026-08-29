"use client"

import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { useTransition } from "react"
import { Search } from "lucide-react"

export function AdvancedFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    // reset to page 1 on filter change
    params.set("page", "1")

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`)
    })
  }

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 mb-6 shadow-sm space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
        <input
          type="text"
          placeholder="Semantic Search (e.g. 'users complaining about payment')"
          defaultValue={searchParams.get("query") || ""}
          onChange={(e) => handleFilterChange("query", e.target.value)}
          className="w-full pl-9 pr-4 py-2 bg-zinc-50 dark:bg-zinc-800 border-none rounded-lg text-sm focus:ring-2 focus:ring-blue-500 transition-shadow"
        />
      </div>
      
      <div className="flex flex-wrap gap-3">
        <select
          value={searchParams.get("category") || ""}
          onChange={(e) => handleFilterChange("category", e.target.value)}
          className="bg-zinc-50 dark:bg-zinc-800 border-none rounded-lg text-sm px-3 py-1.5 focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Categories</option>
          <option value="Bug">Bug</option>
          <option value="Feature Request">Feature Request</option>
          <option value="Complaint">Complaint</option>
          <option value="Praise">Praise</option>
          <option value="Question">Question</option>
          <option value="Other">Other</option>
        </select>

        <select
          value={searchParams.get("sentiment") || ""}
          onChange={(e) => handleFilterChange("sentiment", e.target.value)}
          className="bg-zinc-50 dark:bg-zinc-800 border-none rounded-lg text-sm px-3 py-1.5 focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Sentiments</option>
          <option value="POS">Positive</option>
          <option value="NEU">Neutral</option>
          <option value="NEG">Negative</option>
        </select>

        <select
          value={searchParams.get("channel") || ""}
          onChange={(e) => handleFilterChange("channel", e.target.value)}
          className="bg-zinc-50 dark:bg-zinc-800 border-none rounded-lg text-sm px-3 py-1.5 focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Channels</option>
          <option value="Twitter">Twitter</option>
          <option value="App Store">App Store</option>
          <option value="Support">Support</option>
          <option value="Intercom">Intercom</option>
          <option value="Typeform">Typeform</option>
        </select>
      </div>
      {isPending && <p className="text-xs text-blue-500 animate-pulse">Updating results...</p>}
    </div>
  )
}
