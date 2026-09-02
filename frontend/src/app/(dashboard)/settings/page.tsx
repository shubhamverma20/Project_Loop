"use client"

import { useEffect, useState } from "react"
import { api } from "@/lib/api-client"
import { WorkspaceSettingsForm } from "@/components/settings/WorkspaceSettingsForm"
import { ApiKeyCard } from "@/components/ApiKeyCard"
import { TeamMembersManager } from "@/components/settings/TeamMembersManager"
import { ProfileSettingsForm } from "@/components/settings/ProfileSettingsForm"
import { ChangePasswordForm } from "@/components/settings/ChangePasswordForm"
import { SessionManager } from "@/components/settings/SessionManager"
import { AlertCircle, Loader2 } from "lucide-react"

interface SettingsData {
  workspace: {
    id: string
    name: string
    apiKey: string | null
    apiKeyHash: string | null
    createdAt: string
  }
  currentUser: {
    id: string
    name: string | null
    email: string | null
    role: "ADMIN" | "ANALYST" | "VIEWER"
    hasPassword: boolean
  }
  members: Array<{
    id: string
    name: string | null
    email: string | null
    role: "ADMIN" | "ANALYST" | "VIEWER"
    image: string | null
  }>
}

export default function SettingsPage() {
  const [data, setData] = useState<SettingsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSettings = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get("/api/settings")
      if (res.error) {
        setError(res.error)
      } else if (res.data?.data) {
        setData(res.data.data)
      }
    } catch {
      setError("Failed to load settings data")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Loading settings...</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="p-4 rounded-xl bg-red-50 text-red-800 border border-red-200 dark:bg-red-950/40 dark:border-red-900/50 dark:text-red-300 flex items-center space-x-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">{error || "Failed to load settings data"}</p>
        </div>
      </div>
    )
  }

  const { workspace, currentUser, members } = data
  const hasApiKey = Boolean(workspace.apiKeyHash || workspace.apiKey)

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">Settings</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Manage workspace settings, team member RBAC permissions, profile, and security preferences.
        </p>
      </div>

      <div className="space-y-6">
        {/* Workspace Identity & Settings */}
        <WorkspaceSettingsForm workspace={workspace} userRole={currentUser.role} />

        {/* API Key Management */}
        <ApiKeyCard hasApiKey={hasApiKey} userRole={currentUser.role} />

        {/* Team Members & Role Management */}
        <TeamMembersManager 
          members={members} 
          currentUserId={currentUser.id} 
          currentUserRole={currentUser.role}
          onRefresh={fetchSettings}
        />

        {/* User Profile */}
        <ProfileSettingsForm currentUser={currentUser} />

        {/* Security & Password */}
        <ChangePasswordForm hasPassword={currentUser.hasPassword} />

        {/* Active Session & Logout */}
        <SessionManager currentUser={currentUser} workspaceName={workspace.name} />
      </div>
    </div>
  )
}
