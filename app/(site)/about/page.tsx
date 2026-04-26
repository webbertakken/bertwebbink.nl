import type { Metadata } from 'next'

import { About, type AboutContent } from '@/app/components/landing/About'
import { sanityFetch } from '@/sanity/lib/live'
import { aboutQuery } from '@/sanity/lib/queries'

export const metadata: Metadata = {
  title: 'About me',
  description: 'Bert Webbink — organist, leraar, stille bezoeker van oude gebouwen.',
}

export default async function AboutPage() {
  const { data } = await sanityFetch({ query: aboutQuery })
  return <About data={(data ?? null) as AboutContent | null} />
}
