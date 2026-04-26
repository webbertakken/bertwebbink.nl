import { Hero } from '@/app/components/landing/Hero'
import { Posts } from '@/app/components/landing/Posts'
import type { LandingPost } from '@/app/components/landing/PostCard'
import {
  landingPostsQuery,
  landingStatsQuery,
  landingCitiesQuery,
} from '@/sanity/lib/queries'
import { sanityFetch } from '@/sanity/lib/live'

const LANDING_POST_LIMIT = 4

export default async function Page() {
  const [{ data: posts }, { data: stats }, { data: cities }] = await Promise.all([
    sanityFetch({ query: landingPostsQuery, params: { limit: LANDING_POST_LIMIT } }),
    sanityFetch({ query: landingStatsQuery }),
    sanityFetch({ query: landingCitiesQuery }),
  ])

  const totalCount = stats?.totalCount ?? 0
  const firstYear = stats?.firstDate ? new Date(stats.firstDate).getUTCFullYear() : new Date().getUTCFullYear()

  const cityCounts: Record<string, number> = {}
  for (const c of cities ?? []) {
    if (c.city) cityCounts[c.city] = (cityCounts[c.city] ?? 0) + 1
  }

  return (
    <>
      <Hero totalCount={totalCount} firstYear={firstYear} />
      <Posts
        posts={(posts ?? []) as LandingPost[]}
        totalCount={totalCount}
        cityCounts={cityCounts}
      />
    </>
  )
}
