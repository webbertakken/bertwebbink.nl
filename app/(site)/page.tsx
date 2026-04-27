import type { Metadata } from 'next'

import { JournalHero } from '@/app/components/landing/JournalHero'
import { JournalList, type JournalEntrySummary } from '@/app/components/landing/JournalList'
import { sanityFetch } from '@/sanity/lib/live'
import { journalEntriesQuery, journalStatsQuery } from '@/sanity/lib/queries'

export const metadata: Metadata = {
  title: 'Journal',
  description:
    'Essays, fragments, half-finished thoughts — published when there is something worth saying.',
}

export default async function JournalPage() {
  const [{ data: entries }, { data: stats }] = await Promise.all([
    sanityFetch({ query: journalEntriesQuery }),
    sanityFetch({ query: journalStatsQuery }),
  ])

  const totalCount = stats?.totalCount ?? 0
  const firstYear = stats?.firstDate
    ? new Date(stats.firstDate).getUTCFullYear()
    : new Date().getUTCFullYear()

  return (
    <>
      <JournalHero
        totalCount={totalCount}
        firstYear={firstYear}
        crumbs={[{ label: 'Home' }]}
      />
      <JournalList
        entries={(entries ?? []) as JournalEntrySummary[]}
        totalCount={totalCount}
      />
    </>
  )
}
