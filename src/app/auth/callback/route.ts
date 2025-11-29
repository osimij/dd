import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/onboarding'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Check if user has a twin already
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: twin } = await supabase
          .from('twins')
          .select('id')
          .eq('user_id', user.id)
          .single()
        
        // If user has a twin, go to dashboard, otherwise onboarding
        const redirectTo = twin ? '/dashboard' : '/onboarding'
        return NextResponse.redirect(`${origin}${redirectTo}`)
      }
      
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/login?error=Could not authenticate`)
}

