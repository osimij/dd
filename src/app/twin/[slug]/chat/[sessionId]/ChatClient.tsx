'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

interface Twin {
  id: string
  name: string
  role_title: string
  years_experience: number
  skills: string[]
  bio: string
  public_slug: string
  elevenlabs_voice_id: string | null
}

interface Session {
  id: string
  employer_name: string
  created_at: string
}

interface Message {
  id: string
  sender: string
  message_text: string
  created_at: string
}

interface Props {
  twin: Twin
  session: Session
  initialMessages: Message[]
  hasFeedback: boolean
}

// Main Voice Orb - Line-based visualization
function VoiceOrb({ 
  state, 
  isRecording 
}: { 
  state: 'idle' | 'listening' | 'thinking' | 'speaking'
  isRecording: boolean
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(undefined)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Get colors based on system theme
    const getColors = () => {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      return {
        primary: isDark ? [196, 168, 138] : [107, 83, 68],
        secondary: isDark ? [166, 152, 136] : [139, 115, 85],
        tertiary: isDark ? [122, 112, 104] : [166, 144, 128],
      }
    }
    let colors = getColors()
    const colorSchemeQuery = window.matchMedia('(prefers-color-scheme: dark)')
    colorSchemeQuery.addEventListener('change', () => { colors = getColors() })

    const size = 400
    canvas.width = size * 2
    canvas.height = size * 2
    ctx.scale(2, 2)

    let frame = 0
    const numLines = 48
    const amplitudes = new Array(numLines).fill(0)

    const draw = () => {
      ctx.clearRect(0, 0, size, size)
      const cx = size / 2
      const cy = size / 2
      const time = frame * 0.025

      // Update amplitudes based on state
      amplitudes.forEach((_, i) => {
        let target = 0
        if (state === 'speaking') {
          // Dynamic, energetic movement
          target = 0.5 + Math.sin(time * 4 + i * 0.3) * 0.3 + Math.sin(time * 7 + i * 0.5) * 0.2
          amplitudes[i] += (target - amplitudes[i]) * 0.15
        } else if (state === 'listening' || isRecording) {
          // Responsive, reactive movement
          target = 0.3 + Math.sin(time * 3 + i * 0.4) * 0.2 + Math.random() * 0.15
          amplitudes[i] += (target - amplitudes[i]) * 0.12
        } else if (state === 'thinking') {
          // Slow, pulsing movement
          target = 0.2 + Math.sin(time * 1.5 + i * 0.15) * 0.1
          amplitudes[i] += (target - amplitudes[i]) * 0.05
        } else {
          // Gentle breathing
          target = 0.1 + Math.sin(time * 0.8 + i * 0.1) * 0.05
          amplitudes[i] += (target - amplitudes[i]) * 0.03
        }
      })

      const innerRadius = 60
      const maxLineLength = 80

      // Draw radiating lines
      ctx.lineCap = 'round'
      
      for (let i = 0; i < numLines; i++) {
        const angle = (i / numLines) * Math.PI * 2 - Math.PI / 2
        const amplitude = amplitudes[i]
        const lineLength = maxLineLength * amplitude
        
        // Start point (on inner circle)
        const x1 = cx + Math.cos(angle) * innerRadius
        const y1 = cy + Math.sin(angle) * innerRadius
        
        // End point (radiating outward)
        const x2 = cx + Math.cos(angle) * (innerRadius + lineLength)
        const y2 = cy + Math.sin(angle) * (innerRadius + lineLength)
        
        // Line thickness and opacity based on amplitude
        const thickness = 1.5 + amplitude * 2
        const opacity = 0.4 + amplitude * 0.5
        
        ctx.beginPath()
        ctx.strokeStyle = `rgba(${colors.primary[0]}, ${colors.primary[1]}, ${colors.primary[2]}, ${opacity})`
        ctx.lineWidth = thickness
        ctx.moveTo(x1, y1)
        ctx.lineTo(x2, y2)
        ctx.stroke()
      }

      // Inner circle outline
      ctx.beginPath()
      ctx.strokeStyle = `rgba(${colors.primary[0]}, ${colors.primary[1]}, ${colors.primary[2]}, 0.3)`
      ctx.lineWidth = 1.5
      ctx.arc(cx, cy, innerRadius, 0, Math.PI * 2)
      ctx.stroke()

      // Center dot - pulses with state
      const dotSize = state === 'speaking' ? 10 + Math.sin(time * 5) * 2 : 
                      state === 'listening' ? 8 + Math.sin(time * 3) * 1.5 : 
                      state === 'thinking' ? 6 + Math.sin(time * 2) * 1 : 5
      const dotOpacity = state === 'speaking' ? 1 : state === 'listening' ? 0.8 : 0.5
      
      ctx.beginPath()
      ctx.fillStyle = `rgba(${colors.primary[0]}, ${colors.primary[1]}, ${colors.primary[2]}, ${dotOpacity})`
      ctx.arc(cx, cy, dotSize, 0, Math.PI * 2)
      ctx.fill()

      frame++
      animationRef.current = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [state, isRecording])

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        className="w-[400px] h-[400px]"
        style={{ width: 400, height: 400 }}
      />
    </div>
  )
}

