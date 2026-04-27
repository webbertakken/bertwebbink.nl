import { Hero } from '@/app/components/landing/Hero'
import { Organs } from '@/app/components/landing/Organs'
import type { LandingOrgan } from '@/app/components/landing/OrganCard'
import {
  landingCitiesQuery,
  landingOrgansQuery,
  landingStatsQuery,
  organsPageQuery,
} from '@/sanity/lib/queries'
import { sanityFetch } from '@/sanity/lib/live'

const LANDING_ORGAN_LIMIT = 4

export default async function Page() {
  const [{ data: organs }, { data: stats }, { data: cities }, { data: page }] =
    await Promise.all([
      sanityFetch({ query: landingOrgansQuery, params: { limit: LANDING_ORGAN_LIMIT } }),
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

  return (
    <>
      <Hero
        totalCount={totalCount}
        firstYear={firstYear}
        crumbs={[{ label: 'Home', href: '/' }, { label: 'Organs' }]}
        copy={page}
      />
      <Organs
        organs={(organs ?? []) as LandingOrgan[]}
        totalCount={totalCount}
        cityCounts={cityCounts}
      />
    </>
  )
}
