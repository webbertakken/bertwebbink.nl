'use server'

import { sanityFetch } from '@/sanity/lib/live'
import { archiveOrgansQuery } from '@/sanity/lib/queries'
import type { LandingOrgan } from './OrganCard'

/**
 * Server action invoked by the client `OrgansArchive` component when the
 * intersection observer crosses the load-more sentinel. Returns the next
 * `limit` organs starting at `offset`, optionally filtered by `city`.
 *
 * `city` is an empty string for "no filter" — matches the GROQ sentinel.
 */
export async function loadMoreOrgans({
  offset,
  limit,
  city,
}: {
  offset: number
  limit: number
  city: string
}): Promise<LandingOrgan[]> {
  const { data } = await sanityFetch({
    query: archiveOrgansQuery,
    params: { offset, end: offset + limit, city },
  })
  return (data ?? []) as LandingOrgan[]
}
