import { getSettingsData } from "@/app/actions/settings"
import { WorkspaceSettingsForm } from "@/components/settings/WorkspaceSettingsForm"
import { ApiKeyCard } from "@/components/ApiKeyCard"
import { TeamMembersManager } from "@/components/settings/TeamMembersManager"
import { ProfileSettingsForm } from "@/components/settings/ProfileSettingsForm"
import { ChangePasswordForm } from "@/components/settings/ChangePasswordForm"
import { SessionManager } from "@/components/settings/SessionManager"
import { Role } from "@prisma/client"
import { AlertCircle } from "lucide-react"

export default async function SettingsPage() {
  const { error, data } = await getSettingsData()

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
          currentUserRole={currentUser.role as Role} 
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
