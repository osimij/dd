import { NextResponse } from 'next/server'

// Returns config needed for client-side WebSocket connection to ElevenLabs
// In production, this should return a scoped/temporary token instead of the raw API key
export async function GET() {
  // Disable exposing raw API keys. Implement a scoped token service before enabling.
  return NextResponse.json(
    { error: 'Realtime STT config disabled to avoid exposing API keys' },
    { status: 501 }
  )

}
