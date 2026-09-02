import { processSingleFeedback } from "./ingestion.js"
import { z } from "zod"

const FEEDBACK_SYNONYMS = [
  "content", "feedback", "message", "comment", "review", "text", "description",
  "customer_feedback", "customer_comment", "customer_review", "user_feedback",
  "user_comment", "user_review", "feedback_text", "review_text", "comments",
  "reviews", "messages", "feedbacks", "details", "notes", "body", "issue", "opinion"
]
const CHANNEL_SYNONYMS = ["channel", "source", "origin", "platform", "medium", "provider"]
const CUSTOMER_SYNONYMS = ["customerlabel", "customer_label", "customer", "user", "label"]
const REF_SYNONYMS = ["sourceref", "source_ref", "ref", "ticket_id", "id"]

const PRODUCT_SYNONYMS = ["product", "title", "item", "name", "product_name", "productname", "item_name"]
const PRICE_SYNONYMS = ["price", "cost", "amount", "unit_price", "unitprice"]
const CATEGORY_SYNONYMS = ["category", "department", "group", "type"]
const STOCK_SYNONYMS = ["stock", "quantity", "qty", "inventory"]

export interface CsvImportSummary {
  total: number
  successful: number
  skipped: number
  failed: number
  detectedType: "FEEDBACK" | "ECOMMERCE_PRODUCT" | "UNKNOWN"
}

export async function processCsvUpload(rows: Array<Record<string, any>>, workspaceId: string, forcedType?: string) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return { success: false, error: "CSV file is empty or invalid" }
  }

  // Detect Headers
  const firstRow = rows[0]
  const rawHeaders = Object.keys(firstRow)
  const normalizedHeaders = rawHeaders.map(h => h.trim().toLowerCase().replace(/[^a-z0-9_]/g, ""))

  let feedbackKey = rawHeaders.find((_, i) => FEEDBACK_SYNONYMS.includes(normalizedHeaders[i]))
  let productKey = rawHeaders.find((_, i) => PRODUCT_SYNONYMS.includes(normalizedHeaders[i]))

  let csvType: "FEEDBACK" | "ECOMMERCE_PRODUCT" | "UNKNOWN" = "UNKNOWN"
  if (forcedType === "ECOMMERCE_PRODUCT" || (!feedbackKey && productKey)) {
    csvType = "ECOMMERCE_PRODUCT"
  } else if (feedbackKey || forcedType === "FEEDBACK") {
    csvType = "FEEDBACK"
  }

  if (csvType === "UNKNOWN") {
    return {
      success: false,
      error: `Unrecognized CSV Header Schema. Detected headers: [${rawHeaders.join(", ")}]. Expected columns like 'content', 'feedback', 'message', 'review', or 'product'.`,
      detectedHeaders: rawHeaders
    }
  }

  let channelKey = rawHeaders.find((_, i) => CHANNEL_SYNONYMS.includes(normalizedHeaders[i]))
  let customerKey = rawHeaders.find((_, i) => CUSTOMER_SYNONYMS.includes(normalizedHeaders[i]))
  let refKey = rawHeaders.find((_, i) => REF_SYNONYMS.includes(normalizedHeaders[i]))

  let priceKey = rawHeaders.find((_, i) => PRICE_SYNONYMS.includes(normalizedHeaders[i]))
  let categoryKey = rawHeaders.find((_, i) => CATEGORY_SYNONYMS.includes(normalizedHeaders[i]))
  let stockKey = rawHeaders.find((_, i) => STOCK_SYNONYMS.includes(normalizedHeaders[i]))

  let successful = 0
  let skipped = 0
  let failed = 0

  for (const row of rows) {
    let contentToProcess = ""
    let channelVal = "CSV Import"
    let customerVal: string | null = null
    let refVal: string | null = null

    if (csvType === "FEEDBACK") {
      contentToProcess = feedbackKey ? String(row[feedbackKey] || "").trim() : ""
      channelVal = channelKey ? String(row[channelKey] || "").trim() || "CSV Import" : "CSV Import"
      customerVal = customerKey ? String(row[customerKey] || "").trim() || null : null
      refVal = refKey ? String(row[refKey] || "").trim() || null : null
    } else {
      const prod = productKey ? String(row[productKey] || "").trim() : ""
      const price = priceKey ? String(row[priceKey] || "").trim() : ""
      const cat = categoryKey ? String(row[categoryKey] || "").trim() : ""
      const stock = stockKey ? String(row[stockKey] || "").trim() : ""

      if (prod) {
        contentToProcess = `Product Feedback: ${prod}`
        if (cat) contentToProcess += ` (Category: ${cat})`
        if (price) contentToProcess += ` [Price: $${price}]`
        if (stock) contentToProcess += ` [In Stock: ${stock}]`
        channelVal = "E-Commerce Catalog"
      }
    }

    if (!contentToProcess) {
      failed++
      continue
    }

    try {
      const result = await processSingleFeedback({
        content: contentToProcess,
        channel: channelVal,
        customerLabel: customerVal,
        sourceRef: refVal,
        workspaceId
      })

      if (result.duplicate) {
        skipped++
      } else {
        successful++
      }
    } catch {
      failed++
    }
  }

  const summary: CsvImportSummary = {
    total: rows.length,
    successful,
    skipped,
    failed,
    detectedType: csvType
  }

  return {
    success: true,
    message: `Successfully processed ${summary.total} row(s): ${summary.successful} inserted, ${summary.skipped} duplicates skipped, ${summary.failed} invalid.`,
    summary
  }
}
