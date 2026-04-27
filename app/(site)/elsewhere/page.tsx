import type { Metadata } from 'next'

import { Elsewhere, type ElsewhereContent } from '@/app/components/landing/Elsewhere'
import { sanityFetch } from '@/sanity/lib/live'
import { elsewhereQuery } from '@/sanity/lib/queries'

export const metadata: Metadata = {
  title: 'Elsewhere',
  description: 'Curated links — choirs, churches, organ resources.',
}

export default async function ElsewherePage() {
  const { data } = await sanityFetch({ query: elsewhereQuery })
  return <Elsewhere data={(data ?? null) as ElsewhereContent | null} />
}
