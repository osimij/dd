'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({ type: 'success', text: 'Check your email for the magic link.' })
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col">
      {/* Header */}
      <header className="px-6 md:px-12 py-6 flex items-center justify-between">
        <Link href="/" className="text-xs tracking-[0.3em] uppercase text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">
          Digital Twin
        </Link>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-sm">
          {/* Title */}
          <div className="text-center mb-10">
            <h1 className="font-serif text-4xl text-[var(--foreground)] mb-2">Enter</h1>
            <p className="text-[var(--muted)] text-sm">Sign in to create your twin</p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-8">
            <div>
              <label htmlFor="email" className="block text-xs tracking-wider uppercase text-[var(--muted)] mb-2">
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full px-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder-[var(--placeholder)] focus:outline-none focus:border-[var(--muted)] transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-[var(--accent)] text-[var(--background)] text-sm rounded-full hover:opacity-90 transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Sending...
                </>
              ) : (
                'Send magic link'
              )}
            </button>
          </form>

          {/* Message */}
          {message && (
            <div
              className={`mt-6 p-4 rounded-xl text-sm text-center ${
                message.type === 'success'
                  ? 'bg-emerald-900/20 border border-emerald-700/30 text-emerald-400 dark:bg-emerald-900/20 dark:border-emerald-700/30 dark:text-emerald-400'
                  : 'bg-red-900/20 border border-red-700/30 text-red-400 dark:bg-red-900/20 dark:border-red-700/30 dark:text-red-400'
              }`}
            >
              {message.text}
            </div>
          )}

          {/* Back link */}
          <div className="text-center mt-10">
            <Link 
              href="/" 
              className="inline-flex items-center gap-3 text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors group"
            >
              <span className="w-6 h-px bg-current group-hover:w-10 transition-all duration-300" />
              Back
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 md:px-12 py-6">
        <div className="flex justify-between items-center text-[10px] tracking-wider uppercase text-[var(--muted)]">
          <span>Digital Twin</span>
          <span>©2025</span>
        </div>
      </footer>
    </div>
  )
}
