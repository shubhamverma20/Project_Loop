import { NextRequest, NextResponse } from "next/server"

const defaultApiUrl = process.env.NODE_ENV === "production"
  ? "https://project-loop-llid.onrender.com"
  : "http://localhost:5000"

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || defaultApiUrl

async function proxyRequest(req: NextRequest, { params }: { params: { path: string[] } }) {
  try {
    const pathStr = (params.path || []).join("/")
    const searchParams = req.nextUrl.search || ""
    const targetUrl = `${BACKEND_URL}/api/${pathStr}${searchParams}`

    const headers = new Headers()
    req.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase()
      if (lowerKey !== "host" && lowerKey !== "content-length") {
        headers.set(key, value)
      }
    })

    let body: any = null
    if (req.method !== "GET" && req.method !== "HEAD") {
      body = await req.text()
    }

    const backendRes = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: body || undefined,
      cache: "no-store"
    })

    const contentType = backendRes.headers.get("content-type")
    if (contentType && contentType.includes("application/json")) {
      const data = await backendRes.json()
      return NextResponse.json(data, { status: backendRes.status })
    }

    const textData = await backendRes.text()
    return new NextResponse(textData, {
      status: backendRes.status,
      headers: { "Content-Type": contentType || "text/plain" }
    })
  } catch (error: any) {
    console.error(`Next.js API Proxy Error [${req.method} /api/${params?.path?.join("/")}]:`, error)
    return NextResponse.json(
      { error: error?.message || "Failed to communicate with backend service" },
      { status: 500 }
    )
  }
}

export const GET = proxyRequest
export const POST = proxyRequest
export const PUT = proxyRequest
export const DELETE = proxyRequest
export const PATCH = proxyRequest
