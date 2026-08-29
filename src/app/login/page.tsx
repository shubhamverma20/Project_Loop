"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    
    try {
      const res = await signIn("credentials", {
        redirect: false,
        email,
        password,
      })

      if (res?.error) {
        setError("Invalid email or password.")
      } else {
        router.push("/dashboard")
        router.refresh()
      }
    } catch (err) {
      console.error(err)
      setError("An error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Welcome Back</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-2">Log in to your LOOP account</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 text-rose-600 border border-rose-200 rounded-lg text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Email</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Password</label>
              <Link href="/forgot-password" className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400">Forgot password?</Link>
            </div>
            <input 
              type="password" 
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-zinc-600 dark:text-zinc-400">
          Don&apos;t have an account? <Link href="/signup" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium">Sign up</Link>
        </p>
      </div>
    </div>
  )
}
