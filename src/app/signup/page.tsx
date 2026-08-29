"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { registerUser } from "@/app/actions/auth"

export default function SignupPage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    
    try {
      const formData = new FormData()
      formData.append("name", name)
      formData.append("email", email)
      formData.append("companyName", companyName)
      formData.append("password", password)

      const result = await registerUser(null, formData)
      
      if (result?.error) {
        setError(result.error)
        setLoading(false)
        return
      }

      // Auto login after signup
      const loginRes = await signIn("credentials", {
        redirect: false,
        email,
        password,
      })

      if (loginRes?.error) {
        setError("Account created but failed to log in.")
      } else {
        router.push("/dashboard")
        router.refresh()
      }
    } catch (err: unknown) {
      console.error(err)
      setError("Failed to create account.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4 py-12">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Create Account</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-2">Get started with LOOP</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 text-rose-600 border border-rose-200 rounded-lg text-sm whitespace-pre-wrap">
            {error}
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Full Name</label>
            <input 
              type="text" 
              required
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Email</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Company / Workspace Name</label>
            <input 
              type="text" 
              required
              value={companyName}
              onChange={e => setCompanyName(e.target.value)}
              className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Password</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50 mt-4"
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-zinc-600 dark:text-zinc-400">
          Already have an account? <Link href="/login" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium">Log in</Link>
        </p>
      </div>
    </div>
  )
}
