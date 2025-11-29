import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const ELEVEN_API = 'https://api.elevenlabs.io/v1'

// ElevenLabs STT
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

// SSE helper - send event
function sseEvent(event: string, data: object): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
}

export async function POST(request: Request) {
  const formData = await request.formData()
  const audioFile = formData.get('audio') as File | null
  const sessionId = formData.get('session_id') as string | null

  if (!audioFile || !sessionId) {
    return new Response(
      sseEvent('error', { error: 'Missing audio or session_id' }),
      { status: 400, headers: { 'Content-Type': 'text/event-stream' } }
    )
  }

  const supabase = await createClient()

  // Get session and twin data
  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select(`*, twins (*, twin_answers (*))`)
    .eq('id', sessionId)
    .single()

  if (sessionError || !session) {
    return new Response(
      sseEvent('error', { error: 'Session not found' }),
      { status: 404, headers: { 'Content-Type': 'text/event-stream' } }
    )
  }

  const twin = (session as any).twins
  const twinAnswers = twin.twin_answers

  if (!twin.elevenlabs_voice_id) {
    return new Response(
      sseEvent('error', { error: 'Voice not configured', code: 'NO_VOICE' }),
      { status: 400, headers: { 'Content-Type': 'text/event-stream' } }
    )
  }

  // Check message limit
  const { count } = await supabase
    .from('session_messages')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', sessionId)
    .eq('sender', 'employer')

  if (count && count >= 10) {
    return new Response(
      sseEvent('error', { error: 'Session limit reached', limitReached: true }),
      { status: 400, headers: { 'Content-Type': 'text/event-stream' } }
    )
  }

  // Create streaming response
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // 1) STT - transcribe audio
        const audioBuffer = await audioFile.arrayBuffer()
        let userTranscript: string
        try {
          userTranscript = await transcribeAudio(audioBuffer)
        } catch (err) {
          controller.enqueue(new TextEncoder().encode(
            sseEvent('error', { error: 'Transcription failed' })
          ))
          controller.close()
          return
        }

        if (!userTranscript.trim()) {
          controller.enqueue(new TextEncoder().encode(
            sseEvent('error', { error: 'Empty transcript', code: 'EMPTY_TRANSCRIPT' })
          ))
          controller.close()
          return
        }

        // Send transcript immediately
        controller.enqueue(new TextEncoder().encode(
          sseEvent('transcript', { userTranscript })
        ))

        // Save employer message
        await supabase.from('session_messages').insert({
          session_id: sessionId,
          sender: 'employer',
          message_text: userTranscript,
        } as any)

        // Build Claude prompt
        const qaContext = twinAnswers
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

Your job is to answer interview questions as if you ARE this person. Match their communication style, tone, and level of detail based on the examples above. Be authentic and conversational. If you don't have specific information, give a reasonable answer that fits the person's profile and style.

Keep answers concise (2-3 sentences for voice) since this will be spoken aloud.
Do not break character or mention that you are an AI.`

        // 2) Stream Claude response
        let fullAnswerText = ''
        
        const claudeStream = anthropic.messages.stream({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 220,
          system: systemPrompt,
          messages: [{ role: 'user', content: userTranscript }],
        })

        // Stream text tokens to frontend
        for await (const event of claudeStream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            const text = event.delta.text
            fullAnswerText += text
            controller.enqueue(new TextEncoder().encode(
              sseEvent('text', { text })
            ))
          }
        }

        // 3) Save twin message and get ID
        const { data: twinMessage, error: twinMsgError } = await supabase
          .from('session_messages')
          .insert({
            session_id: sessionId,
            sender: 'twin',
            message_text: fullAnswerText,
          } as any)
          .select('id')
          .single()

        if (twinMsgError || !twinMessage) {
          controller.enqueue(new TextEncoder().encode(
            sseEvent('error', { error: 'Failed to save message' })
          ))
          controller.close()
          return
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const msgData = twinMessage as any
        // Send completion with message ID for TTS
        controller.enqueue(new TextEncoder().encode(
          sseEvent('done', { 
            twinMessageId: msgData.id,
            answerText: fullAnswerText 
          })
        ))

        controller.close()
      } catch (err) {
        console.error('Voice turn error:', err)
        controller.enqueue(new TextEncoder().encode(
          sseEvent('error', { error: 'Processing failed' })
        ))
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
