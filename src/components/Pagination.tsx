"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useCallback } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface PaginationProps {
  currentPage: number
  totalPages: number
  totalItems: number
  limit: number
}

export function Pagination({ currentPage, totalPages, totalItems, limit }: PaginationProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set(name, value)
      return params.toString()
    },
    [searchParams]
  )

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      router.push("?" + createQueryString("page", newPage.toString()))
    }
  }

  const startItem = (currentPage - 1) * limit + 1
  const endItem = Math.min(currentPage * limit, totalItems)

  if (totalItems === 0) return null

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 sm:px-6">
      <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-zinc-700 dark:text-zinc-400">
            Showing <span className="font-medium text-zinc-900 dark:text-white">{startItem}</span> to <span className="font-medium text-zinc-900 dark:text-white">{endItem}</span> of{" "}
            <span className="font-medium text-zinc-900 dark:text-white">{totalItems}</span> results
          </p>
        </div>
        <div>
          <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm font-medium text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <span className="sr-only">Previous</span>
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            
            <span className="relative inline-flex items-center px-4 py-2 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm font-medium text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <span className="sr-only">Next</span>
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </nav>
        </div>
      </div>
    </div>
  )
}
