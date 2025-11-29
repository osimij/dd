import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ChatClient from './ChatClient'

interface Props {
  params: Promise<{ slug: string; sessionId: string }>
}

export default async function ChatPage({ params }: Props) {
  const { slug, sessionId } = await params
  const supabase = await createClient()

  // Get twin
  const { data: twin } = await supabase
    .from('twins')
    .select('*')
    .eq('public_slug', slug)
    .single()

  if (!twin) notFound()

  // Get session
  const { data: session } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('twin_id', twin.id)
    .single()

  if (!session) notFound()

  // Get existing messages
  const { data: messages } = await supabase
    .from('session_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })

  // Check if feedback exists
  const { data: feedback } = await supabase
    .from('session_feedback')
    .select('*')
    .eq('session_id', sessionId)
    .single()

  return (
    <ChatClient 
      twin={twin} 
      session={session} 
      initialMessages={messages || []}
      hasFeedback={!!feedback}
    />
  )
}

