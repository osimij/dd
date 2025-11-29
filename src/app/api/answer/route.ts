import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(request: Request) {
  try {
    const { session_id, question_text } = await request.json()

    if (!session_id || !question_text) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get session and twin data
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select(`
        *,
        twins (
          *,
          twin_answers (*)
        )
      `)
      .eq('id', session_id)
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const twin = (session as any).twins
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const twinAnswers = twin.twin_answers as any[]

    // Check message count (limit to 10)
    const { count } = await supabase
      .from('session_messages')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', session_id)
      .eq('sender', 'employer')

    if (count && count >= 10) {
      return NextResponse.json(
        { error: 'Session limit reached', limitReached: true },
        { status: 400 }
      )
    }

    // Save the employer's question
    await supabase.from('session_messages').insert({
      session_id,
      sender: 'employer',
      message_text: question_text,
    } as never)

    // Build context for the AI
    const qaContext = twinAnswers
      .map((qa: { question_text: string; answer_text: string }) => `Q: ${qa.question_text}\nA: ${qa.answer_text}`)
      .join('\n\n')

    const systemPrompt = `You are roleplaying as ${twin.name}, a ${twin.role_title} with ${twin.years_experience} years of experience.

Here is their background:
Bio: ${twin.bio}
Skills: ${twin.skills.join(', ')}

Here are examples of how they answer questions in their own voice:

${qaContext}

Your job is to answer interview questions as if you ARE this person. Match their communication style, tone, and level of detail based on the examples above. Be authentic and conversational. If you don't have specific information, give a reasonable answer that fits the person's profile and style.

Keep answers concise (2-4 paragraphs max) unless the question specifically asks for detail.
Do not break character or mention that you are an AI.`

    // Call Anthropic API
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: question_text,
        },
      ],
    })

    const answerText = message.content[0].type === 'text' 
      ? message.content[0].text 
      : ''

    // Save the twin's response
    await supabase.from('session_messages').insert({
      session_id,
      sender: 'twin',
      message_text: answerText,
    } as never)

    return NextResponse.json({ answer: answerText })
  } catch (error) {
    console.error('Error generating answer:', error)
    return NextResponse.json(
      { error: 'Failed to generate answer' },
      { status: 500 }
    )
  }
}

