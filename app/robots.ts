import type { MetadataRoute } from 'next'
import { headers } from 'next/headers'

import { sanityFetch } from '@/sanity/lib/live'
import { settingsQuery } from '@/sanity/lib/queries'
import { UI_DEFAULT_LOCALE } from '@/core/i18n/locales'

/**
 * Crawlers that exist primarily to feed model *training* data — content
 * is absorbed into commercial AI products without attribution. Blocked
 * under the "citation-only" and "disallow-all" policies.
 */
const TRAINING_CRAWLERS = [
  'GPTBot',
  'ClaudeBot',
  'anthropic-ai',
  'Claude-Web',
  'CCBot',
  'Google-Extended',
  'Applebot-Extended',
  'Bytespider',
  'Diffbot',
  'ImagesiftBot',
  'Omgilibot',
  'FacebookBot',
  'Meta-ExternalAgent',
  'cohere-ai',
  'PanguBot',
  'YouBot',
]

/**
 * Crawlers that exist to *cite* content at runtime in answers (and link
 * back). Allowed under "citation-only", blocked only under "disallow-all".
 * Note: ordinary search bots (Googlebot, Bingbot) aren't listed here —
 * they're always allowed via the catch-all `*` rule.
 */
const CITATION_CRAWLERS = ['PerplexityBot', 'OAI-SearchBot', 'ChatGPT-User']

export default async function robots(): Promise<MetadataRoute.Robots> {
  // robots.txt is site-wide; pick the UI default locale for the policy.
  const { data: settings } = await sanityFetch({
    query: settingsQuery,
    params: { locale: UI_DEFAULT_LOCALE },
    stega: false,
  })
  const policy = (settings?.aiCrawlPolicy ?? 'citation-only') as
    | 'allow-all'
    | 'citation-only'
    | 'disallow-all'

  const rules: MetadataRoute.Robots['rules'] = [{ userAgent: '*', allow: '/' }]

  if (policy === 'citation-only') {
    for (const ua of TRAINING_CRAWLERS) {
      rules.push({ userAgent: ua, disallow: '/' })
    }
  } else if (policy === 'disallow-all') {
    for (const ua of [...TRAINING_CRAWLERS, ...CITATION_CRAWLERS]) {
      rules.push({ userAgent: ua, disallow: '/' })
    }
  }

  // Best-effort base URL from request headers (mirrors app/sitemap.ts).
  const headersList = await headers()
  const host = headersList.get('host')
  const proto = headersList.get('x-forwarded-proto') ?? 'https'
  const baseUrl = host ? `${proto}://${host}` : ''

  return {
    rules,
    sitemap: baseUrl ? `${baseUrl}/sitemap.xml` : undefined,
    host: baseUrl || undefined,
  }
}
