import { describe, it, expect } from "vitest"
import { generateEmbedding } from "../src/lib/embeddings.js"

describe("Embeddings Unit Test", () => {
  it("should generate a 768-dimensional vector embedding", async () => {
    const vector = await generateEmbedding("Test customer feedback for vector search")
    expect(Array.isArray(vector)).toBe(true)
    expect(vector.length).toBe(768)
  })
})
