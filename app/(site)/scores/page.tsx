import type { Metadata } from 'next'

import { Scores, type Score } from '@/app/components/landing/Scores'
import { sanityFetch } from '@/sanity/lib/live'
import { scoresPageQuery, scoresQuery } from '@/sanity/lib/queries'

export const metadata: Metadata = {
  title: 'Scores',
  description:
    'Working editions of organ scores prepared by Bert Webbink — fingerings, registrations, free to download for non-commercial study.',
}

export default async function ScoresPage() {
  const [{ data: scores }, { data: page }] = await Promise.all([
    sanityFetch({ query: scoresQuery }),
    sanityFetch({ query: scoresPageQuery }),
  ])
  return <Scores scores={(scores ?? []) as Score[]} copy={page} />
}
