import type { Metadata } from 'next'

import { Scores, type Score } from '@/app/components/landing/Scores'
import { sanityFetch } from '@/sanity/lib/live'
import { scoresQuery } from '@/sanity/lib/queries'

export const metadata: Metadata = {
  title: 'Scores',
  description:
    'Working editions of organ scores prepared by Bert Webbink — fingerings, registrations, free to download for non-commercial study.',
}

export default async function ScoresPage() {
  const { data: scores } = await sanityFetch({ query: scoresQuery })
  return <Scores scores={(scores ?? []) as Score[]} />
}
