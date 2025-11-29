# Digital Twin MVP - Setup Guide

## Quick Start

### 1. Environment Variables

Create a `.env.local` file in the `digital-twin` folder with:

```bash
# Supabase (get these from your Supabase dashboard)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Anthropic
ANTHROPIC_API_KEY=your_anthropic_api_key

# ElevenLabs (for voice mode)
ELEVENLABS_API_KEY=your_elevenlabs_api_key

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 2. Supabase Setup

The database schema has already been applied to your Supabase project. 

**Enable Email Auth:**
1. Go to Supabase Dashboard → Authentication → Providers
2. Enable "Email" provider
3. Under "Email Auth", enable "Confirm email" (for magic links)
4. In URL Configuration, set:
   - Site URL: `http://localhost:3000`
   - Redirect URLs: `http://localhost:3000/auth/callback`

### 3. Run the App

```bash
cd digital-twin
npm run dev
```

Visit `http://localhost:3000`

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx                    # Landing page
│   ├── auth/
│   │   ├── login/page.tsx          # Magic link login
│   │   └── callback/route.ts       # Auth callback
│   ├── onboarding/page.tsx         # Multi-step twin creation
│   ├── dashboard/                  # Candidate dashboard
│   ├── twin/[slug]/                # Public twin page
│   │   └── chat/[sessionId]/       # Chat interface
│   └── api/
│       ├── answer/route.ts         # AI response generation (text)
│       ├── voice/turn/route.ts     # Voice: STT → AI → TTS
│       └── feedback/route.ts       # Session feedback
├── lib/supabase/                   # Supabase client utilities
└── types/database.ts               # TypeScript types
```

---

## Features

**Candidate Flow:**
- Sign up with magic link email
- Create profile (name, role, experience, skills, bio)
- Answer 5 style-capture questions
- Get shareable link

**Employer Flow:**
- Visit shared link
- Enter name to start session
- Ask up to 10 questions
- Get AI-generated responses in candidate's style
- Leave rating and feedback

---

## Voice Mode Setup (Optional)

To enable voice conversations with the digital twin:

1. **Get ElevenLabs API Key:**
   - Sign up at [elevenlabs.io](https://elevenlabs.io)
   - Go to Settings → API Keys → Create new key
   - Add to `.env.local`: `ELEVENLABS_API_KEY=your_key`

2. **Clone Your Voice:**
   - In ElevenLabs, go to Voices → Add Voice → Instant Voice Clone
   - Upload voice samples (minimum 1 minute of clean audio)
   - Copy the Voice ID from the voice settings

3. **Link Voice to Twin:**
   - Update your twin's `elevenlabs_voice_id` in the database
   - In Supabase SQL Editor:
     ```sql
     UPDATE twins SET elevenlabs_voice_id = 'your_voice_id' WHERE public_slug = 'your-slug';
     ```

Once configured, the mic button in chat will be enabled for hold-to-talk voice input.

---

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Magic Links
- **AI:** Anthropic Claude
- **Voice:** ElevenLabs (STT + TTS)
- **Styling:** Tailwind CSS

