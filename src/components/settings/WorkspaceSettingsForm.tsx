"use client"

import { useState } from "react"
import { updateWorkspaceName } from "@/app/actions/settings"
import { Building2, Loader2, CheckCircle2, AlertCircle, ShieldAlert } from "lucide-react"

interface WorkspaceSettingsProps {
  workspace: {
    id: string
    name: string
    apiKey: string | null
    createdAt: Date
  }
  userRole: string
}

export function WorkspaceSettingsForm({ workspace, userRole }: WorkspaceSettingsProps) {
  const [name, setName] = useState(workspace.name)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const isAdmin = userRole === "ADMIN"

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isAdmin) return
    setError(null)
    setMessage(null)
    setIsSubmitting(true)

    try {
      const res = await updateWorkspaceName(name)
      if (!res.success || res.error) {
        setError(res.error || "Failed to update workspace name")
      } else {
        setMessage(res.message || "Workspace updated successfully")
      }
    } catch {
      setError("An unexpected error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-zinc-900 dark:text-white">Workspace Settings</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Manage workspace identity and organization preferences.
            </p>
          </div>
        </div>

        {!isAdmin && (
          <span className="flex items-center space-x-1 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-amber-700 dark:text-amber-300 text-xs font-medium">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Admin Only</span>
          </span>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-800 border border-red-200 dark:bg-red-950/40 dark:border-red-900/50 dark:text-red-300 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {message && (
        <div className="mb-4 p-3 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-900/50 dark:text-emerald-300 text-xs flex items-center space-x-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{message}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Workspace Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!isAdmin || isSubmitting}
            className="w-full text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 text-zinc-900 dark:text-white p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-60"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
              Workspace ID
            </label>
            <input
              type="text"
              readOnly
              value={workspace.id}
              className="w-full text-xs font-mono rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 p-2.5"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
              Created Date
            </label>
            <input
              type="text"
              readOnly
              value={new Date(workspace.createdAt).toLocaleDateString()}
              className="w-full text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 p-2.5"
            />
          </div>
        </div>

        {isAdmin && (
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSubmitting || name.trim() === workspace.name}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50 shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Workspace Name</span>
              )}
            </button>
          </div>
        )}
      </form>
    </div>
  )
}
