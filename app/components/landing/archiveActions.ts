'use server'

import { LOCALES, type Locale } from '@/core/i18n/locales'
import { sanityFetch } from '@/sanity/lib/live'
import { archiveOrgansQuery } from '@/sanity/lib/queries'
import type { LandingOrgan } from './OrganCard'

/**
 * Server action invoked by the client `OrgansArchive` component when the
 * intersection observer crosses the load-more sentinel. Returns the next
 * `limit` organs starting at `offset`, optionally filtered by `city`.
 *
 * `city` is an empty string for "no filter" — matches the GROQ sentinel.
 * `locale` is required by the locale-aware GROQ query (`language == $locale`)
 * and is validated against the known locale list to keep this server
 * action resilient to bogus client input.
 */
export async function loadMoreOrgans({
  offset,
  limit,
  city,
  locale,
}: {
  offset: number
  limit: number
  city: string
  locale: Locale
}): Promise<LandingOrgan[]> {
  if (!(LOCALES as readonly string[]).includes(locale)) return []
  const { data } = await sanityFetch({
    query: archiveOrgansQuery,
    params: { offset, end: offset + limit, city, locale },
  })
  return (data ?? []) as LandingOrgan[]
}
