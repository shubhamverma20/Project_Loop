export type CsvDatasetType = "CUSTOMER_FEEDBACK" | "ECOMMERCE_PRODUCT" | "UNSUPPORTED"

export interface CsvHeaderAnalysis {
  datasetType: CsvDatasetType
  rawHeaders: string[]
  normalizedHeaders: string[]
  detectedFeedbackColumn: string | null
  detectedProductColumn: string | null
  detectedPriceColumn: string | null
  detectedCategoryColumn: string | null
  detectedStockColumn: string | null
  detectedChannelColumn: string | null
  delimiter: string
  confidence: number
}

const FEEDBACK_HEADER_SYNONYMS = [
  "content", "feedback", "message", "comment", "review", "text", "description",
  "customer_feedback", "customer_comment", "customer_review", "user_feedback",
  "user_comment", "user_review", "feedback_text", "review_text", "comments",
  "reviews", "messages", "feedbacks", "details", "notes", "body", "issue", "opinion"
]

const CHANNEL_HEADER_SYNONYMS = ["channel", "source", "origin", "platform", "medium", "provider"]

const PRODUCT_HEADER_SYNONYMS = ["product", "title", "item", "name", "product_name", "productname", "item_name"]
const PRICE_HEADER_SYNONYMS = ["price", "cost", "amount", "unit_price", "unitprice", "msrp"]
const CATEGORY_HEADER_SYNONYMS = ["category", "department", "group", "type"]
const STOCK_HEADER_SYNONYMS = ["stock", "quantity", "qty", "inventory", "units"]

/**
 * Strips UTF-8 BOM, trims spaces, lowercases, and normalizes hyphens/underscores to clean strings
 */
export function normalizeHeaderString(header: string): string {
  if (!header) return ""
  return header
    .replace(/^\uFEFF/, "") // Strip BOM
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "_")
}

/**
 * Detect delimiter (comma or semicolon)
 */
export function detectDelimiter(csvText: string): string {
  const firstLine = csvText.split(/\r?\n/)[0] || ""
  const commaCount = (firstLine.match(/,/g) || []).length
  const semicolonCount = (firstLine.match(/;/g) || []).length
  return semicolonCount > commaCount ? ";" : ","
}

/**
 * Analyzes CSV header fields to detect schema type automatically
 */
export function analyzeCsvHeaders(headers: string[]): CsvHeaderAnalysis {
  const rawHeaders = headers.map(h => h.replace(/^\uFEFF/, "").trim())
  const normalizedHeaders = rawHeaders.map(normalizeHeaderString)

  let detectedFeedbackColumn: string | null = null
  let detectedProductColumn: string | null = null
  let detectedPriceColumn: string | null = null
  let detectedCategoryColumn: string | null = null
  let detectedStockColumn: string | null = null
  let detectedChannelColumn: string | null = null

  // Pass 1: Exact Synonym Match
  for (let i = 0; i < normalizedHeaders.length; i++) {
    const norm = normalizedHeaders[i]
    if (FEEDBACK_HEADER_SYNONYMS.includes(norm)) {
      detectedFeedbackColumn = rawHeaders[i]
      break
    }
  }

  // Pass 2: Partial Keyword Match
  if (!detectedFeedbackColumn) {
    for (let i = 0; i < normalizedHeaders.length; i++) {
      const norm = normalizedHeaders[i]
      if (FEEDBACK_HEADER_SYNONYMS.some(syn => norm.includes(syn))) {
        detectedFeedbackColumn = rawHeaders[i]
        break
      }
    }
  }

  // Check Channel Synonyms
  for (let i = 0; i < normalizedHeaders.length; i++) {
    const norm = normalizedHeaders[i]
    if (CHANNEL_HEADER_SYNONYMS.some(syn => norm === syn || norm.includes(syn))) {
      detectedChannelColumn = rawHeaders[i]
      break
    }
  }

  // Check Product Synonyms
  for (let i = 0; i < normalizedHeaders.length; i++) {
    const norm = normalizedHeaders[i]
    if (PRODUCT_HEADER_SYNONYMS.some(syn => norm === syn || norm.includes("product"))) {
      detectedProductColumn = rawHeaders[i]
      break
    }
  }

  // Check Price Synonyms
  for (let i = 0; i < normalizedHeaders.length; i++) {
    const norm = normalizedHeaders[i]
    if (PRICE_HEADER_SYNONYMS.some(syn => norm === syn)) {
      detectedPriceColumn = rawHeaders[i]
      break
    }
  }

  // Check Category Synonyms
  for (let i = 0; i < normalizedHeaders.length; i++) {
    const norm = normalizedHeaders[i]
    if (CATEGORY_HEADER_SYNONYMS.some(syn => norm === syn)) {
      detectedCategoryColumn = rawHeaders[i]
      break
    }
  }

  // Check Stock Synonyms
  for (let i = 0; i < normalizedHeaders.length; i++) {
    const norm = normalizedHeaders[i]
    if (STOCK_HEADER_SYNONYMS.some(syn => norm === syn)) {
      detectedStockColumn = rawHeaders[i]
      break
    }
  }

  // Determine Dataset Type
  let datasetType: CsvDatasetType = "UNSUPPORTED"
  let confidence = 0

  if (detectedFeedbackColumn) {
    datasetType = "CUSTOMER_FEEDBACK"
    confidence = 0.95
  } else if (detectedProductColumn && (detectedPriceColumn || detectedCategoryColumn || detectedStockColumn)) {
    datasetType = "ECOMMERCE_PRODUCT"
    confidence = 0.90
  } else if (detectedProductColumn || detectedPriceColumn) {
    datasetType = "ECOMMERCE_PRODUCT"
    confidence = 0.70
  }

  return {
    datasetType,
    rawHeaders,
    normalizedHeaders,
    detectedFeedbackColumn,
    detectedProductColumn,
    detectedPriceColumn,
    detectedCategoryColumn,
    detectedStockColumn,
    detectedChannelColumn,
    delimiter: ",",
    confidence
  }
}
