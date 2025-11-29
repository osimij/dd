import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const ELEVEN_API = 'https://api.elevenlabs.io/v1'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const twinMessageId = searchParams.get('twinMessageId')

  if (!twinMessageId) {
    return new Response('Missing twinMessageId', { status: 400 })
  }

  const supabase = await createClient()

  // 1) Load twin message to get text
  const { data: twinMsg, error: msgErr } = await supabase
    .from('session_messages')
    .select('id, message_text, session_id')
    .eq('id', twinMessageId)
    .single()

  if (msgErr || !twinMsg) {
    return new Response('Message not found', { status: 404 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const msg = twinMsg as any

  // 2) Get session to find twin_id
  const { data: session, error: sessionErr } = await supabase
    .from('sessions')
    .select('twin_id')
    .eq('id', msg.session_id)
    .single()

  if (sessionErr || !session) {
    return new Response('Session not found', { status: 404 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sess = session as any

  // 3) Get twin's voice_id
  const { data: twin, error: twinErr } = await supabase
    .from('twins')
    .select('elevenlabs_voice_id')
    .eq('id', sess.twin_id)
    .single()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const t = twin as any
  if (twinErr || !t || !t.elevenlabs_voice_id) {
    return new Response('Twin voice not configured', { status: 400 })
  }

  const text = msg.message_text as string
  const voiceId = t.elevenlabs_voice_id as string

  // 4) Call ElevenLabs streaming TTS endpoint
  const elevenKey = process.env.ELEVENLABS_API_KEY
  if (!elevenKey) {
    return new Response('ELEVENLABS_API_KEY not configured', { status: 500 })
  }

  // Use the streaming endpoint - returns audio as it's generated
  const ttsResponse = await fetch(`${ELEVEN_API}/text-to-speech/${voiceId}/stream`, {
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

  if (!ttsResponse.ok) {
    const errorText = await ttsResponse.text()
    console.error('TTS stream error:', errorText)
    return new Response('TTS streaming failed', { status: 500 })
  }

  // 5) Pipe the audio stream directly to the client
  // The browser will start playing as chunks arrive
  return new Response(ttsResponse.body, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache',
    },
  })
}
