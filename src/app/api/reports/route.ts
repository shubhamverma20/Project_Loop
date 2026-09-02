import { NextResponse } from "next/server"
import { getReports } from "@/app/actions/insights"

export async function GET() {
  try {
    const result = await getReports()
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 })
  }
}
