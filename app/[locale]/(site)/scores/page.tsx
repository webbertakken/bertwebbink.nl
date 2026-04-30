import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { Scores, type Score } from '@/app/components/landing/Scores'
import { sanityFetch } from '@/sanity/lib/live'
import { scoresPageQuery, scoresQuery } from '@/sanity/lib/queries'
import { isLocale, type Locale } from '@/core/i18n/locales'

/** Static rendering with ISR safety net. `force-static` is required because
 * `next-sanity/live`'s `sanityFetch` calls `draftMode()` internally, which
 * otherwise forces dynamic rendering. Draft-mode preview still bypasses the
 * static cache at request time when the cookie is set. Per-doc cache busting
 * is handled by `revalidateTag` (see `docs/architecture/caching-strategy.md`). */
export const dynamic = 'force-static'
export const revalidate = 3600

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: raw } = await params
  const locale: Locale = isLocale(raw) ? raw : 'en'
  const t = await getTranslations({ locale, namespace: 'Metadata.scores' })
  return { title: t('title'), description: t('description') }
}

export default async function ScoresPage({ params }: Props) {
  const { locale: raw } = await params
  const locale: Locale = isLocale(raw) ? raw : 'en'
  setRequestLocale(locale)
  const [{ data: scores }, { data: page }] = await Promise.all([
    sanityFetch({ query: scoresQuery, params: { locale } }),
    sanityFetch({ query: scoresPageQuery, params: { locale } }),
  ])
  return <Scores locale={locale} scores={(scores ?? []) as Score[]} copy={page} />
}
