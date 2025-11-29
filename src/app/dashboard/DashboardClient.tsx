'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Twin {
  id: string
  name: string
  role_title: string
  years_experience: number
  skills: string[]
  bio: string
  public_slug: string
  created_at: string
  twin_answers: {
    id: string
    question_type: string
    question_text: string
    answer_text: string
  }[]
}

interface Props {
  twin: Twin
  sessionCount: number
  avgRating: number | null
}

export default function DashboardClient({ twin, sessionCount, avgRating }: Props) {
  const router = useRouter()
  const [copied, setCopied] = useState(false)

  const shareUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/twin/${twin.public_slug}`
    : `/twin/${twin.public_slug}`

  const copyLink = async () => {
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <header className="border-b border-[var(--border)] px-6 md:px-12 py-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <span className="text-xs tracking-[0.3em] uppercase text-[var(--muted)]">
            Digital Twin
          </span>
          <button
            onClick={handleSignOut}
            className="text-xs tracking-wider text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 md:px-12 py-12">
        {/* Welcome section */}
        <div className="mb-16">
          <p className="text-[10px] tracking-[0.5em] uppercase text-[var(--muted)] mb-4">Dashboard</p>
          <h1 className="font-serif text-4xl md:text-5xl font-light text-[var(--foreground)] leading-[1.1] mb-3">
            Welcome back,<br />
            <span className="italic text-[var(--accent)]">{twin.name.split(' ')[0]}</span>
          </h1>
          <p className="text-[var(--muted)] text-sm">Your digital twin is ready to meet employers.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-16">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6">
            <div className="font-serif text-4xl text-[var(--foreground)] mb-1">{sessionCount}</div>
            <div className="text-xs tracking-wider uppercase text-[var(--muted)]">Sessions</div>
          </div>
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6">
            <div className="font-serif text-4xl text-[var(--foreground)] mb-1">
              {avgRating ? avgRating.toFixed(1) : '—'}
            </div>
            <div className="text-xs tracking-wider uppercase text-[var(--muted)]">Avg rating</div>
          </div>
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6">
            <div className="font-serif text-4xl text-[var(--foreground)] mb-1">{twin.twin_answers.length}</div>
            <div className="text-xs tracking-wider uppercase text-[var(--muted)]">Answers</div>
          </div>
        </div>

        {/* Share link section */}
        <div className="bg-[var(--accent)]/10 border border-[var(--border)] rounded-2xl p-8 mb-16">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="font-serif text-2xl text-[var(--foreground)] mb-2">Share your twin</h2>
              <p className="text-[var(--muted)] text-sm">Send this link to employers to start interviews.</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-[var(--accent)]/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 px-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--muted)] font-mono text-sm truncate">
              {shareUrl}
            </div>
            <button
              onClick={copyLink}
              className="px-6 py-3 bg-[var(--accent)] text-[var(--background)] text-sm rounded-full hover:opacity-90 transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
            >
              {copied ? (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Copied
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy link
                </>
              )}
            </button>
          </div>
        </div>

        {/* Twin profile section */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden">
          <div className="p-8 border-b border-[var(--border)]">
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-xs tracking-wider uppercase text-[var(--muted)] mb-2">Your Profile</p>
                <h2 className="font-serif text-3xl text-[var(--foreground)] mb-1">{twin.name}</h2>
                <p className="text-[var(--accent)]">{twin.role_title}</p>
              </div>
              <div className="text-right">
                <p className="text-xs tracking-wider uppercase text-[var(--muted)] mb-1">Experience</p>
                <p className="text-[var(--foreground)] font-serif text-xl">{twin.years_experience} years</p>
              </div>
            </div>

            <p className="text-[var(--muted)] leading-relaxed mb-6">{twin.bio}</p>

            <div className="flex flex-wrap gap-2">
              {twin.skills.map((skill, i) => (
                <span
                  key={i}
                  className="px-3 py-1.5 bg-[var(--background)] text-[var(--accent)] text-sm rounded-full border border-[var(--border)]"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {/* Answers preview */}
          <div className="p-8">
            <h3 className="text-xs tracking-wider uppercase text-[var(--muted)] mb-6">Your Style Answers</h3>
            <div className="space-y-6">
              {twin.twin_answers.slice(0, 3).map((answer, i) => (
                <div key={i} className="border-l-2 border-[var(--accent)]/50 pl-4">
                  <p className="text-[var(--accent)] text-sm mb-2">{answer.question_text}</p>
                  <p className="text-[var(--foreground)] leading-relaxed line-clamp-2">{answer.answer_text}</p>
                </div>
              ))}
              {twin.twin_answers.length > 3 && (
                <p className="text-[var(--muted)] text-sm">
                  +{twin.twin_answers.length - 3} more answers
                </p>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] px-6 md:px-12 py-6 mt-12">
        <div className="max-w-5xl mx-auto flex justify-between items-center text-[10px] tracking-wider uppercase text-[var(--muted)]">
          <span>Digital Twin</span>
          <span>©2025</span>
        </div>
      </footer>
    </div>
  )
}
