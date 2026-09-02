"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  MessageSquare,
  Settings,
  LogOut,
  Sparkles,
  Bot,
  Database
} from "lucide-react"
import { signOut } from "next-auth/react"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  // router removed

  const handleSignOut = async () => {
    try {
      await signOut({ callbackUrl: "/login" })
    } catch (error) {
      console.error("Error signing out", error)
    }
  }

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Feedback", href: "/feedback", icon: MessageSquare },
    { name: "Data Sources", href: "/sources", icon: Database },
    { name: "AI Insights", href: "/insights", icon: Bot },
    { name: "Settings", href: "/settings", icon: Settings },
  ]

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
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors ${isActive
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
