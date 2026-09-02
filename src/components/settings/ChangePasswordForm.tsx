"use client"

import { useState } from "react"
import { changePassword } from "@/app/actions/settings"
import { KeyRound, Loader2, CheckCircle2, AlertCircle } from "lucide-react"

interface ChangePasswordProps {
  hasPassword: boolean
}

export function ChangePasswordForm({ hasPassword }: ChangePasswordProps) {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters long")
      return
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match")
      return
    }

    setIsSubmitting(true)

    try {
      const res = await changePassword({
        currentPassword: hasPassword ? currentPassword : undefined,
        newPassword,
        confirmPassword
      })

      if (!res.success || res.error) {
        setError(res.error || "Failed to change password")
      } else {
        setMessage(res.message || "Password updated successfully")
        setCurrentPassword("")
        setNewPassword("")
        setConfirmPassword("")
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
        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
          <KeyRound className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-semibold text-zinc-900 dark:text-white">Security & Password</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {hasPassword ? "Change your account password securely." : "Set a password for password-based logins."}
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
        {hasPassword && (
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Current Password
            </label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled={isSubmitting}
              placeholder="••••••••"
              className="w-full text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 text-zinc-900 dark:text-white p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-60"
            />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              New Password
            </label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={isSubmitting}
              placeholder="At least 8 characters"
              className="w-full text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 text-zinc-900 dark:text-white p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-60"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Confirm New Password
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isSubmitting}
              placeholder="Re-enter new password"
              className="w-full text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 text-zinc-900 dark:text-white p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-60"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSubmitting || !newPassword || !confirmPassword}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50 shadow-sm"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Updating Password...</span>
              </>
            ) : (
              <span>Update Password</span>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
