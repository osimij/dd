'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const QUESTIONS = [
  {
    type: 'intro',
    text: 'Tell me about yourself.',
    placeholder: 'Share your background, what drives you, and what makes you unique...',
    hint: 'Speak naturally, as if introducing yourself to a colleague.',
  },
  {
    type: 'project',
    text: 'Describe a project you\'re proud of.',
    placeholder: 'What was the challenge, your approach, and the outcome...',
    hint: 'Focus on your specific contribution and impact.',
  },
  {
    type: 'mistake',
    text: 'What\'s the biggest mistake you\'ve made and what did you learn?',
    placeholder: 'Be honest about what happened and the lessons you took away...',
    hint: 'Authenticity matters more than perfection.',
  },
  {
    type: 'teamwork',
    text: 'How do you prefer to work in a team?',
    placeholder: 'Describe your collaboration style, communication preferences...',
    hint: 'Think about your best team experiences.',
  },
  {
    type: 'strengths',
    text: 'What kind of problems do you do best on?',
    placeholder: 'What types of challenges energize you and where do you excel...',
    hint: 'Be specific about the work that excites you.',
  },
]

interface Profile {
  name: string
  role_title: string
  years_experience: number
  skills: string[]
  bio: string
}

interface Answers {
  [key: string]: string
}

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [skillInput, setSkillInput] = useState('')
  
  const [profile, setProfile] = useState<Profile>({
    name: '',
    role_title: '',
    years_experience: 0,
    skills: [],
    bio: '',
  })
  
  const [answers, setAnswers] = useState<Answers>({})

  const totalSteps = QUESTIONS.length + 1
  const progress = ((step + 1) / (totalSteps + 1)) * 100

  const addSkill = () => {
    if (skillInput.trim() && profile.skills.length < 5) {
      setProfile(prev => ({
        ...prev,
        skills: [...prev.skills, skillInput.trim()],
      }))
      setSkillInput('')
    }
  }

  const removeSkill = (index: number) => {
    setProfile(prev => ({
      ...prev,
      skills: prev.skills.filter((_, i) => i !== index),
    }))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addSkill()
    }
  }

  const canProceed = () => {
    if (step === 0) {
      return profile.name && profile.role_title && profile.years_experience > 0 && profile.skills.length > 0 && profile.bio
    }
    const questionIndex = step - 1
    return answers[QUESTIONS[questionIndex].type]?.length > 50
  }

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1)
    }
  }

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1)
    }
  }

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.random().toString(36).substring(2, 8)
  }

  const handleSubmit = async () => {
    setLoading(true)
    const supabase = createClient()
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: twin, error: twinError } = await supabase
        .from('twins')
        .insert({
          user_id: user.id,
          name: profile.name,
          role_title: profile.role_title,
          years_experience: profile.years_experience,
          skills: profile.skills,
          bio: profile.bio,
          public_slug: generateSlug(profile.name),
        } as never)
        .select()
        .single()

      if (twinError) throw twinError

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const twinData = twin as any
      const answersToInsert = QUESTIONS.map(q => ({
        twin_id: twinData.id,
        question_type: q.type,
        question_text: q.text,
        answer_text: answers[q.type] || '',
      }))

      const { error: answersError } = await supabase
        .from('twin_answers')
        .insert(answersToInsert as never)

      if (answersError) throw answersError

      router.push('/dashboard')
    } catch (error) {
      console.error('Error creating twin:', error)
      alert('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 h-[2px] bg-[var(--border)] z-50">
        <div
          className="h-full bg-[var(--accent)] transition-all duration-700 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Header */}
      <header className="relative z-10 px-6 md:px-12 py-6 flex items-center justify-between">
        <span className="text-xs tracking-[0.3em] uppercase text-[var(--muted)]">
          Digital Twin
        </span>
        <span className="text-xs text-[var(--muted)]">
          {String(step + 1).padStart(2, '0')} / {String(totalSteps + 1).padStart(2, '0')}
        </span>
      </header>

      {/* Main content */}
      <main className="relative z-10 flex items-center justify-center px-6 py-12 min-h-[calc(100vh-120px)]">
        <div className="w-full max-w-xl">
          
          {/* Profile Step */}
          {step === 0 && (
            <div className="animate-fade-up">
              <p className="text-[10px] tracking-[0.5em] uppercase text-[var(--muted)] mb-4">Profile</p>
              <h1 className="font-serif text-4xl md:text-5xl font-light text-[var(--foreground)] leading-[1.1] mb-3">
                Let&apos;s begin with<br />
                <span className="italic text-[var(--accent)]">who you are</span>
              </h1>
              <p className="text-[var(--muted)] mb-10 text-sm leading-relaxed">
                This helps employers understand your background.
              </p>

              <div className="space-y-6">
                {/* Name */}
                <div>
                  <label className="block text-xs tracking-wider uppercase text-[var(--muted)] mb-2">
                    Full name
                  </label>
                  <input
                    type="text"
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    placeholder="Your name"
                    className="w-full px-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder-[var(--placeholder)] focus:outline-none focus:border-[var(--muted)] transition-colors"
                  />
                </div>

                {/* Role */}
                <div>
                  <label className="block text-xs tracking-wider uppercase text-[var(--muted)] mb-2">
                    Current role
                  </label>
                  <input
                    type="text"
                    value={profile.role_title}
                    onChange={(e) => setProfile({ ...profile, role_title: e.target.value })}
                    placeholder="Senior Software Engineer"
                    className="w-full px-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder-[var(--placeholder)] focus:outline-none focus:border-[var(--muted)] transition-colors"
                  />
                </div>

                {/* Years experience */}
                <div>
                  <label className="block text-xs tracking-wider uppercase text-[var(--muted)] mb-2">
                    Years of experience
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={profile.years_experience || ''}
                    onChange={(e) => setProfile({ ...profile, years_experience: parseInt(e.target.value) || 0 })}
                    placeholder="5"
                    className="w-full px-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder-[var(--placeholder)] focus:outline-none focus:border-[var(--muted)] transition-colors"
                  />
                </div>

                {/* Skills */}
                <div>
                  <label className="block text-xs tracking-wider uppercase text-[var(--muted)] mb-3">
                    Key skills <span className="normal-case tracking-normal text-[var(--muted)]">(up to 5)</span>
                  </label>
                  <div className="flex gap-2 mb-3 flex-wrap">
                    {profile.skills.map((skill, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-[var(--surface)] text-[var(--accent)] text-sm rounded-full border border-[var(--border)]"
                      >
                        {skill}
                        <button
                          onClick={() => removeSkill(i)}
                          className="text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  {profile.skills.length < 5 && (
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={skillInput}
                        onChange={(e) => setSkillInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Add a skill, press Enter"
                        className="flex-1 px-4 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder-[var(--placeholder)] focus:outline-none focus:border-[var(--muted)] transition-colors"
                      />
                      <button
                        onClick={addSkill}
                        className="text-sm text-[var(--accent)] hover:text-[var(--foreground)] transition-colors"
                      >
                        Add
                      </button>
                    </div>
                  )}
                </div>

                {/* Bio */}
                <div>
                  <label className="block text-xs tracking-wider uppercase text-[var(--muted)] mb-2">
                    Short bio
                  </label>
                  <textarea
                    value={profile.bio}
                    onChange={(e) => setProfile({ ...profile, bio: e.target.value.slice(0, 500) })}
                    placeholder="A brief summary of who you are..."
                    rows={3}
                    className="w-full px-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder-[var(--placeholder)] focus:outline-none focus:border-[var(--muted)] transition-colors resize-none leading-relaxed"
                  />
                  <p className="text-xs text-[var(--muted)] mt-1">{profile.bio.length}/500</p>
                </div>
              </div>
            </div>
          )}

          {/* Question Steps */}
          {step > 0 && step <= QUESTIONS.length && (
            <div className="animate-fade-up">
              <p className="text-[10px] tracking-[0.5em] uppercase text-[var(--muted)] mb-4">
                Question {step} of {QUESTIONS.length}
              </p>
              <h1 className="font-serif text-3xl md:text-4xl font-light text-[var(--foreground)] leading-[1.2] mb-3">
                {QUESTIONS[step - 1].text}
              </h1>
              <p className="text-[var(--muted)] mb-8 text-sm leading-relaxed">
                {QUESTIONS[step - 1].hint}
              </p>

              <textarea
                value={answers[QUESTIONS[step - 1].type] || ''}
                onChange={(e) => setAnswers({ ...answers, [QUESTIONS[step - 1].type]: e.target.value })}
                placeholder={QUESTIONS[step - 1].placeholder}
                rows={6}
                className="w-full px-4 py-4 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder-[var(--placeholder)] focus:outline-none focus:border-[var(--muted)] transition-colors resize-none text-lg leading-relaxed"
              />
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-[var(--muted)]">
                  {(answers[QUESTIONS[step - 1].type] || '').length} characters
                </p>
                {(answers[QUESTIONS[step - 1].type] || '').length < 50 && (
                  <p className="text-xs text-[var(--accent)]">minimum 50</p>
                )}
              </div>
            </div>
          )}

          {/* Complete Step */}
          {step === totalSteps && (
            <div className="animate-fade-up text-center">
              <div className="w-16 h-16 rounded-full bg-[var(--accent)]/10 flex items-center justify-center mx-auto mb-8">
                <svg className="w-8 h-8 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="font-serif text-4xl md:text-5xl font-light text-[var(--foreground)] mb-3">
                All set
              </h1>
              <p className="text-[var(--muted)] mb-10 text-sm">
                Your digital twin is ready to be created.
              </p>

              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 text-left mb-8">
                <h3 className="text-xs tracking-wider uppercase text-[var(--muted)] mb-4">Summary</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between border-b border-[var(--border)] pb-2">
                    <span className="text-[var(--muted)]">Name</span>
                    <span className="text-[var(--foreground)]">{profile.name}</span>
                  </div>
                  <div className="flex justify-between border-b border-[var(--border)] pb-2">
                    <span className="text-[var(--muted)]">Role</span>
                    <span className="text-[var(--foreground)]">{profile.role_title}</span>
                  </div>
                  <div className="flex justify-between border-b border-[var(--border)] pb-2">
                    <span className="text-[var(--muted)]">Experience</span>
                    <span className="text-[var(--foreground)]">{profile.years_experience} years</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <span className="text-[var(--muted)]">Skills</span>
                    <div className="flex flex-wrap gap-1 justify-end max-w-[60%]">
                      {profile.skills.map((skill, i) => (
                        <span key={i} className="px-2 py-0.5 bg-[var(--background)] text-[var(--accent)] text-xs rounded-full border border-[var(--border)]">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-12">
            {step > 0 ? (
              <button
                onClick={handleBack}
                className="inline-flex items-center gap-3 text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors group"
              >
                <span className="w-6 h-px bg-current group-hover:w-10 transition-all duration-300" />
                Back
              </button>
            ) : (
              <div />
            )}

            {step < totalSteps ? (
              <button
                onClick={handleNext}
                disabled={!canProceed()}
                className="inline-flex items-center gap-3 text-sm text-[var(--foreground)] hover:text-[var(--accent)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed group"
              >
                Continue
                <span className="w-6 h-px bg-current group-hover:w-10 transition-all duration-300" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="px-8 py-4 bg-[var(--accent)] text-[var(--background)] text-sm rounded-full hover:opacity-90 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Create my twin'}
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
