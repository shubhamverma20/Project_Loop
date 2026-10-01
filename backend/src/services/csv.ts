import { processSingleFeedback } from "./ingestion.js"

const FEEDBACK_SYNONYMS = [
  "content",
  "feedback",
  "message",
  "comment",
  "review",
  "text",
  "description",
  "customer_feedback",
  "customer_comment",
  "customer_review",
  "user_feedback",
  "user_comment",
  "user_review",
  "feedback_text",
  "review_text",
  "comments",
  "reviews",
  "messages",
  "feedbacks",
  "details",
  "notes",
  "body",
  "issue",
  "opinion",
]

const CHANNEL_SYNONYMS = [
  "channel",
  "source",
  "origin",
  "platform",
  "medium",
  "provider",
]

const CUSTOMER_SYNONYMS = [
  "customerlabel",
  "customer_label",
  "customer",
  "user",
  "label",
]

const REF_SYNONYMS = [
  "sourceref",
  "source_ref",
  "ref",
  "ticket_id",
  "id",
]

const PRODUCT_SYNONYMS = [
  "product",
  "title",
  "item",
  "name",
  "product_name",
  "productname",
  "item_name",
]

const PRICE_SYNONYMS = [
  "price",
  "cost",
  "amount",
  "unit_price",
  "unitprice",
]

const CATEGORY_SYNONYMS = [
  "category",
  "department",
  "group",
  "type",
]

const STOCK_SYNONYMS = [
  "stock",
  "quantity",
  "qty",
  "inventory",
]

export interface CsvImportSummary {
  total: number
  successful: number
  skipped: number
  failed: number
  detectedType: "FEEDBACK" | "ECOMMERCE_PRODUCT" | "UNKNOWN"
}

// Maximum rows accepted in one API request
const MAX_ROWS_PER_REQUEST = 1000

// Number of rows processed simultaneously
const CONCURRENCY = 3

