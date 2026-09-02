"use client"

import { useState, useRef } from "react"
import { bulkImportFeedback } from "@/app/actions/ingestion"
import { analyzeCsvHeaders, CsvHeaderAnalysis, detectDelimiter } from "@/lib/csv-schema"
import { UploadCloud, Loader2, CheckCircle2, AlertTriangle, ShoppingCart, MessageSquare } from "lucide-react"
import Papa from "papaparse"

interface ImportSummary {
  total: number
  successful: number
  failed: number
  skipped: number
}

export function CsvUploader() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<CsvHeaderAnalysis | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 1. Validate File Extension
    if (!file.name.toLowerCase().endsWith(".csv") && file.type !== "text/csv") {
      setError("Invalid file type. Only CSV files (.csv) are supported.")
      setAnalysis(null)
      return
    }

    // 2. Validate File Size (Max 5MB)
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

    // Read first chunk to detect delimiter and headers
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string || ""
      const delimiter = detectDelimiter(text)

      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        delimiter: delimiter,
        transformHeader: (header) => header.replace(/^\uFEFF/, "").trim(),
        complete: async (results) => {
          try {
            const rawFields = results.meta.fields || []
            const headerAnalysis = analyzeCsvHeaders(rawFields)
            headerAnalysis.delimiter = delimiter
            setAnalysis(headerAnalysis)

            if (headerAnalysis.datasetType === "UNSUPPORTED") {
              setLoading(false)
              return
            }

            const parsedData = results.data
            const res = await bulkImportFeedback(parsedData, headerAnalysis.datasetType)
            
            if (res.error) {
              setError(res.error)
            } else if (res.summary) {
              setResult(res.summary)
              if (fileInputRef.current) {
                fileInputRef.current.value = "" // reset input
              }
            }
          } catch {
            setError("Failed to import parsed CSV data.")
          } finally {
            setLoading(false)
          }
        },
        error: (err) => {
          setError("Failed to parse CSV file: " + err.message)
          setLoading(false)
        }
      })
    }
    reader.readAsText(file.slice(0, 10240)) // Read first 10KB for analysis
  }

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm h-full">
      <div className="flex items-center space-x-3 mb-4">
        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
          <UploadCloud className="w-5 h-5" />
        </div>
        <h3 className="font-semibold text-zinc-900 dark:text-white">Smart CSV Importer</h3>
      </div>
      
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
        Upload any Customer Feedback or E-Commerce Product CSV. Schemas are automatically detected and mapped.
      </p>

      <div className="flex items-center justify-center w-full mb-4">
        <label htmlFor="dropzone-file" className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${loading ? 'border-zinc-200 bg-zinc-50 cursor-not-allowed' : 'border-zinc-300 bg-zinc-50 dark:hover:bg-zinc-800 dark:bg-zinc-900 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:border-zinc-600'}`}>
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            {loading ? (
              <Loader2 className="w-8 h-8 mb-3 text-blue-500 animate-spin" />
            ) : (
              <UploadCloud className="w-8 h-8 mb-3 text-zinc-400" />
            )}
            <p className="mb-2 text-sm text-zinc-500 dark:text-zinc-400">
              {loading ? "Analyzing & Importing..." : <><span className="font-semibold">Click to upload</span> or drag and drop</>}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Feedback or E-Commerce CSVs (Max 5MB)</p>
          </div>
          <input 
            id="dropzone-file" 
            type="file" 
            accept=".csv" 
            className="hidden" 
            ref={fileInputRef}
            onChange={handleFileChange}
            disabled={loading}
          />
        </label>
      </div> 

      {/* Schema Detection Banner */}
      {analysis && (
        <div className={`mb-4 p-4 rounded-lg border text-sm animate-in fade-in slide-in-from-top-2 ${
          analysis.datasetType === "CUSTOMER_FEEDBACK" 
            ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200"
            : analysis.datasetType === "ECOMMERCE_PRODUCT"
            ? "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-900 dark:text-purple-200"
            : "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200"
        }`}>
          <div className="flex items-center space-x-2 font-semibold text-base mb-1">
            {analysis.datasetType === "CUSTOMER_FEEDBACK" && <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
            {analysis.datasetType === "ECOMMERCE_PRODUCT" && <ShoppingCart className="w-5 h-5 text-purple-600 dark:text-purple-400" />}
            {analysis.datasetType === "UNSUPPORTED" && <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />}
            <span>
              {analysis.datasetType === "CUSTOMER_FEEDBACK" && "Detected: Customer Feedback CSV"}
              {analysis.datasetType === "ECOMMERCE_PRODUCT" && "Detected: E-commerce Product CSV"}
              {analysis.datasetType === "UNSUPPORTED" && "Unsupported CSV Format"}
            </span>
          </div>

          {analysis.datasetType !== "UNSUPPORTED" ? (
            <div className="text-xs space-y-1 mt-2">
              <p><span className="font-semibold">Detected Headers:</span> {analysis.rawHeaders.join(", ")}</p>
              {analysis.detectedFeedbackColumn && (
                <p><span className="font-semibold">Mapped Feedback Column:</span> <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">{analysis.detectedFeedbackColumn}</code> &rarr; <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">content</code></p>
              )}
              {analysis.detectedProductColumn && (
                <p><span className="font-semibold">Mapped Product Fields:</span> Name (<code className="bg-purple-100 dark:bg-purple-800 px-1 rounded">{analysis.detectedProductColumn}</code>){analysis.detectedPriceColumn ? `, Price (${analysis.detectedPriceColumn})` : ''}{analysis.detectedCategoryColumn ? `, Category (${analysis.detectedCategoryColumn})` : ''}{analysis.detectedStockColumn ? `, Stock (${analysis.detectedStockColumn})` : ''}</p>
              )}
            </div>
          ) : (
            <div className="text-xs space-y-2 mt-2">
              <p className="font-medium text-amber-800 dark:text-amber-300">
                Found headers: <code className="bg-amber-100 dark:bg-amber-800/60 px-1.5 py-0.5 rounded font-mono">{analysis.rawHeaders.join(", ") || "(none)"}</code>
              </p>
              <div className="bg-white/60 dark:bg-zinc-900/60 p-3 rounded border border-amber-200 dark:border-amber-800 space-y-1">
                <p className="font-bold text-zinc-900 dark:text-white">Supported CSV Formats:</p>
                <ul className="list-disc pl-4 space-y-1 text-zinc-700 dark:text-zinc-300">
                  <li><span className="font-semibold">Customer Feedback CSV:</span> Must include at least one feedback column (<code className="bg-zinc-100 dark:bg-zinc-800 px-1">content</code>, <code className="bg-zinc-100 dark:bg-zinc-800 px-1">feedback</code>, <code className="bg-zinc-100 dark:bg-zinc-800 px-1">review</code>, <code className="bg-zinc-100 dark:bg-zinc-800 px-1">comment</code>, <code className="bg-zinc-100 dark:bg-zinc-800 px-1">message</code>, <code className="bg-zinc-100 dark:bg-zinc-800 px-1">text</code>, <code className="bg-zinc-100 dark:bg-zinc-800 px-1">description</code>, <code className="bg-zinc-100 dark:bg-zinc-800 px-1">customer_feedback</code>, <code className="bg-zinc-100 dark:bg-zinc-800 px-1">customer_comment</code>).</li>
                  <li><span className="font-semibold">E-Commerce Product CSV:</span> Must include product & category/price/stock columns (<code className="bg-zinc-100 dark:bg-zinc-800 px-1">Product</code>, <code className="bg-zinc-100 dark:bg-zinc-800 px-1">Price</code>, <code className="bg-zinc-100 dark:bg-zinc-800 px-1">Category</code>, <code className="bg-zinc-100 dark:bg-zinc-800 px-1">Stock</code>).</li>
                </ul>
              </div>
              <p className="text-amber-700 dark:text-amber-400">Please rename or add a supported column header to your CSV file before uploading.</p>
            </div>
          )}
        </div>
      )}

      {error && !analysis?.datasetType && (
        <div className="p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/50 rounded-lg flex items-start space-x-3 text-sm text-red-600 dark:text-red-400 animate-in fade-in slide-in-from-top-2">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {result && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-900/50 rounded-lg text-sm animate-in fade-in slide-in-from-top-2 space-y-2">
          <div className="flex items-center space-x-2 text-emerald-800 dark:text-emerald-300 font-medium">
            <CheckCircle2 className="w-5 h-5" />
            <span>Import Complete (Total {result.total} rows processed)</span>
          </div>
          <ul className="list-disc list-inside text-emerald-700 dark:text-emerald-400 space-y-1">
            <li>Successfully imported: <span className="font-bold">{result.successful}</span> rows</li>
            {result.skipped > 0 && <li className="text-blue-600 dark:text-blue-400">Skipped (duplicates): <span className="font-bold">{result.skipped}</span> rows</li>}
            {result.failed > 0 && <li className="text-amber-600 dark:text-amber-500">Failed / Invalid: <span className="font-bold">{result.failed}</span> rows</li>}
          </ul>
        </div>
      )}
    </div>
  )
}
