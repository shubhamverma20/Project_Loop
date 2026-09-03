import { NextRequest, NextResponse } from "next/server"

const defaultApiUrl = process.env.NODE_ENV === "production"
  ? "https://project-loop-llid.onrender.com"
  : "http://localhost:5000"

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || defaultApiUrl

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const headers = new Headers()

    const contentType = req.headers.get("content-type")
    if (contentType) headers.set("Content-Type", contentType)

    const authorization = req.headers.get("authorization")
    if (authorization) headers.set("Authorization", authorization)

    const apiKey = req.headers.get("x-api-key")
    if (apiKey) headers.set("X-Api-Key", apiKey)

    const cookie = req.headers.get("cookie")
    if (cookie) headers.set("Cookie", cookie)

    const backendRes = await fetch(`${BACKEND_URL}/api/feedback`, {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    })

    const data = await backendRes.json()
    return NextResponse.json(data, { status: backendRes.status })
  } catch (error: any) {
    console.error("Next.js API route error [/api/feedback]:", error)
    return NextResponse.json(
      { error: error?.message || "Failed to communicate with feedback ingestion service" },
      { status: 500 }
    )
  }
}
