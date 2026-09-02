import { EventEmitter } from "events"

export interface FeedbackEventPayload {
  workspaceId: string
  feedback: {
    id: string
    content: string
    channel: string
    category: string | null
    sentiment: string | null
    createdAt: Date | string
  }
}

class FeedbackEventEmitter extends EventEmitter {
  emitNewFeedback(payload: FeedbackEventPayload) {
    this.emit("new-feedback", payload)
  }
}

const globalForEvents = globalThis as unknown as {
  feedbackEvents?: FeedbackEventEmitter
}

export const feedbackEvents =
  globalForEvents.feedbackEvents || new FeedbackEventEmitter()

if (process.env.NODE_ENV !== "production") {
  globalForEvents.feedbackEvents = feedbackEvents
}
