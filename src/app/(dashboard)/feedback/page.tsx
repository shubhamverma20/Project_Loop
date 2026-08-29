import { searchFeedback } from "@/app/actions/explorer"
import { AdvancedFilters } from "@/components/AdvancedFilters"
import { StatusDropdown } from "@/components/StatusDropdown"
import { Pagination } from "@/components/Pagination"
// ReclassifyButton removed
import { Sentiment } from "@prisma/client"
import { Clock, Tag } from "lucide-react"

export default async function FeedbackInboxPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined }
}) {
  const page = parseInt(searchParams.page || "1", 10)
  const limit = 10
  
  const query = searchParams.query
  const category = searchParams.category
  const sentiment = searchParams.sentiment
  const channel = searchParams.channel

  let feedback: any[] = [] // eslint-disable-line @typescript-eslint/no-explicit-any
  let totalCount = 0
  let error = null

  try {
    const res = await searchFeedback({
      query,
      category,
      sentiment,
      channel
    }, page, limit)
    feedback = res.data
    totalCount = res.total
  } catch (err: unknown) {
    if (err instanceof Error) {
      error = err.message
    } else {
      error = "Failed to search feedback"
    }
  }

  const totalPages = Math.ceil((totalCount || 0) / limit)

  const renderSentimentBadge = (sentiment: Sentiment | null) => {
    switch (sentiment) {
      case "POS":
        return <span className="px-2 py-1 text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 rounded-full">Positive</span>
      case "NEG":
        return <span className="px-2 py-1 text-xs font-medium bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300 rounded-full">Negative</span>
      case "NEU":
        return <span className="px-2 py-1 text-xs font-medium bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300 rounded-full">Neutral</span>
      default:
        return <span className="px-2 py-1 text-xs font-medium bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300 rounded-full">Unrated</span>
    }
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto h-full flex flex-col">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">Feedback Explorer</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Search and analyze feedback semantically.
        </p>
      </div>

      <AdvancedFilters />

      {error ? (
        <div className="p-4 bg-red-50 text-red-600 rounded-lg border border-red-200">
          {error}
        </div>
      ) : (
        <div className="flex flex-col flex-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm overflow-hidden">
          <div className="flex-1 overflow-auto">
            <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
              <thead className="bg-zinc-50 dark:bg-zinc-900 sticky top-0 z-10">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Content</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Category</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Channel</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Sentiment</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Date</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-zinc-900 divide-y divide-zinc-200 dark:divide-zinc-800">
                {feedback?.map((item) => (
                  <tr key={item.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group">
                    <td className="px-6 py-4">
                      <p className="text-sm text-zinc-900 dark:text-zinc-100 max-w-md line-clamp-3" title={item.content}>
                        {item.content}
                      </p>
                      {item.customerLabel && (
                        <p className="text-xs text-zinc-500 mt-2">Source: {item.customerLabel}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {item.category && (
                        <div className="flex items-center space-x-1 text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded-md max-w-max">
                          <Tag className="w-3 h-3" />
                          <span>{item.category}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500 dark:text-zinc-400">
                      {item.channel}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {renderSentimentBadge(item.sentiment)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500 dark:text-zinc-400">
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusDropdown id={item.id} currentStatus={item.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {(!feedback || feedback.length === 0) && (
              <div className="p-12 text-center text-zinc-500 dark:text-zinc-400 flex flex-col items-center">
                <p className="font-medium text-zinc-900 dark:text-white">No feedback found</p>
                <p className="text-sm mt-1">Try adjusting your filters or semantic search query.</p>
              </div>
            )}
          </div>
          
          <Pagination 
            currentPage={page} 
            totalPages={totalPages} 
            totalItems={totalCount || 0} 
            limit={limit} 
          />
        </div>
      )}
    </div>
  )
}
