import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const ELEVEN_API = 'https://api.elevenlabs.io/v1'

// ElevenLabs STT (batch - still a bottleneck, but harder to fix)
async function transcribeAudio(audioBuffer: ArrayBuffer): Promise<string> {
  const elevenKey = process.env.ELEVENLABS_API_KEY
  if (!elevenKey) throw new Error('ELEVENLABS_API_KEY not configured')

  const formData = new FormData()
  formData.append('model_id', 'scribe_v1')
  formData.append('file', new Blob([audioBuffer], { type: 'audio/webm' }), 'audio.webm')

  const resp = await fetch(`${ELEVEN_API}/speech-to-text`, {
    method: 'POST',
    headers: { 'xi-api-key': elevenKey },
    body: formData,
  })

  if (!resp.ok) {
    const text = await resp.text()
    throw new Error(`STT failed: ${resp.status} ${text}`)
  }

  const json = await resp.json()
  if (!json.text) throw new Error('STT: missing text field')
  return json.text as string
}

// Stream TTS for a single sentence, yield audio chunks
async function* streamTTSForSentence(text: string, voiceId: string): AsyncGenerator<Uint8Array> {
  const elevenKey = process.env.ELEVENLABS_API_KEY
  if (!elevenKey) throw new Error('ELEVENLABS_API_KEY not configured')

  const resp = await fetch(`${ELEVEN_API}/text-to-speech/${voiceId}/stream`, {
    method: 'POST',
    headers: {
      'xi-api-key': elevenKey,
      'Content-Type': 'application/json',
      'Accept': 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_flash_v2_5',
      output_format: 'mp3_44100_64',
    }),
  })

  if (!resp.ok || !resp.body) {
    throw new Error(`TTS failed: ${resp.status}`)
  }

  const reader = resp.body.getReader()
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    if (value) yield value
  }
}

// Detect sentence boundaries - returns [complete sentences, remaining buffer]
function extractSentences(buffer: string): [string[], string] {
  const sentenceEnders = /([.!?])\s+/g
  const sentences: string[] = []
  let lastIndex = 0
  let match

  while ((match = sentenceEnders.exec(buffer)) !== null) {
    const sentence = buffer.slice(lastIndex, match.index + 1).trim()
    if (sentence.length > 0) {
      sentences.push(sentence)
    }
    lastIndex = match.index + match[0].length
  }

  const remaining = buffer.slice(lastIndex)
  return [sentences, remaining]
}

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const audioFile = formData.get('audio') as File | null
  const sessionId = formData.get('session_id') as string | null
  const realtimeTranscript = formData.get('transcript') as string | null

  if (!audioFile || !sessionId) {
    return new Response('Missing audio or session_id', { status: 400 })
  }

  const supabase = await createClient()

  // Get session and twin data
  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select(`*, twins (*, twin_answers (*))`)
    .eq('id', sessionId)
    .single()

  if (sessionError || !session) {
    return new Response('Session not found', { status: 404 })
  }

  const twin = (session as any).twins
  if (!twin.elevenlabs_voice_id) {
    return new Response('Voice not configured', { status: 400 })
  }

  // Check message limit
  const { count } = await supabase
    .from('session_messages')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', sessionId)
    .eq('sender', 'employer')

  if (count && count >= 10) {
    return new Response(JSON.stringify({ limitReached: true }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // 1) STT - use real-time transcript if provided, otherwise batch transcribe
  let userTranscript: string
  
  if (realtimeTranscript && realtimeTranscript.trim()) {
    // Skip batch STT - use the real-time transcript from client
    userTranscript = realtimeTranscript.trim()
  } else {
    // Fall back to batch STT
    const audioBuffer = await audioFile.arrayBuffer()
    try {
      userTranscript = await transcribeAudio(audioBuffer)
    } catch (err) {
      console.error('STT error:', err)
      return new Response('Transcription failed', { status: 500 })
    }
  }

  if (!userTranscript.trim()) {
    return new Response('Empty transcript', { status: 400 })
  }

  // Save employer message
  await supabase.from('session_messages').insert({
    session_id: sessionId,
    sender: 'employer',
    message_text: userTranscript,
  } as any)

  // Build Claude prompt
  const qaContext = twin.twin_answers
    .map((qa: { question_text: string; answer_text: string }) =>
      `Q: ${qa.question_text}\nA: ${qa.answer_text}`
    )
    .join('\n\n')

  const systemPrompt = `You are roleplaying as ${twin.name}, a ${twin.role_title} with ${twin.years_experience} years of experience.

Here is their background:
Bio: ${twin.bio}
Skills: ${twin.skills.join(', ')}

Here are examples of how they answer questions in their own voice:

${qaContext}

Your job is to answer interview questions as if you ARE this person. Match their communication style, tone, and level of detail based on the examples above. Be authentic and conversational.

CRITICAL: Keep answers to 1-2 sentences MAX. This is voice - be brief.
Do not break character or mention that you are an AI.`

  // Create streaming response
  const voiceId = twin.elevenlabs_voice_id
  let fullAnswerText = ''
  let ttsQueue = Promise.resolve()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // 2) Stream Claude response
        const claudeStream = anthropic.messages.stream({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 200,
          system: systemPrompt,
          messages: [{ role: 'user', content: userTranscript }],
        })

        let tokenBuffer = ''
        const processedSentences = new Set<string>()

        // Process Claude tokens as they arrive
        for await (const event of claudeStream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            const text = event.delta.text
            tokenBuffer += text
            fullAnswerText += text

            // Check for complete sentences
            const [sentences, remaining] = extractSentences(tokenBuffer)
            tokenBuffer = remaining

            // Stream TTS for each new sentence immediately
            for (const sentence of sentences) {
              if (!processedSentences.has(sentence) && sentence.length > 0) {
                processedSentences.add(sentence)
                
                // Queue audio streaming without blocking Claude token consumption
                ttsQueue = ttsQueue.then(async () => {
                  for await (const chunk of streamTTSForSentence(sentence, voiceId)) {
                    controller.enqueue(chunk)
                  }
                })
              }
            }
          }
        }

        // Handle any remaining text (final fragment without sentence ender)
        if (tokenBuffer.trim().length > 0 && !processedSentences.has(tokenBuffer.trim())) {
          ttsQueue = ttsQueue.then(async () => {
            for await (const chunk of streamTTSForSentence(tokenBuffer.trim(), voiceId)) {
              controller.enqueue(chunk)
            }
          })
          fullAnswerText = fullAnswerText // already includes it
        }

        // Wait for all queued audio to flush
        await ttsQueue

        // Save twin's full response to DB
        await supabase.from('session_messages').insert({
          session_id: sessionId,
          sender: 'twin',
          message_text: fullAnswerText,
        } as any)

        controller.close()
      } catch (err) {
        console.error('Streaming error:', err)
        controller.error(err)
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache',
      'X-User-Transcript': encodeURIComponent(userTranscript),
      'Access-Control-Expose-Headers': 'X-User-Transcript',
    },
  })
}
