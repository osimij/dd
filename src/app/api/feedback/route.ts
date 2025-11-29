import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const { session_id, rating, comment_text } = await request.json()

    if (!session_id || !rating) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Check if session exists
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id')
      .eq('id', session_id)
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    // Check if feedback already exists
    const { data: existingFeedback } = await supabase
      .from('session_feedback')
      .select('id')
      .eq('session_id', session_id)
      .single()

    if (existingFeedback) {
      return NextResponse.json(
        { error: 'Feedback already submitted for this session' },
        { status: 400 }
      )
    }

    // Insert feedback
    const { error: insertError } = await supabase
      .from('session_feedback')
      .insert({
        session_id,
        rating,
        comment_text: comment_text || null,
      })

    if (insertError) {
      console.error('Error inserting feedback:', insertError)
      return NextResponse.json(
        { error: 'Failed to save feedback' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error submitting feedback:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

