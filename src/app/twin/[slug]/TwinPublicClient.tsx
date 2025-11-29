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
}

interface Props {
  twin: Twin
}

export default function TwinPublicClient({ twin }: Props) {
  const router = useRouter()
  const [employerName, setEmployerName] = useState('')
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)

  const startSession = async () => {
    if (!employerName.trim()) return
    
    setLoading(true)
    const supabase = createClient()

    const { data: session, error } = await supabase
      .from('sessions')
      .insert({
        twin_id: twin.id,
        employer_name: employerName.trim(),
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating session:', error)
      alert('Something went wrong. Please try again.')
      setLoading(false)
      return
    }

    router.push(`/twin/${twin.public_slug}/chat/${session.id}`)
  }

  const initials = twin.name.split(' ').map(n => n[0]).join('').slice(0, 2)

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col">
      {/* Header */}
      <header className="px-6 md:px-12 py-6 flex items-center justify-between">
        <span className="text-xs tracking-[0.3em] uppercase text-[var(--muted)]">
          Digital Twin
        </span>
        <span className="text-[10px] tracking-wider uppercase text-[var(--muted)]">
          Interview
        </span>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-2xl mx-auto px-6 md:px-12 py-12">
        {/* Twin profile */}
        <div className="text-center mb-12">
          {/* Avatar */}
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[var(--muted)] to-[var(--accent)] flex items-center justify-center mx-auto mb-6 shadow-lg shadow-[var(--accent)]/20">
            <span className="text-3xl text-[var(--background)] font-medium">{initials}</span>
          </div>
          
          <h1 className="font-serif text-4xl md:text-5xl text-[var(--foreground)] mb-2">{twin.name}</h1>
          <p className="text-[var(--accent)] text-lg mb-4">{twin.role_title}</p>
          
          <div className="flex items-center justify-center gap-2 text-sm text-[var(--muted)]">
            <span>{twin.years_experience} years experience</span>
          </div>
        </div>

        {/* Bio */}
        <div className="mb-10">
          <p className="text-[var(--muted)] leading-relaxed text-center max-w-lg mx-auto">
            {twin.bio}
          </p>
        </div>

        {/* Skills */}
        <div className="flex flex-wrap gap-2 justify-center mb-12">
          {twin.skills.map((skill, i) => (
            <span
              key={i}
              className="px-3 py-1.5 bg-[var(--surface)] text-[var(--accent)] text-sm rounded-full border border-[var(--border)]"
            >
              {skill}
            </span>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center">
          <p className="text-[var(--muted)] text-sm mb-6 max-w-sm mx-auto leading-relaxed">
            Start a voice call and ask questions — the twin will respond in {twin.name.split(' ')[0]}&apos;s voice and style.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-3 px-8 py-4 bg-[var(--accent)] text-[var(--background)] text-sm tracking-wide rounded-full hover:opacity-90 transition-all duration-300 shadow-lg shadow-[var(--accent)]/20"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
            </svg>
            Start Call
          </button>
        </div>

        {/* Note */}
        <p className="text-center text-[var(--muted)] text-xs mt-16 tracking-wide">
          AI-powered digital twin. Responses reflect the candidate&apos;s profile and communication style.
        </p>
      </main>

      {/* Footer */}
      <footer className="px-6 md:px-12 py-6">
        <div className="flex justify-between items-center text-[10px] tracking-wider uppercase text-[var(--muted)]">
          <span>Digital Twin</span>
          <span>©2025</span>
        </div>
      </footer>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--foreground)]/40 backdrop-blur-sm">
          <div className="bg-[var(--background)] border border-[var(--border)] rounded-2xl p-8 w-full max-w-md animate-fade-up">
            <h2 className="font-serif text-2xl text-[var(--foreground)] mb-2">Start call</h2>
            <p className="text-[var(--muted)] text-sm mb-6">Enter your name or company to begin.</p>

            <div className="mb-6">
              <label className="block text-xs tracking-wider uppercase text-[var(--muted)] mb-2">
                Your name
              </label>
              <input
                type="text"
                value={employerName}
                onChange={(e) => setEmployerName(e.target.value)}
                placeholder="Name or company"
                className="w-full px-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder-[var(--placeholder)] focus:outline-none focus:border-[var(--muted)] transition-colors"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && employerName.trim()) {
                    startSession()
                  }
                }}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors py-3"
              >
                Cancel
              </button>
              <button
                onClick={startSession}
                disabled={!employerName.trim() || loading}
                className="flex-1 bg-[var(--accent)] py-3 text-sm text-[var(--background)] rounded-full hover:opacity-90 transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Connecting
                  </>
                ) : (
                  'Connect'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
