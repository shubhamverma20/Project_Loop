"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  LayoutDashboard,
  MessageSquare,
  Settings,
  LogOut,
  Sparkles,
  Bot,
  Database,
  Loader2
} from "lucide-react"
import { api } from "@/lib/api-client"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [checkingAuth, setCheckingAuth] = useState(true)

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await api.get("/api/auth/me")
        if (res.status === 401 || res.error) {
          if (typeof window !== "undefined") {
            localStorage.removeItem("session_token")
          }
          router.push("/login")
        } else {
          setCheckingAuth(false)
        }
      } catch {
        if (typeof window !== "undefined") {
          localStorage.removeItem("session_token")
        }
        router.push("/login")
      }
    }
    checkAuth()
  }, [router])

  const handleSignOut = async () => {
    try {
      await api.post("/api/auth/logout")
    } catch (error) {
      console.error("Error signing out", error)
    } finally {
      if (typeof window !== "undefined") {
        localStorage.removeItem("session_token")
      }
      window.location.href = "/login"
    }
  }

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Feedback Explorer", href: "/explorer", icon: MessageSquare },
    { name: "Data Sources", href: "/sources", icon: Database },
    { name: "AI Insights", href: "/insights", icon: Bot },
    { name: "Reports", href: "/reports", icon: Sparkles },
    { name: "Settings", href: "/settings", icon: Settings },
  ]

  if (checkingAuth) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-zinc-950 text-white space-y-4">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        <p className="text-sm font-medium text-zinc-400">Verifying session...</p>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Sidebar */}
      <div className="w-64 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-zinc-200 dark:border-zinc-800">
          <Link href="/dashboard" className="flex items-center space-x-2 font-bold text-xl text-zinc-900 dark:text-white">
            <Sparkles className="w-6 h-6 text-blue-500" />
            <span>Project LOOP</span>
          </Link>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href || (item.href === "/explorer" && pathname === "/feedback")
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors ${
                  isActive
                    ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium"
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-zinc-100"
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.name}</span>
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800">
          <button
            onClick={handleSignOut}
            className="flex items-center space-x-3 px-3 py-2.5 w-full rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-red-50 dark:hover:bg-red-900/10 hover:text-red-600 dark:hover:text-red-400 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Log out</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          {children}
        </div>
      </div>
    </div>
  )
}
