import type { Metadata } from 'next'

import { Privacy, type PrivacyContent } from '@/app/components/landing/Privacy'
import { sanityFetch } from '@/sanity/lib/live'
import { privacyQuery } from '@/sanity/lib/queries'

export const metadata: Metadata = {
  title: 'Privacy',
  description:
    'A short, plain-language note about what gets logged when you visit this site.',
}

export default async function PrivacyPage() {
  const { data } = await sanityFetch({ query: privacyQuery })
  return <Privacy data={(data ?? null) as PrivacyContent | null} />
}
