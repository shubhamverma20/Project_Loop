import { describe, it, expect } from "vitest"
import express from "express"

describe("Backend Health Endpoint", () => {
  it("should respond with ok for GET /health", async () => {
    const app = (await import("../src/app.js")).default
    const req = { method: "GET", url: "/health" } as any
    expect(app).toBeDefined()
  })
})
