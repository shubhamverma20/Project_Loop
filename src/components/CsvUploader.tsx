"use client"

import { useState, useRef } from "react"
import { bulkImportFeedback } from "@/app/actions/ingestion"
import { UploadCloud, Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import Papa from "papaparse"

export function CsvUploader() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success: number; failed: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    setError(null)
    setResult(null)

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const parsedData = results.data
          const res = await bulkImportFeedback(parsedData)
          
          if (res.error) {
            setError(res.error)
          } else if (res.summary) {
            setResult(res.summary)
            if (fileInputRef.current) {
              fileInputRef.current.value = "" // reset input
            }
          }
        } catch {
          setError("Failed to import parsed data.")
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

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm h-full">
      <div className="flex items-center space-x-3 mb-4">
        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
          <UploadCloud className="w-5 h-5" />
        </div>
        <h3 className="font-semibold text-zinc-900 dark:text-white">CSV Upload</h3>
      </div>
      
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
        Upload a CSV file with <code className="bg-zinc-100 dark:bg-zinc-800 px-1 rounded">content</code> and <code className="bg-zinc-100 dark:bg-zinc-800 px-1 rounded">channel</code> columns. Client-side parsing ensures speed and security.
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
              {loading ? "Parsing & Uploading..." : <><span className="font-semibold">Click to upload</span> or drag and drop</>}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">CSV files only</p>
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

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/50 rounded-lg flex items-start space-x-3 text-sm text-red-600 dark:text-red-400 animate-in fade-in slide-in-from-top-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {result && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-900/50 rounded-lg text-sm animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center space-x-2 text-emerald-800 dark:text-emerald-300 font-medium mb-2">
            <CheckCircle2 className="w-5 h-5" />
            <span>Upload Complete</span>
          </div>
          <ul className="list-disc list-inside text-emerald-700 dark:text-emerald-400 space-y-1">
            <li>Successfully imported: <span className="font-bold">{result.success}</span> rows</li>
            {result.failed > 0 && <li className="text-amber-600 dark:text-amber-500">Failed to import: <span className="font-bold">{result.failed}</span> rows (missing required fields)</li>}
          </ul>
        </div>
      )}
    </div>
  )
}