// State label under the orb
function StateLabel({ state, twinName }: { state: 'idle' | 'listening' | 'thinking' | 'speaking'; twinName: string }) {
  const labels = {
    idle: 'Ready to talk',
    listening: 'Listening...',
    thinking: 'Thinking...',
    speaking: `${twinName} is speaking`,
  }

  const colors = {
    idle: 'text-[var(--muted)]',
    listening: 'text-[var(--accent)]',
    thinking: 'text-[var(--muted)]',
    speaking: 'text-[var(--accent)]',
  }

  return (
    <div className="flex items-center justify-center gap-3">
      <div className={`w-2 h-2 rounded-full transition-all duration-300 ${
        state === 'speaking' ? 'bg-[var(--accent)] animate-pulse scale-125' :
        state === 'listening' ? 'bg-[var(--muted)]' :
        state === 'thinking' ? 'bg-[var(--muted)] animate-pulse' :
        'bg-[var(--border)]'
      }`} />
      <span className={`text-sm tracking-wide transition-colors duration-300 ${colors[state]}`}>
        {labels[state]}
      </span>
    </div>
  )
}

export default function ChatClient({ twin, session, initialMessages, hasFeedback }: Props) {
  const router = useRouter()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [limitReached, setLimitReached] = useState(false)
  const [showEndModal, setShowEndModal] = useState(false)
  const [conversationState, setConversationState] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle')
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTooShort, setRecordingTooShort] = useState(false)
  const [showTranscript, setShowTranscript] = useState(true)
  const [partialTranscript, setPartialTranscript] = useState('')
  const [realtimeActive, setRealtimeActive] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const recordingStartTime = useRef<number>(0)
  const wsRef = useRef<WebSocket | null>(null)
  const finalTranscriptRef = useRef<string>('')
  const audioContextRef = useRef<AudioContext | null>(null)
  const workletNodeRef = useRef<AudioWorkletNode | null>(null)
  const workletSourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const silenceGainRef = useRef<GainNode | null>(null)
  const mediaSourceRef = useRef<MediaSource | null>(null)
  const sourceBufferReadyRef = useRef<Promise<void> | null>(null)

  const employerQuestionCount = messages.filter(m => m.sender === 'employer').length
  const hasVoice = Boolean(twin.elevenlabs_voice_id)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const closeRealtimeSocket = useCallback(() => {
    if (wsRef.current) {
      try {
        if (wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'stop' }))
        }
        wsRef.current.close()
      } catch (err) {
        console.error('Error closing realtime socket:', err)
      }
      wsRef.current = null
    }
  }, [])

  const teardownAudioGraph = useCallback(() => {
    try {
      workletNodeRef.current?.disconnect()
      workletSourceRef.current?.disconnect()
      silenceGainRef.current?.disconnect()
      audioContextRef.current?.close()
    } catch (err) {
      console.error('Failed to tear down audio graph:', err)
    }
    workletNodeRef.current = null
    workletSourceRef.current = null
    silenceGainRef.current = null
    audioContextRef.current = null
  }, [])

  useEffect(() => {
    return () => {
      closeRealtimeSocket()
      teardownAudioGraph()
    }
  }, [closeRealtimeSocket, teardownAudioGraph])

  // Start recording with ElevenLabs Scribe Realtime v2 (PCM via AudioWorklet)
  const startRecording = useCallback(async () => {
    if (!hasVoice || loading || limitReached) return
    
    try {
      setPartialTranscript('')
      finalTranscriptRef.current = ''
      setRealtimeActive(false)

      // Open proxy websocket (Cloudflare Worker keeps API key server-side)
      let ws: WebSocket | null = null
      try {
        ws = new WebSocket('wss://scribe-proxy.osimijasur.workers.dev')
        wsRef.current = ws

        let wsReady = false
        await new Promise<void>((resolve) => {
          ws!.onopen = () => {
            wsReady = true
            resolve()
          }
          ws!.onerror = () => {
            // Expected when runtime doesn’t support WS upgrade; silently fall back
            wsReady = false
            resolve()
          }
        })

        if (wsReady) {
          ws.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data)
              if (data.type === 'partial') {
                setPartialTranscript(data.text || '')
              } else if (data.type === 'final' || data.type === 'transcript') {
                const text = data.text || data.transcript || ''
                if (text) {
                  finalTranscriptRef.current = text
                  setPartialTranscript(text)
                }
              }
            } catch (err) {
              console.error('Realtime message parse error:', err)
            }
          }
        } else {
          wsRef.current = null
        }
      } catch (err) {
        // Realtime unavailable; fall back to batch STT
        wsRef.current = null
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        }
      })

      // Build AudioWorklet graph to emit PCM 16k frames
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        try {
          const audioContext = new AudioContext()
          audioContextRef.current = audioContext
          await audioContext.audioWorklet.addModule('/worklets/pcm-processor.js')

          const source = audioContext.createMediaStreamSource(stream)
          workletSourceRef.current = source
          const worklet = new AudioWorkletNode(audioContext, 'pcm-processor', {
            processorOptions: { targetSampleRate: 16000 },
          })
          workletNodeRef.current = worklet

          const silenceGain = audioContext.createGain()
          silenceGain.gain.value = 0
          silenceGainRef.current = silenceGain

          worklet.port.onmessage = (event) => {
            const buffer = event.data as ArrayBuffer
            if (wsRef.current?.readyState === WebSocket.OPEN) {
              wsRef.current.send(buffer)
            }
          }

          source.connect(worklet)
          worklet.connect(silenceGain)
          silenceGain.connect(audioContext.destination)
          setRealtimeActive(true)
        } catch (err) {
          console.error('Failed to initialize realtime audio graph:', err)
          teardownAudioGraph()
          closeRealtimeSocket()
          setRealtimeActive(false)
        }
      } else {
        setRealtimeActive(false)
      }
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []
      recordingStartTime.current = Date.now()
      setRecordingTooShort(false)

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop())
        closeRealtimeSocket()
        teardownAudioGraph()
        
        const duration = Date.now() - recordingStartTime.current
        if (duration < 500) {
          setRecordingTooShort(true)
          setConversationState('idle')
          setTimeout(() => setRecordingTooShort(false), 2000)
          return
        }
        
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        if (blob.size < 1000) {
          setRecordingTooShort(true)
          setConversationState('idle')
          setTimeout(() => setRecordingTooShort(false), 2000)
          return
        }
        
        await sendVoiceTurn(blob, realtimeActive ? finalTranscriptRef.current : undefined)
      }

      mediaRecorder.start(250)
      setIsRecording(true)
      setConversationState('listening')
    } catch (err) {
      console.error('Failed to start recording:', err)
      closeRealtimeSocket()
      teardownAudioGraph()
      alert('Could not access microphone. Please allow microphone access.')
    }
  }, [hasVoice, loading, limitReached, closeRealtimeSocket, teardownAudioGraph])

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    setIsRecording(false)
    closeRealtimeSocket()
  }, [closeRealtimeSocket])

  // Send voice turn with streaming audio (faster path)
  const sendVoiceTurn = async (blob: Blob, transcript?: string) => {
    setLoading(true)
    setConversationState('thinking')

    const formData = new FormData()
    formData.append('audio', blob, 'audio.webm')
    formData.append('session_id', session.id)
    if (transcript && transcript.trim()) {
      formData.append('transcript', transcript.trim())
    }

    try {
      const response = await fetch('/api/voice/turn-stream', {
        method: 'POST',
        body: formData,
      })

      // Check for limit reached (JSON error response)
      if (response.status === 400) {
        const contentType = response.headers.get('content-type')
        if (contentType?.includes('application/json')) {
          const data = await response.json()
          if (data.limitReached) {
            setLimitReached(true)
            setConversationState('idle')
            setLoading(false)
            return
          }
        }
        throw new Error('Request failed')
      }

      if (!response.ok || !response.body) {
        throw new Error('Request failed')
      }

      // Get user transcript from header (or reuse provided transcript)
      const userTranscript = transcript?.trim() || decodeURIComponent(
        response.headers.get('X-User-Transcript') || ''
      )

      if (userTranscript) {
        setMessages(prev => [
          ...prev,
          {
            id: `voice-q-${Date.now()}`,
            sender: 'employer',
            message_text: userTranscript,
            created_at: new Date().toISOString(),
          },
        ])
      }

      // Stream audio chunks into MediaSource for immediate playback
      const mediaSource = new MediaSource()
      mediaSourceRef.current = mediaSource
      const audio = new Audio()
      audioRef.current = audio
      const objectUrl = URL.createObjectURL(mediaSource)
      audio.src = objectUrl
      audio.volume = 1

      const reader = response.body.getReader()

      const appendChunk = (sourceBuffer: SourceBuffer, chunk: Uint8Array) => {
        sourceBufferReadyRef.current = (sourceBufferReadyRef.current || Promise.resolve()).then(() => {
          return new Promise<void>((resolve, reject) => {
            const onUpdate = () => {
              sourceBuffer.removeEventListener('updateend', onUpdate)
              resolve()
            }
            const onError = () => {
              sourceBuffer.removeEventListener('error', onError)
              reject(new Error('SourceBuffer error'))
            }
            sourceBuffer.addEventListener('updateend', onUpdate, { once: true })
            sourceBuffer.addEventListener('error', onError, { once: true })
            sourceBuffer.appendBuffer(chunk.buffer as ArrayBuffer)
          })
        })
        return sourceBufferReadyRef.current
      }

      mediaSource.addEventListener('sourceopen', async () => {
        try {
          const sourceBuffer = mediaSource.addSourceBuffer('audio/mpeg')
          setConversationState('speaking')

          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            if (value) {
              await appendChunk(sourceBuffer, value)
            }
          }

          await (sourceBufferReadyRef.current || Promise.resolve())
          mediaSource.endOfStream()
        } catch (err) {
          console.error('MediaSource error:', err)
          setConversationState('idle')
          mediaSource.endOfStream()
        }
      }, { once: true })

      audio.onended = () => {
        setConversationState('idle')
        URL.revokeObjectURL(objectUrl)
        mediaSourceRef.current = null
        sourceBufferReadyRef.current = null
      }
      audio.onerror = (e) => {
        console.error('Audio playback error:', e)
        setConversationState('idle')
        URL.revokeObjectURL(objectUrl)
        mediaSourceRef.current = null
        sourceBufferReadyRef.current = null
      }

      audio.play().catch((err) => {
        console.error('Failed to play audio:', err)
        setConversationState('idle')
        URL.revokeObjectURL(objectUrl)
        mediaSourceRef.current = null
        sourceBufferReadyRef.current = null
      })

      // Add twin's response to transcript (text not streamed in this endpoint, 
      // but saved to DB - refresh messages to get it)
      const { data: latestMessages } = await supabase
        .from('session_messages')
        .select('*')
        .eq('session_id', session.id)
        .order('created_at', { ascending: true })

      if (latestMessages) {
        setMessages(latestMessages as Message[])
      }

      if (employerQuestionCount + 1 >= 10) {
        setLimitReached(true)
      }
    } catch (error) {
      console.error('Voice turn error:', error)
      setConversationState('idle')
      alert('Failed to process voice. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Text fallback
  const simulateSpeaking = useCallback(() => {
    setConversationState('speaking')
    setTimeout(() => setConversationState('idle'), 3000)
  }, [])

  const sendMessage = async () => {
    if (!input.trim() || loading || limitReached) return

    const questionText = input.trim()
    setInput('')
    setLoading(true)
    setConversationState('thinking')

    const tempId = `temp-${Date.now()}`
    setMessages(prev => [...prev, {
      id: tempId,
      sender: 'employer',
      message_text: questionText,
      created_at: new Date().toISOString(),
    }])

    try {
      const response = await fetch('/api/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: session.id,
          question_text: questionText,
        }),
      })

      const data = await response.json()

      if (data.limitReached) {
        setLimitReached(true)
        setConversationState('idle')
        return
      }

      if (data.error) {
        throw new Error(data.error)
      }

      setMessages(prev => [...prev, {
        id: `response-${Date.now()}`,
        sender: 'twin',
        message_text: data.answer,
        created_at: new Date().toISOString(),
      }])

      simulateSpeaking()

      if (employerQuestionCount + 1 >= 10) {
        setLimitReached(true)
      }
    } catch (error) {
      console.error('Error sending message:', error)
      setMessages(prev => prev.filter(m => m.id !== tempId))
      setConversationState('idle')
      alert('Failed to get a response. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const endSession = () => {
    if (hasFeedback) {
      router.push(`/twin/${twin.public_slug}`)
    } else {
      setShowEndModal(true)
    }
  }

  return (
    <div className="h-screen bg-[var(--background)] flex overflow-hidden">
      {/* Main Call Area - Voice Orb Centered */}
      <div className="flex-1 flex flex-col relative">
        {/* Header - Minimal */}
        <header className="absolute top-0 left-0 right-0 z-10 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
            <span className="text-[var(--muted)] text-sm">Live session</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[var(--muted)] text-xs">{employerQuestionCount}/10</span>
            <div className="w-20 h-1 bg-[var(--border)] rounded-full overflow-hidden">
              <div 
                className="h-full bg-[var(--accent)] transition-all duration-500"
                style={{ width: `${(employerQuestionCount / 10) * 100}%` }}
              />
            </div>
          </div>
          <button
            onClick={endSession}
            className="px-4 py-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)] border border-[var(--border)] hover:border-[var(--muted)] rounded-full transition-all"
          >
            End call
          </button>
        </header>

        {/* Voice Orb - Center Stage */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <VoiceOrb state={conversationState} isRecording={isRecording} />
          
          <div className="mt-8 text-center">
            <h1 className="font-serif text-3xl text-[var(--foreground)] mb-1">{twin.name}</h1>
            <p className="text-[var(--muted)] text-sm mb-6">{twin.role_title}</p>
            <StateLabel state={conversationState} twinName={twin.name.split(' ')[0]} />
          </div>

          {/* Real-time Transcript Display */}
          {realtimeActive && isRecording && partialTranscript && (
            <div className="mt-4 px-6 py-3 max-w-md mx-auto">
              <p className="text-[var(--foreground)] text-sm text-center italic opacity-80">
                "{partialTranscript}"
              </p>
            </div>
          )}

          {/* Recording Too Short Feedback */}
          {recordingTooShort && (
            <div className="mt-4 px-4 py-2 bg-amber-900/20 border border-amber-700/30 rounded-full">
              <span className="text-amber-500 text-sm">Hold longer to record</span>
            </div>
          )}

          {/* Voice Controls */}
          <div className="mt-12 flex items-center gap-4">
            {/* Push-to-talk Button */}
            <button
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              onMouseLeave={stopRecording}
              onTouchStart={startRecording}
              onTouchEnd={stopRecording}
              disabled={!hasVoice || loading || limitReached}
              className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-200 ${
                !hasVoice 
                  ? 'bg-[var(--border)] text-[var(--muted)] cursor-not-allowed'
                  : isRecording
                    ? 'bg-red-500 text-white scale-110 shadow-lg shadow-red-500/30'
                    : 'bg-[var(--accent)] text-[var(--background)] hover:opacity-90 hover:scale-105'
              }`}
              title={hasVoice ? (isRecording ? 'Release to send' : 'Hold to talk') : 'Voice not configured'}
            >
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
              </svg>
            </button>
          </div>

          {isRecording && (
            <p className="mt-4 text-[var(--accent)] text-sm animate-pulse">Release to send</p>
          )}
        </div>

        {/* Text Input - Minimal, at bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="max-w-md mx-auto">
            {limitReached ? (
              <div className="text-center">
                <p className="text-[var(--muted)] mb-3 text-sm">Session limit reached</p>
                <button
                  onClick={endSession}
                  className="px-6 py-3 bg-[var(--accent)] text-[var(--background)] rounded-full text-sm hover:opacity-90 transition-colors"
                >
                  End & leave feedback
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                  placeholder="Or type a message..."
                  className="flex-1 px-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-full text-[var(--foreground)] placeholder-[var(--placeholder)] focus:outline-none focus:border-[var(--muted)] text-sm"
                    disabled={loading}
                  />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || loading}
                  className="w-12 h-12 bg-[var(--border)] rounded-full flex items-center justify-center text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Transcript Panel - Side */}
      <div className={`w-[380px] border-l border-[var(--border)] flex flex-col bg-[var(--surface)] transition-all duration-300 ${showTranscript ? '' : 'hidden lg:flex'}`}>
        {/* Panel Header */}
        <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <h2 className="text-[var(--muted)] text-sm font-medium">Transcript</h2>
          <button 
            onClick={() => setShowTranscript(!showTranscript)}
            className="text-[var(--muted)] hover:text-[var(--accent)] transition-colors lg:hidden"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-auto px-5 py-4">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 rounded-full bg-[var(--border)] flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-[var(--muted)] text-sm">Hold the mic button to start talking</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`${message.sender === 'employer' ? 'text-right' : ''}`}
                >
                  <span className="text-[10px] uppercase tracking-wider text-[var(--muted)] mb-1 block">
                    {message.sender === 'employer' ? 'You' : twin.name.split(' ')[0]}
                  </span>
                  <div
                    className={`inline-block px-4 py-2.5 rounded-2xl max-w-[90%] ${
                      message.sender === 'employer'
                        ? 'bg-[var(--accent)] text-[var(--background)]'
                        : 'bg-[var(--border)] text-[var(--foreground)]'
                    }`}
                  >
                    <p className="text-sm leading-relaxed">{message.message_text}</p>
                  </div>
                </div>
              ))}
              
              {loading && (
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-[var(--muted)] mb-1 block">
                    {twin.name.split(' ')[0]}
                  </span>
                  <div className="inline-block px-4 py-3 bg-[var(--border)] rounded-2xl">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-[var(--muted)] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-[var(--muted)] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-[var(--muted)] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Twin Info - Collapsed */}
        <div className="px-5 py-4 border-t border-[var(--border)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--muted)] to-[var(--accent)] flex items-center justify-center">
              <span className="text-[var(--background)] text-sm font-medium">
                {twin.name.split(' ').map(n => n[0]).join('')}
              </span>
            </div>
            <div>
              <p className="text-[var(--foreground)] text-sm font-medium">{twin.name}</p>
              <p className="text-[var(--muted)] text-xs">{twin.years_experience} yrs · {twin.skills.slice(0, 2).join(', ')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Transcript Toggle */}
      <button
        onClick={() => setShowTranscript(!showTranscript)}
        className="lg:hidden fixed bottom-24 right-4 w-12 h-12 bg-[var(--border)] rounded-full flex items-center justify-center text-[var(--muted)] shadow-lg z-20"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </button>

      {/* End Session Modal */}
      {showEndModal && (
        <EndSessionModal 
          sessionId={session.id} 
          twinSlug={twin.public_slug}
          onClose={() => setShowEndModal(false)} 
        />
      )}
    </div>
  )
}

// End session modal
function EndSessionModal({ 
  sessionId, 
  twinSlug,
  onClose 
}: { 
  sessionId: string
  twinSlug: string
  onClose: () => void 
}) {
  const router = useRouter()
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)

  const submitFeedback = async () => {
    if (rating === 0) return
    
    setLoading(true)

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          rating,
          comment_text: comment || null,
        }),
      })

      if (!response.ok) throw new Error('Failed to submit feedback')

      router.push(`/twin/${twinSlug}?feedback=success`)
    } catch (error) {
      console.error('Error submitting feedback:', error)
      alert('Failed to submit feedback. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--foreground)]/40 backdrop-blur-sm">
      <div className="bg-[var(--background)] border border-[var(--border)] rounded-2xl p-8 w-full max-w-md animate-fade-up">
        <h2 className="font-serif text-2xl text-[var(--foreground)] mb-2">How was the call?</h2>
        <p className="text-[var(--muted)] mb-8 text-sm">Your feedback helps improve the experience.</p>

        {/* Rating */}
        <div className="mb-6">
          <label className="block text-xs uppercase tracking-wider text-[var(--muted)] mb-3">
            Rate this session
          </label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                className="p-1 transition-transform hover:scale-110"
              >
                <svg
                  className={`w-8 h-8 transition-colors ${star <= rating ? 'text-[var(--accent)]' : 'text-[var(--border)]'}`}
                  fill={star <= rating ? 'currentColor' : 'none'}
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                  />
                </svg>
              </button>
            ))}
          </div>
        </div>

        {/* Comment */}
        <div className="mb-8">
          <label className="block text-xs uppercase tracking-wider text-[var(--muted)] mb-2">
            Comments <span className="normal-case tracking-normal text-[var(--muted)]">(optional)</span>
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share your thoughts..."
            rows={3}
            className="w-full px-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder-[var(--placeholder)] focus:outline-none focus:border-[var(--muted)] transition-colors resize-none text-sm"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
          >
            Skip
          </button>
          <button
            onClick={submitFeedback}
            disabled={rating === 0 || loading}
            className="flex-1 px-4 py-3 bg-[var(--accent)] text-[var(--background)] rounded-full text-sm hover:opacity-90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {loading ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  )
}
