"use client"

import { useRouter } from "next/navigation"
import { api } from "@/lib/api-client"
import { LogOut, ShieldCheck, Laptop, Clock } from "lucide-react"

interface SessionProps {
  currentUser: {
    id: string
    email: string | null
    role: string
  }
  workspaceName: string
}

export function SessionManager({ currentUser, workspaceName }: SessionProps) {
  const router = useRouter()

  const handleSignOut = async () => {
    try {
      await api.post("/api/auth/logout")
    } finally {
      router.push("/login")
    }
  }

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg text-red-600 dark:text-red-400">
            <Laptop className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-zinc-900 dark:text-white">Active Session & Sign Out</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Manage your active authenticated session and security logouts.
            </p>
          </div>
        </div>

        <button
          onClick={handleSignOut}
          className="flex items-center space-x-2 px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-medium transition-colors shadow-sm"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>

      <div className="bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div>
          <span className="text-zinc-500 dark:text-zinc-400 block mb-0.5">Authenticated User</span>
          <span className="font-medium text-zinc-900 dark:text-white flex items-center space-x-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span className="truncate">{currentUser.email}</span>
          </span>
        </div>

        <div>
          <span className="text-zinc-500 dark:text-zinc-400 block mb-0.5">Active Workspace</span>
          <span className="font-medium text-zinc-900 dark:text-white">{workspaceName}</span>
        </div>

        <div>
          <span className="text-zinc-500 dark:text-zinc-400 block mb-0.5">Session Status</span>
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-medium text-[11px]">
            <Clock className="w-3 h-3" />
            <span>Active Session</span>
          </span>
        </div>
      </div>
    </div>
  )
}
