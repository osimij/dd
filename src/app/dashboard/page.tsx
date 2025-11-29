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

  // Get session stats
  const { count: sessionCount } = await supabase
    .from('sessions')
    .select('*', { count: 'exact', head: true })
    .eq('twin_id', twin.id)

  const { data: feedbackData } = await supabase
    .from('session_feedback')
    .select('rating, sessions!inner(twin_id)')
    .eq('sessions.twin_id', twin.id)

  const avgRating = feedbackData && feedbackData.length > 0
    ? feedbackData.reduce((sum, f) => sum + f.rating, 0) / feedbackData.length
    : null

  return (
    <DashboardClient 
      twin={twin} 
      sessionCount={sessionCount || 0} 
      avgRating={avgRating}
    />
  )
}

