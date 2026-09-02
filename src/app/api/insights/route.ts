import { NextResponse } from "next/server"
import { generateInsightsReport } from "@/app/actions/insights"

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { range, customStart, customEnd } = body
    const result = await generateInsightsReport(range, customStart, customEnd)
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: "Failed to generate AI insights" }, { status: 500 })
  }
}