export async function processCsvUpload(
  rows: Array<Record<string, any>>,
  workspaceId: string,
  forcedType?: string
) {
  // -----------------------------------------
  // BASIC VALIDATION
  // -----------------------------------------

  if (!Array.isArray(rows) || rows.length === 0) {
    return {
      success: false,
      error: "CSV file is empty or invalid",
    }
  }

  if (rows.length > MAX_ROWS_PER_REQUEST) {
    return {
      success: false,
      error: `Maximum ${MAX_ROWS_PER_REQUEST} rows allowed per request. Please upload CSV in chunks.`,
    }
  }

  if (!workspaceId) {
    return {
      success: false,
      error: "Workspace ID is required",
    }
  }

  // -----------------------------------------
  // DETECT HEADERS
  // -----------------------------------------

  const firstRow = rows[0]

  const rawHeaders = Object.keys(firstRow)

  const normalizedHeaders = rawHeaders.map((h) =>
    h
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "")
  )

  // -----------------------------------------
  // FIND COLUMNS
  // -----------------------------------------

  const feedbackKey = rawHeaders.find(
    (_, i) =>
      FEEDBACK_SYNONYMS.includes(
        normalizedHeaders[i]
      )
  )

  const productKey = rawHeaders.find(
    (_, i) =>
      PRODUCT_SYNONYMS.includes(
        normalizedHeaders[i]
      )
  )

  const channelKey = rawHeaders.find(
    (_, i) =>
      CHANNEL_SYNONYMS.includes(
        normalizedHeaders[i]
      )
  )

  const customerKey = rawHeaders.find(
    (_, i) =>
      CUSTOMER_SYNONYMS.includes(
        normalizedHeaders[i]
      )
  )

  const refKey = rawHeaders.find(
    (_, i) =>
      REF_SYNONYMS.includes(
        normalizedHeaders[i]
      )
  )

  const priceKey = rawHeaders.find(
    (_, i) =>
      PRICE_SYNONYMS.includes(
        normalizedHeaders[i]
      )
  )

  const categoryKey = rawHeaders.find(
    (_, i) =>
      CATEGORY_SYNONYMS.includes(
        normalizedHeaders[i]
      )
  )

  const stockKey = rawHeaders.find(
    (_, i) =>
      STOCK_SYNONYMS.includes(
        normalizedHeaders[i]
      )
  )

  // -----------------------------------------
  // DETECT CSV TYPE
  // -----------------------------------------

  let csvType:
    | "FEEDBACK"
    | "ECOMMERCE_PRODUCT"
    | "UNKNOWN" = "UNKNOWN"

  if (
    forcedType === "ECOMMERCE_PRODUCT" ||
    (!feedbackKey && productKey)
  ) {
    csvType = "ECOMMERCE_PRODUCT"
  } else if (
    feedbackKey ||
    forcedType === "FEEDBACK"
  ) {
    csvType = "FEEDBACK"
  }

  // -----------------------------------------
  // UNKNOWN FORMAT
  // -----------------------------------------

  if (csvType === "UNKNOWN") {
    return {
      success: false,
      error:
        `Unrecognized CSV Header Schema. ` +
        `Detected headers: [${rawHeaders.join(", ")}]. ` +
        `Expected columns like 'content', 'feedback', ` +
        `'message', 'review', or 'product'.`,
      detectedHeaders: rawHeaders,
    }
  }

  // -----------------------------------------
  // PROCESS SINGLE ROW
  // -----------------------------------------

  const processRow = async (
    row: Record<string, any>
  ) => {
    let contentToProcess = ""

    let channelVal = "CSV Import"

    let customerVal: string | null = null

    let refVal: string | null = null

    // ---------------------------------------
    // FEEDBACK CSV
    // ---------------------------------------

    if (csvType === "FEEDBACK") {
      contentToProcess = feedbackKey
        ? String(row[feedbackKey] || "").trim()
        : ""

      channelVal = channelKey
        ? String(row[channelKey] || "").trim() ||
          "CSV Import"
        : "CSV Import"

      customerVal = customerKey
        ? String(row[customerKey] || "").trim() ||
          null
        : null

      refVal = refKey
        ? String(row[refKey] || "").trim() ||
          null
        : null
    }

    // ---------------------------------------
    // E-COMMERCE CSV
    // ---------------------------------------

    else {
      const product = productKey
        ? String(row[productKey] || "").trim()
        : ""

      const price = priceKey
        ? String(row[priceKey] || "").trim()
        : ""

      const category = categoryKey
        ? String(row[categoryKey] || "").trim()
        : ""

      const stock = stockKey
        ? String(row[stockKey] || "").trim()
        : ""

      if (product) {
        contentToProcess =
          `Product Feedback: ${product}`

        if (category) {
          contentToProcess +=
            ` (Category: ${category})`
        }

        if (price) {
          contentToProcess +=
            ` [Price: $${price}]`
        }

        if (stock) {
          contentToProcess +=
            ` [In Stock: ${stock}]`
        }

        channelVal = "E-Commerce Catalog"
      }
    }

    // ---------------------------------------
    // INVALID ROW
    // ---------------------------------------

    if (!contentToProcess) {
      return {
        status: "failed" as const,
      }
    }

    // ---------------------------------------
    // PROCESS DATABASE OPERATION
    // ---------------------------------------

    try {
      const result =
        await processSingleFeedback({
          content: contentToProcess,
          channel: channelVal,
          customerLabel: customerVal,
          sourceRef: refVal,
          workspaceId,
        })

      if (result.duplicate) {
        return {
          status: "skipped" as const,
        }
      }

      return {
        status: "successful" as const,
      }
    } catch (error) {
      console.error(
        "CSV row processing error:",
        error
      )

      return {
        status: "failed" as const,
      }
    }
  }

  // -----------------------------------------
  // PARALLEL PROCESSING
  // -----------------------------------------

  let successful = 0
  let skipped = 0
  let failed = 0

  for (
    let i = 0;
    i < rows.length;
    i += CONCURRENCY
  ) {
    const batch = rows.slice(
      i,
      i + CONCURRENCY
    )

    const results =
      await Promise.all(
        batch.map((row) =>
          processRow(row)
        )
      )

    for (const result of results) {
      if (result.status === "successful") {
        successful++
      } else if (result.status === "skipped") {
        skipped++
      } else {
        failed++
      }
    }
  }

  // -----------------------------------------
  // FINAL SUMMARY
  // -----------------------------------------

  const summary: CsvImportSummary = {
    total: rows.length,
    successful,
    skipped,
    failed,
    detectedType: csvType,
  }

  return {
    success: true,

    message:
      `Successfully processed ${summary.total} row(s): ` +
      `${summary.successful} inserted, ` +
      `${summary.skipped} duplicates skipped, ` +
      `${summary.failed} invalid.`,

    summary,
  }
}