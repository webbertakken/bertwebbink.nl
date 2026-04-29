import type { MetadataRoute } from 'next'
import { headers } from 'next/headers'

import { sanityFetch } from '@/sanity/lib/live'
import { sitemapData } from '@/sanity/lib/queries'
import { LOCALES, type Locale } from '@/core/i18n/locales'
import { pathnames } from '@/i18n/routing'

/** Resolve the canonical path (`/organs`) to the localised segment for a locale. */
function localisedPath(canonical: string, locale: Locale): string {
  if (canonical === '' || canonical === '/') return canonical
  const map = pathnames as Record<string, string | Record<Locale, string>>
  const entry = map[canonical]
  if (entry == null) return canonical
  if (typeof entry === 'string') return entry
  return entry[locale] ?? canonical
}

/**
 * Locale-aware sitemap. For every translatable page (singletons + every
 * organ + every journal entry), emits one `<url>` per locale, with
 * `<xhtml:link rel="alternate" hreflang="..." />` siblings pointing at
 * each locale variant. Bots use this for cross-locale discovery.
 *
 * The hardcoded singleton routes (`/`, `/organs`, `/scores`, `/about`,
 * `/elsewhere`, `/privacy`) get one entry per locale; per-document
 * routes (`/organs/{slug}`, `/journal/{slug}`) emit one entry per
 * (slug, locale) pair, but we only emit a slug for locales where a
 * sibling translation actually exists.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { data: rows } = await sanityFetch({ query: sitemapData })

  const headersList = await headers()
  const host = headersList.get('host') ?? ''
  const proto = headersList.get('x-forwarded-proto') ?? 'https'
  const baseUrl = host ? `${proto}://${host}` : ''

  const SINGLETON_CANONICAL: Array<{ path: string; priority: number }> = [
    { path: '', priority: 1 },
    { path: '/organs', priority: 0.7 },
    { path: '/scores', priority: 0.7 },
    { path: '/about', priority: 0.7 },
    { path: '/elsewhere', priority: 0.7 },
    { path: '/privacy', priority: 0.7 },
  ]

  /** Build alternates for a canonical singleton route across every locale. */
  const buildSingletonAlternates = (canonical: string) => {
    const out: Record<string, string> = {}
    for (const loc of LOCALES) {
      out[loc] = `${baseUrl}/${loc}${localisedPath(canonical, loc)}`
    }
    return out
  }

  const entries: MetadataRoute.Sitemap = []

  // Singletons \u2014 one URL per (route, locale) pair, with the localised
  // path segment baked into both the loc URL and the alternates map.
  for (const { path, priority } of SINGLETON_CANONICAL) {
    const alternates = buildSingletonAlternates(path)
    for (const loc of LOCALES) {
      entries.push({
        url: `${baseUrl}/${loc}${localisedPath(path, loc)}`,
        lastModified: new Date(),
        priority,
        changeFrequency: 'monthly',
        alternates: { languages: alternates },
      })
    }
  }

  if (rows && rows.length > 0) {
    // Group by (type, slug) so we can compute hreflang siblings only for
    // locales that actually have a translation.
    const bySlug = new Map<string, { locales: Set<Locale>; lastModified: Date }>()
    for (const row of rows) {
      if (!row.slug || !row.language) continue
      const key = `${row._type}:${row.slug}`
      const entry = bySlug.get(key) ?? {
        locales: new Set<Locale>(),
        lastModified: new Date(0),
      }
      entry.locales.add(row.language as Locale)
      const updated = new Date(row._updatedAt ?? Date.now())
      if (updated > entry.lastModified) entry.lastModified = updated
      bySlug.set(key, entry)
    }

    for (const [key, value] of bySlug) {
      const [type, slug] = key.split(':')
      // Canonical (English) prefix \u2014 used as the lookup key for `pathnames`.
      const canonicalPrefix = type === 'organ' ? '/organs/[slug]' : '/journal/[slug]'
      const langs: Record<string, string> = {}
      for (const loc of value.locales) {
        const localised = localisedPath(canonicalPrefix, loc).replace('[slug]', slug)
        langs[loc] = `${baseUrl}/${loc}${localised}`
      }
      for (const loc of value.locales) {
        const localised = localisedPath(canonicalPrefix, loc).replace('[slug]', slug)
        entries.push({
          url: `${baseUrl}/${loc}${localised}`,
          lastModified: value.lastModified,
          priority: 0.5,
          changeFrequency: 'never',
          alternates: { languages: langs },
        })
      }
    }
  }

  return entries
}
