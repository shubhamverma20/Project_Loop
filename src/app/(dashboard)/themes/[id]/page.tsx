import { verifySession } from "@/lib/auth/session"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Clock, MessageSquareQuote } from "lucide-react"

export default async function ThemeDrilldownPage({ params }: { params: { id: string } }) {
  const session = await verifySession()
  
  if (!session?.user?.workspaceId) {
    return <div className="p-4 bg-red-50 text-red-600 rounded-lg">Unauthorized</div>
  }

  const themeId = params.id
  const workspaceId = session.user.workspaceId

  // Security check: Must filter by workspaceId
  const theme = await prisma.theme.findFirst({
    where: { 
      id: themeId,
      workspaceId 
    },
    include: {
      feedbacks: {
        include: {
          feedback: true
        },
        orderBy: {
          feedback: { createdAt: 'desc' }
        }
      }
    }
  })

  if (!theme) {
    notFound()
  }

  const renderSentimentBadge = (sentiment: string | null) => {
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
    <div className="space-y-6 max-w-4xl mx-auto h-full flex flex-col">
      <div>
        <Link 
          href="/themes"
          className="inline-flex items-center space-x-2 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Themes</span>
        </Link>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">Theme: {theme.name}</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          {theme.feedbacks.length} items classified under this theme.
        </p>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm overflow-hidden">
        <div className="divide-y divide-zinc-200 dark:divide-zinc-800 max-h-[800px] overflow-y-auto">
          {theme.feedbacks.map(({ feedback }) => (
            <div key={feedback.id} className="p-6 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div className="mt-1 bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">
                    <MessageSquareQuote className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm text-zinc-900 dark:text-zinc-100 whitespace-pre-wrap">
                      {feedback.content}
                    </p>
                    {feedback.featureArea && (
                      <div className="mt-2 text-xs font-medium text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 px-2 py-1 rounded-md inline-block">
                        Feature Area: {feedback.featureArea}
                      </div>
                    )}
                    <div className="flex items-center space-x-4 text-xs text-zinc-500 dark:text-zinc-400 mt-3">
                      <span className="flex items-center space-x-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{new Date(feedback.createdAt).toLocaleDateString()}</span>
                      </span>
                      <span>•</span>
                      <span>Channel: {feedback.channel}</span>
                      {feedback.customerLabel && (
                        <>
                          <span>•</span>
                          <span>User: {feedback.customerLabel}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col items-end space-y-2 shrink-0 ml-4">
                  {renderSentimentBadge(feedback.sentiment)}
                </div>
              </div>
            </div>
          ))}

          {theme.feedbacks.length === 0 && (
            <div className="p-12 text-center text-zinc-500 dark:text-zinc-400">
              No feedback found for this theme.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
