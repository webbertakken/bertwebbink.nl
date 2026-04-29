import type { MetadataRoute } from 'next'
import { headers } from 'next/headers'

import { sanityFetch } from '@/sanity/lib/live'
import { sitemapData } from '@/sanity/lib/queries'
import { LOCALES, type Locale } from '@/core/i18n/locales'

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

  const SINGLETON_PATHS = ['', '/organs', '/scores', '/about', '/elsewhere', '/privacy']

  const buildAlternates = (path: string) => {
    const out: Record<string, string> = {}
    for (const loc of LOCALES) {
      out[loc] = `${baseUrl}/${loc}${path}`
    }
    return out
  }

  const entries: MetadataRoute.Sitemap = []

  // Singletons \u2014 one URL per (route, locale) pair.
  for (const path of SINGLETON_PATHS) {
    for (const loc of LOCALES) {
      entries.push({
        url: `${baseUrl}/${loc}${path || ''}`,
        lastModified: new Date(),
        priority: path === '' ? 1 : 0.7,
        changeFrequency: 'monthly',
        alternates: { languages: buildAlternates(path) },
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
      const path = type === 'organ' ? `/organs/${slug}` : `/journal/${slug}`
      const langs: Record<string, string> = {}
      for (const loc of value.locales) langs[loc] = `${baseUrl}/${loc}${path}`
      for (const loc of value.locales) {
        entries.push({
          url: `${baseUrl}/${loc}${path}`,
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
