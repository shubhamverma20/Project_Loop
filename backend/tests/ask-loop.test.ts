import { describe, it, expect } from "vitest"
import { askLoopGroundedQa } from "../src/services/ask-loop.js"

describe("Ask LOOP Grounded Q&A Unit Test", () => {
  it("should handle empty question input gracefully", async () => {
    const result = await askLoopGroundedQa("dummy-ws-id", "  ")
    expect(result.hasSufficientEvidence).toBe(false)
    expect(result.error).toBe("Question string is required")
  })
})
