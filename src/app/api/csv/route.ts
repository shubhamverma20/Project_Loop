import { NextResponse } from "next/server"
import { bulkImportFeedback } from "@/app/actions/ingestion"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { data, datasetType } = body
    if (!data) {
      return NextResponse.json({ error: "Missing CSV data payload" }, { status: 400 })
    }
    const result = await bulkImportFeedback(data, datasetType)
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: "Failed to process CSV import request" }, { status: 500 })
  }
}
