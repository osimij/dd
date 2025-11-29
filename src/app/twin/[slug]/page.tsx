import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import TwinPublicClient from './TwinPublicClient'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function TwinPublicPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: twin } = await supabase
    .from('twins')
    .select('*')
    .eq('public_slug', slug)
    .single()

  if (!twin) notFound()

  return <TwinPublicClient twin={twin} />
}

