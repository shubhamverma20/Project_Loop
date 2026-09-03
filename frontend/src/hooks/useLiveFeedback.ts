"use client"

import { useEffect, useState, useCallback, useRef } from "react"

export interface LiveFeedbackItem {
  id: string
  content: string
  channel: string
  category: string | null
  sentiment: string | null
  createdAt: Date | string
}

export function useLiveFeedback(onNewFeedbackReceived?: (item: LiveFeedbackItem) => void) {
  const [liveItems, setLiveItems] = useState<LiveFeedbackItem[]>([])
  const [newCount, setNewCount] = useState(0)
  const [connected, setConnected] = useState(false)
  const eventSourceRef = useRef<EventSource | null>(null)

  const clearNewCount = useCallback(() => {
    setNewCount(0)
  }, [])

  useEffect(() => {
    let es: EventSource | null = null
    const defaultApiUrl = process.env.NODE_ENV === "production" ? "https://project-loop-llid.onrender.com" : "http://localhost:5000"
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || defaultApiUrl
    const savedToken = typeof window !== "undefined" ? localStorage.getItem("session_token") : ""

    try {
      const streamUrl = `${apiUrl}/api/feedback/stream${savedToken ? `?token=${encodeURIComponent(savedToken)}` : ""}`
      es = new EventSource(streamUrl, { withCredentials: true })
      eventSourceRef.current = es

      es.onopen = () => {
        setConnected(true)
      }

      es.addEventListener("feedback", (e: MessageEvent) => {
        try {
          const item: LiveFeedbackItem = JSON.parse(e.data)
          setLiveItems(prev => {
            if (prev.some(x => x.id === item.id)) return prev
            return [item, ...prev]
          })
          setNewCount(prev => prev + 1)
          if (onNewFeedbackReceived) {
            onNewFeedbackReceived(item)
          }
        } catch (err) {
          console.error("Error parsing live feedback SSE event:", err)
        }
      })

      es.onerror = () => {
        setConnected(false)
      }
    } catch (err) {
      console.warn("EventSource not supported or failed to initialize:", err)
    }

    return () => {
      if (es) {
        es.close()
      }
    }
  }, [onNewFeedbackReceived])

  return {
    liveItems,
    newCount,
    connected,
    clearNewCount
  }
}
