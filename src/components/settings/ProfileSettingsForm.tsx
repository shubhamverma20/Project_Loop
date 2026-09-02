"use client"

import { useState } from "react"
import { updateProfile } from "@/app/actions/settings"
import { User, Loader2, CheckCircle2, AlertCircle } from "lucide-react"

interface ProfileProps {
  currentUser: {
    id: string
    name: string | null
    email: string | null
    role: string
  }
}

export function ProfileSettingsForm({ currentUser }: ProfileProps) {
  const [name, setName] = useState(currentUser.name || "")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setIsSubmitting(true)

    try {
      const res = await updateProfile(name)
      if (!res.success || res.error) {
        setError(res.error || "Failed to update profile")
      } else {
        setMessage(res.message || "Profile updated successfully")
      }
    } catch {
      setError("An unexpected error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg text-emerald-600 dark:text-emerald-400">
          <User className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-semibold text-zinc-900 dark:text-white">Profile Details</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Update your account display name and user identity.
          </p>
        </div>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Full Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSubmitting}
              className="w-full text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 text-zinc-900 dark:text-white p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:opacity-60"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
              Email Address
            </label>
            <input
              type="email"
              readOnly
              value={currentUser.email || ""}
              className="w-full text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 p-2.5 cursor-not-allowed"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSubmitting || name.trim() === (currentUser.name || "")}
            className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50 shadow-sm"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Updating...</span>
              </>
            ) : (
              <span>Save Profile</span>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
