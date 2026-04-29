import { stegaClean } from '@sanity/client/stega'

import type { LandingOrgan } from './OrganCard'

/**
 * Group an ordered (newest-first) list of organs by calendar year for
 * rendering subtle year-rule headers in the archive grid.
 *
 * Returns the year for each item alongside whether it's the first item of
 * that year (i.e. should be preceded by a year-rule). Years are derived
 * from each organ's `date` field; missing/invalid dates fall back to the
 * group of whichever year was last seen so we never render a "Unknown
 * year" header.
 */
export interface YearGroupItem {
  organ: LandingOrgan
  year: number
  isYearStart: boolean
}

export function withYearGroups(organs: LandingOrgan[]): YearGroupItem[] {
  const out: YearGroupItem[] = []
  let prev: number | null = null
  let last: number = new Date().getFullYear()
  for (const o of organs) {
    const ts = Date.parse(o.date)
    const y = Number.isFinite(ts) ? new Date(ts).getUTCFullYear() : last
    last = y
    out.push({ organ: o, year: y, isYearStart: prev === null || y !== prev })
    prev = y
  }
  return out
}

/**
 * Number of organs in each year, in descending year order. Useful for
 * year-rule subtitles like "2024 · 12 visits".
 */
export function yearTotals(organs: LandingOrgan[]): Array<{ year: number; count: number }> {
  const counts = new Map<number, number>()
  for (const o of organs) {
    const ts = Date.parse(o.date)
    if (!Number.isFinite(ts)) continue
    const y = new Date(ts).getUTCFullYear()
    counts.set(y, (counts.get(y) ?? 0) + 1)
  }
  return [...counts.entries()].sort((a, b) => b[0] - a[0]).map(([year, count]) => ({ year, count }))
}

/**
 * Build the destination URL for a city sidebar link. Empty city clears the
 * filter; any other value sets `?city=<encoded>`. The shape matches
 * next-intl's typed `Link` href so `/organs` resolves to the
 * locale-specific segment automatically (`/de/orgeln`, `/ja/オルガン`).
 */
export function cityHref(
  city: string,
): { pathname: '/organs'; query?: { city: string } } {
  if (!city) return { pathname: '/organs' }
  return { pathname: '/organs', query: { city } }
}

/**
 * Normalise the `city` search parameter into a non-empty trimmed string or
 * `''` (the GROQ "no filter" sentinel). Accepts string, undefined, or
 * Next.js' string-array form for repeated params.
 */
export function normaliseCityParam(input: string | string[] | undefined): string {
  if (Array.isArray(input)) return normaliseCityParam(input[0])
  if (typeof input !== 'string') return ''
  const trimmed = input.trim()
  return trimmed
}

/**
 * Sort city names for the sidebar: by visit count desc, then alphabetical.
 * Stable across renders.
 */
export function sortedCitiesForSidebar(
  cityCounts: Record<string, number>,
): Array<{ city: string; count: number }> {
  return Object.entries(cityCounts)
    .map(([city, count]) => ({ city, count }))
    .sort((a, b) => b.count - a.count || a.city.localeCompare(b.city))
}

/**
 * Count cities from `landingCitiesQuery` rows, stega-cleaning each value.
 *
 * Sanity Live encodes invisible stega markers into every fetched string so
 * the Visual Editor can map a rendered DOM node back to a source field.
 * That makes two "Urk" strings sourced from different organ docs into
 * different JavaScript values, which would otherwise collapse them into
 * separate sidebar entries with `count: 1` each. Cleaning before keying
 * gives us one entry per real city with the right total.
 */
export function countCitiesFromRows(
  rows: Array<{ city?: string | null }> | null | undefined,
): Record<string, number> {
  const out: Record<string, number> = {}
  for (const row of rows ?? []) {
    if (!row.city) continue
    const cleaned = stegaClean(row.city)
    if (!cleaned) continue
    out[cleaned] = (out[cleaned] ?? 0) + 1
  }
  return out
}
