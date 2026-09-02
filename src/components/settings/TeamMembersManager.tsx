"use client"

import { useState } from "react"
import { inviteTeamMember, updateMemberRole, removeTeamMember } from "@/app/actions/settings"
import { Role } from "@prisma/client"
import { Users, UserPlus, Trash2, Loader2, CheckCircle2, AlertCircle, Shield, Eye, BarChart3 } from "lucide-react"

interface Member {
  id: string
  name: string | null
  email: string | null
  role: Role
  image: string | null
}

interface TeamMembersProps {
  members: Member[]
  currentUserId: string
  currentUserRole: Role
}

export function TeamMembersManager({ members, currentUserId, currentUserRole }: TeamMembersProps) {
  const isAdmin = currentUserRole === Role.ADMIN

  const [showInviteForm, setShowInviteForm] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteName, setInviteName] = useState("")
  const [inviteRole, setInviteRole] = useState<Role>(Role.VIEWER)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)

  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isAdmin) return
    setError(null)
    setMessage(null)

    if (!inviteEmail.trim()) {
      setError("Email address is required")
      return
    }

    setIsSubmitting(true)
    try {
      const res = await inviteTeamMember({
        email: inviteEmail.trim(),
        name: inviteName.trim() || undefined,
        role: inviteRole
      })

      if (!res.success || res.error) {
        setError(res.error || "Failed to invite team member")
      } else {
        setMessage(res.message || "Team member added successfully")
        setInviteEmail("")
        setInviteName("")
        setInviteRole(Role.VIEWER)
        setShowInviteForm(false)
      }
    } catch {
      setError("An unexpected error occurred while inviting member")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRoleChange = async (memberId: string, newRole: Role) => {
    if (!isAdmin) return
    setError(null)
    setMessage(null)
    setUpdatingId(memberId)

    try {
      const res = await updateMemberRole(memberId, newRole)
      if (!res.success || res.error) {
        setError(res.error || "Failed to update role")
      } else {
        setMessage(res.message || "Role updated successfully")
      }
    } catch {
      setError("An unexpected error occurred while updating role")
    } finally {
      setUpdatingId(null)
    }
  }

  const handleRemoveMember = async (memberId: string, memberEmail: string | null) => {
    if (!isAdmin) return
    if (!confirm(`Are you sure you want to remove ${memberEmail || "this member"} from the workspace?`)) {
      return
    }

    setError(null)
    setMessage(null)
    setRemovingId(memberId)

    try {
      const res = await removeTeamMember(memberId)
      if (!res.success || res.error) {
        setError(res.error || "Failed to remove member")
      } else {
        setMessage(res.message || "Member removed successfully")
      }
    } catch {
      setError("An unexpected error occurred while removing member")
    } finally {
      setRemovingId(null)
    }
  }

  const getRoleIcon = (role: Role) => {
    switch (role) {
      case Role.ADMIN:
        return <Shield className="w-3.5 h-3.5 text-purple-500" />
      case Role.ANALYST:
        return <BarChart3 className="w-3.5 h-3.5 text-blue-500" />
      default:
        return <Eye className="w-3.5 h-3.5 text-zinc-400" />
    }
  }

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-zinc-900 dark:text-white">Team Members ({members.length})</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Manage workspace access and role-based permissions (RBAC).
            </p>
          </div>
        </div>

        {isAdmin && (
          <button
            onClick={() => setShowInviteForm(!showInviteForm)}
            className="flex items-center space-x-2 px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-medium transition-colors shadow-sm self-start sm:self-auto"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>{showInviteForm ? "Cancel Invite" : "Invite Member"}</span>
          </button>
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

      {/* Invite Member Form */}
      {showInviteForm && (
        <form onSubmit={handleInvite} className="mb-6 p-4 bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/40 rounded-xl space-y-4 animate-in fade-in">
          <h4 className="text-xs font-semibold text-purple-900 dark:text-purple-200 uppercase tracking-wider">
            Invite New Member
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@company.com"
                disabled={isSubmitting}
                className="w-full text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white p-2 focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Full Name (Optional)
              </label>
              <input
                type="text"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="Jane Doe"
                disabled={isSubmitting}
                className="w-full text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white p-2 focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Role (RBAC)
              </label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as Role)}
                disabled={isSubmitting}
                className="w-full text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white p-2 focus:ring-2 focus:ring-purple-500 focus:outline-none"
              >
                <option value={Role.VIEWER}>VIEWER (Read-only)</option>
                <option value={Role.ANALYST}>ANALYST (Read & Ingest)</option>
                <option value={Role.ADMIN}>ADMIN (Full Control)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-1">
            <button
              type="button"
              onClick={() => setShowInviteForm(false)}
              className="px-3 py-1.5 text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center space-x-2 px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Inviting...</span>
                </>
              ) : (
                <span>Send Invitation</span>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Team Members List */}
      <div className="divide-y divide-zinc-200 dark:divide-zinc-800 border-t border-b border-zinc-200 dark:border-zinc-800">
        {members.map((member) => {
          const isSelf = member.id === currentUserId
          const isUpdating = updatingId === member.id
          const isRemoving = removingId === member.id

          return (
            <div key={member.id} className="py-3.5 flex items-center justify-between gap-4">
              <div className="flex items-center space-x-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center font-semibold text-xs text-zinc-700 dark:text-zinc-200 flex-shrink-0">
                  {member.name ? member.name.charAt(0).toUpperCase() : member.email?.charAt(0).toUpperCase() || "?"}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-xs text-zinc-900 dark:text-white truncate">
                      {member.name || "Unnamed User"}
                    </span>
                    {isSelf && (
                      <span className="px-1.5 py-0.5 text-[10px] bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium rounded-full">
                        You
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{member.email}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                {/* Role selection for ADMINs, static badge for non-ADMINs */}
                {isAdmin ? (
                  <div className="flex items-center space-x-1.5">
                    {getRoleIcon(member.role)}
                    <select
                      value={member.role}
                      onChange={(e) => handleRoleChange(member.id, e.target.value as Role)}
                      disabled={isUpdating}
                      className="text-xs font-medium rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white px-2 py-1 focus:ring-1 focus:ring-purple-500 disabled:opacity-50"
                    >
                      <option value={Role.ADMIN}>ADMIN</option>
                      <option value={Role.ANALYST}>ANALYST</option>
                      <option value={Role.VIEWER}>VIEWER</option>
                    </select>
                  </div>
                ) : (
                  <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    {getRoleIcon(member.role)}
                    <span>{member.role}</span>
                  </div>
                )}

                {/* Remove member button for ADMINs (not self) */}
                {isAdmin && !isSelf && (
                  <button
                    onClick={() => handleRemoveMember(member.id, member.email)}
                    disabled={isRemoving}
                    title="Remove member from workspace"
                    className="p-1.5 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md transition-colors disabled:opacity-50"
                  >
                    {isRemoving ? <Loader2 className="w-4 h-4 animate-spin text-red-500" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
