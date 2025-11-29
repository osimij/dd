import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Get the user's twin
  const { data: twin } = await supabase
    .from('twins')
    .select(`
      *,
      twin_answers (*)
    `)
    .eq('user_id', user.id)
    .single()

  if (!twin) redirect('/onboarding')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const twinData = twin as any

  // Get session stats
  const { count: sessionCount } = await supabase
    .from('sessions')
    .select('*', { count: 'exact', head: true })
    .eq('twin_id', twinData.id)

  const { data: feedbackData } = await supabase
    .from('session_feedback')
    .select('rating, sessions!inner(twin_id)')
    .eq('sessions.twin_id', twinData.id)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fbData = feedbackData as any[] | null
  const avgRating = fbData && fbData.length > 0
    ? fbData.reduce((sum: number, f: { rating: number }) => sum + f.rating, 0) / fbData.length
    : null

  return (
    <DashboardClient 
      twin={twin} 
      sessionCount={sessionCount || 0} 
      avgRating={avgRating}
    />
  )
}

