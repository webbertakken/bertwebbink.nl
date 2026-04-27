import type { Metadata } from 'next'

import { Hero } from '@/app/components/landing/Hero'
import { OrgansArchive } from '@/app/components/landing/OrgansArchive'
import type { LandingOrgan } from '@/app/components/landing/OrganCard'
import { normaliseCityParam } from '@/app/components/landing/archiveUtil'
import {
  archiveOrgansCountQuery,
  archiveOrgansQuery,
  landingCitiesQuery,
  landingStatsQuery,
  organsPageQuery,
} from '@/sanity/lib/queries'
import { sanityFetch } from '@/sanity/lib/live'

const PAGE_SIZE = 24

export const metadata: Metadata = {
  title: 'Organs',
  description: 'Field notes from organs visited across the Netherlands and beyond.',
}

type SearchParams = { city?: string | string[] }

export default async function Page({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams
  const city = normaliseCityParam(sp.city)

  const [
    { data: organs },
    { data: filteredCount },
    { data: stats },
    { data: cities },
    { data: page },
  ] = await Promise.all([
    sanityFetch({
      query: archiveOrgansQuery,
      params: { city, offset: 0, end: PAGE_SIZE },
    }),
    sanityFetch({
      query: archiveOrgansCountQuery,
      params: { city },
    }),
    sanityFetch({ query: landingStatsQuery }),
    sanityFetch({ query: landingCitiesQuery }),
    sanityFetch({ query: organsPageQuery }),
  ])

  const totalCount = stats?.totalCount ?? 0
  const firstYear = stats?.firstDate
    ? new Date(stats.firstDate).getUTCFullYear()
    : new Date().getUTCFullYear()

  const cityCounts: Record<string, number> = {}
  for (const c of cities ?? []) {
    if (c.city) cityCounts[c.city] = (cityCounts[c.city] ?? 0) + 1
  }

  const filtered = filteredCount ?? 0

  return (
    <>
      <Hero
        totalCount={totalCount}
        firstYear={firstYear}
        crumbs={[{ label: 'Home', href: '/' }, { label: 'Organs' }]}
        copy={page}
      />
      <OrgansArchive
        initialOrgans={(organs ?? []) as LandingOrgan[]}
        totalCount={filtered}
        cityCounts={cityCounts}
        city={city}
      />
    </>
  )
}
