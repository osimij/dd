import { NextRequest } from 'next/server'

export const runtime = 'edge'

const ELEVEN_WS = 'wss://api.elevenlabs.io/v1/speech-to-text/realtime'

export async function GET(request: NextRequest) {
  if (request.headers.get('upgrade') !== 'websocket') {
    return new Response('Expected websocket', { status: 400 })
  }

  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) {
    return new Response('Missing ELEVENLABS_API_KEY', { status: 500 })
  }

  // Guard against runtimes without WebSocketPair (e.g., non-edge dev fallback)
  // @ts-ignore - runtime availability check
  if (typeof WebSocketPair === 'undefined') {
    return new Response('WebSocketPair not supported in this runtime', { status: 501 })
  }

  // Provided by the Edge runtime
  // @ts-expect-error WebSocketPair is available in the edge runtime
  const { 0: client, 1: server } = new WebSocketPair()
  const upstream = new WebSocket(ELEVEN_WS)

  // Accept the downstream connection from browser
  // @ts-expect-error accept is provided by edge runtime WebSocket
  server.accept()

  upstream.addEventListener('open', () => {
    // Configure ElevenLabs realtime
    upstream.send(
      JSON.stringify({
        type: 'config',
        api_key: apiKey,
        model_id: 'scribe_v2',
        encoding: 'pcm_s16le',
        sample_rate: 16000,
        language: 'en',
      })
    )
  })

  upstream.addEventListener('message', (event) => {
    if (server.readyState === WebSocket.OPEN) {
      server.send(event.data)
    }
  })

  upstream.addEventListener('close', () => {
    if (server.readyState === WebSocket.OPEN) {
      server.close(1000, 'upstream closed')
    }
  })

  upstream.addEventListener('error', (err) => {
    console.error('ElevenLabs upstream error:', err)
    if (server.readyState === WebSocket.OPEN) {
      server.close(1011, 'upstream error')
    }
  })

  server.addEventListener('message', (event) => {
    // Forward audio frames or control messages to ElevenLabs
    if (upstream.readyState === WebSocket.OPEN) {
      upstream.send(event.data)
    }
  })

  server.addEventListener('close', () => {
    if (upstream.readyState === WebSocket.OPEN) {
      upstream.close()
    }
  })

  server.addEventListener('error', (err) => {
    console.error('Client websocket error:', err)
    if (upstream.readyState === WebSocket.OPEN) {
      upstream.close()
    }
  })

  return new Response(null, {
    status: 101,
    webSocket: client,
  })
}
