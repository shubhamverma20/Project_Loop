"use client"

import { useState, useRef } from "react"
import { api } from "@/lib/api-client"
import {
  analyzeCsvHeaders,
  CsvHeaderAnalysis,
  detectDelimiter,
} from "@/lib/csv-schema"
import {
  UploadCloud,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ShoppingCart,
  MessageSquare,
} from "lucide-react"
import Papa from "papaparse"

interface ImportSummary {
  total: number
  successful: number
  failed: number
  skipped: number
}

const CHUNK_SIZE = 1000

export function CsvUploader() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<CsvHeaderAnalysis | null>(null)
  const [progress, setProgress] = useState(0)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]

    if (!file) return

    // CSV validation
    if (
      !file.name.toLowerCase().endsWith(".csv") &&
      file.type !== "text/csv"
    ) {
      setError("Invalid file type. Only CSV files (.csv) are supported.")
      setAnalysis(null)
      return
    }

    // 5 MB validation
    const MAX_SIZE_BYTES = 5 * 1024 * 1024

    if (file.size > MAX_SIZE_BYTES) {
      setError("File size exceeds 5MB limit.")
      setAnalysis(null)
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)
    setAnalysis(null)
    setProgress(0)

    const reader = new FileReader()

    reader.onload = (event) => {
      const text = (event.target?.result as string) || ""
      const delimiter = detectDelimiter(text)

      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        delimiter,
        transformHeader: (header) => header.replace(/^\uFEFF/, "").trim(),

        complete: async (results) => {
          try {
            const rawFields = results.meta.fields || []

            // Analyze CSV headers
            const headerAnalysis = analyzeCsvHeaders(rawFields)
            headerAnalysis.delimiter = delimiter

            setAnalysis(headerAnalysis)

            // Unsupported CSV
            if (headerAnalysis.datasetType === "UNSUPPORTED") {
              setError(
                "Unsupported CSV format. Please check your CSV columns."
              )
              setLoading(false)
              return
            }

            const parsedData = results.data as Record<string, any>[]
            const totalRows = parsedData.length

            if (totalRows === 0) {
              setError("CSV file is empty.")
              setLoading(false)
              return
            }

            console.log(`Total rows: ${totalRows}`)

            // Final summary
            let totalSuccessful = 0
            let totalFailed = 0
            let totalSkipped = 0

            // Calculate number of chunks
            const totalChunks = Math.ceil(totalRows / CHUNK_SIZE)

            // Upload chunks one by one
            for (let i = 0; i < totalRows; i += CHUNK_SIZE) {
              const chunk = parsedData.slice(i, i + CHUNK_SIZE)
              const chunkNumber = Math.floor(i / CHUNK_SIZE) + 1

              console.log(
                `Uploading chunk ${chunkNumber}/${totalChunks}`
              )

              try {
                const res = await api.post("/api/csv", {
                  rows: chunk,
                  type: headerAnalysis.datasetType,
                })

                if (res.error) {
                  console.error(
                    `Chunk ${chunkNumber} failed:`,
                    res.error
                  )
                  totalFailed += chunk.length
                  setError(
                    `Chunk ${chunkNumber}/${totalChunks} failed: ${res.error}`
                  )
                  continue
                }

                if (res.data?.summary) {
                  totalSuccessful += res.data.summary.successful || 0
                  totalFailed += res.data.summary.failed || 0
                  totalSkipped += res.data.summary.skipped || 0
                }
              } catch (chunkError) {
                console.error(
                  `Chunk ${chunkNumber} error:`,
                  chunkError
                )
                totalFailed += chunk.length
                continue
              }

              // Update progress
              const uploadedRows = Math.min(i + CHUNK_SIZE, totalRows)
              const currentProgress = Math.round(
                (uploadedRows / totalRows) * 100
              )
              setProgress(currentProgress)
            }

            // Final result
            setResult({
              total: totalRows,
              successful: totalSuccessful,
              failed: totalFailed,
              skipped: totalSkipped,
            })

            // If everything successful
            if (totalFailed === 0) {
              setError(null)
            } else {
              setError(`${totalFailed} rows could not be imported.`)
            }

            // Reset file input
            if (fileInputRef.current) {
              fileInputRef.current.value = ""
            }
          } catch (err) {
            console.error(err)
            setError("Failed to import parsed CSV data.")
          } finally {
            setLoading(false)
          }
        },

        error: (err) => {
          console.error(err)
          setError("Failed to parse CSV file: " + err.message)
          setLoading(false)
        },
      })
    }

    reader.readAsText(file)
  }

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm h-full flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
            <UploadCloud className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-zinc-900 dark:text-white">
            Smart CSV Importer
          </h3>
        </div>

        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
          Upload any Customer Feedback or E-Commerce Product CSV. Schemas are
          automatically detected and mapped.
        </p>

        {/* Upload Area */}
        <div className="flex items-center justify-center w-full mb-4">
          <label
            htmlFor="dropzone-file"
            className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
              loading
                ? "border-zinc-200 bg-zinc-50 cursor-not-allowed"
                : "border-zinc-300 bg-zinc-50 dark:hover:bg-zinc-800 dark:bg-zinc-900 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:border-zinc-600"
            }`}
          >
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              {loading ? (
                <Loader2 className="w-8 h-8 mb-3 text-blue-500 animate-spin" />
              ) : (
                <UploadCloud className="w-8 h-8 mb-3 text-zinc-400" />
              )}

              <p className="mb-2 text-sm text-zinc-500 dark:text-zinc-400">
                {loading ? (
                  <span>Uploading... {progress}%</span>
                ) : (
                  <>
                    <span className="font-semibold">Click to upload</span> or
                    drag and drop
                  </>
                )}
              </p>

              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Feedback or E-Commerce CSVs (Max 5MB)
              </p>
            </div>

            <input
              id="dropzone-file"
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileChange}
              disabled={loading}
            />
          </label>
        </div>

        {/* Progress Bar */}
        {loading && (
          <div className="mb-5">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-zinc-500">Importing CSV...</span>
              <span className="font-medium text-blue-600">{progress}%</span>
            </div>
            <div className="w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Schema Detection */}
        {analysis && (
          <div
            className={`mb-4 p-4 rounded-lg border text-sm ${
              analysis.datasetType === "CUSTOMER_FEEDBACK"
                ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200"
                : analysis.datasetType === "ECOMMERCE_PRODUCT"
                ? "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-900 dark:text-purple-200"
                : "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200"
            }`}
          >
            <div className="flex items-center space-x-2 font-semibold text-base mb-1">
              {analysis.datasetType === "CUSTOMER_FEEDBACK" && (
                <MessageSquare className="w-5 h-5 text-blue-600" />
              )}
              {analysis.datasetType === "ECOMMERCE_PRODUCT" && (
                <ShoppingCart className="w-5 h-5 text-purple-600" />
              )}
              {analysis.datasetType === "UNSUPPORTED" && (
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              )}
              <span>
                {analysis.datasetType === "CUSTOMER_FEEDBACK" &&
                  "Detected: Customer Feedback CSV"}
                {analysis.datasetType === "ECOMMERCE_PRODUCT" &&
                  "Detected: E-commerce Product CSV"}
                {analysis.datasetType === "UNSUPPORTED" &&
                  "Unsupported CSV Format"}
              </span>
            </div>

            {analysis.datasetType !== "UNSUPPORTED" ? (
              <div className="text-xs space-y-1 mt-2">
                <p>
                  <span className="font-semibold">Detected Headers:</span>{" "}
                  {analysis.rawHeaders.join(", ")}
                </p>
                {analysis.detectedFeedbackColumn && (
                  <p>
                    <span className="font-semibold">
                      Mapped Feedback Column:
                    </span>{" "}
                    <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">
                      {analysis.detectedFeedbackColumn}
                    </code>{" "}
                    →{" "}
                    <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">
                      content
                    </code>
                  </p>
                )}
                {analysis.detectedProductColumn && (
                  <p>
                    <span className="font-semibold">
                      Mapped Product Fields:
                    </span>{" "}
                    Name ({analysis.detectedProductColumn})
                    {analysis.detectedPriceColumn
                      ? `, Price (${analysis.detectedPriceColumn})`
                      : ""}
                    {analysis.detectedCategoryColumn
                      ? `, Category (${analysis.detectedCategoryColumn})`
                      : ""}
                    {analysis.detectedStockColumn
                      ? `, Stock (${analysis.detectedStockColumn})`
                      : ""}
                  </p>
                )}
              </div>
            ) : (
              <div className="text-xs space-y-2 mt-2">
                <p className="font-medium">
                  Found headers:{" "}
                  <code className="bg-amber-100 dark:bg-amber-800/60 px-1.5 py-0.5 rounded font-mono">
                    {analysis.rawHeaders.join(", ") || "(none)"}
                  </code>
                </p>
                <div className="bg-white/60 dark:bg-zinc-900/60 p-3 rounded border border-amber-200 dark:border-amber-800">
                  <p className="font-bold mb-2">Supported CSV Formats:</p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>
                      <span className="font-semibold">
                        Customer Feedback CSV:
                      </span>{" "}
                      Must include content, feedback, review, comment or
                      message.
                    </li>
                    <li>
                      <span className="font-semibold">
                        E-Commerce Product CSV:
                      </span>{" "}
                      Must include Product, Price, Category and Stock.
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-3 mb-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/50 rounded-lg flex items-start space-x-3 text-sm text-red-600 dark:text-red-400">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-900/50 rounded-lg text-sm space-y-2">
            <div className="flex items-center space-x-2 text-emerald-800 dark:text-emerald-300 font-medium">
              <CheckCircle2 className="w-5 h-5" />
              <span>Import Complete ({result.total} rows processed)</span>
            </div>
            <ul className="list-disc list-inside text-emerald-700 dark:text-emerald-400 space-y-1">
              <li>
                Successfully imported:{" "}
                <span className="font-bold">{result.successful}</span>
              </li>
              {result.skipped > 0 && (
                <li className="text-blue-600">
                  Skipped duplicates:{" "}
                  <span className="font-bold">{result.skipped}</span>
                </li>
              )}
              {result.failed > 0 && (
                <li className="text-amber-600">
                  Failed / Invalid:{" "}
                  <span className="font-bold">{result.failed}</span>
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}