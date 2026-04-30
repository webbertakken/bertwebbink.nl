import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { JournalHero } from '@/app/components/landing/JournalHero'
import { JournalList, type JournalEntrySummary } from '@/app/components/landing/JournalList'
import { sanityFetch } from '@/sanity/lib/live'
import { journalEntriesQuery, journalPageQuery, journalStatsQuery } from '@/sanity/lib/queries'
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
  const t = await getTranslations({ locale, namespace: 'Metadata.journal' })
  return { title: t('title'), description: t('description') }
}

export default async function JournalPage({ params }: Props) {
  const { locale: raw } = await params
  const locale: Locale = isLocale(raw) ? raw : 'en'
  setRequestLocale(locale)

  const [{ data: entries }, { data: stats }, { data: page }] = await Promise.all([
    sanityFetch({ query: journalEntriesQuery, params: { locale } }),
    sanityFetch({ query: journalStatsQuery, params: { locale } }),
    sanityFetch({ query: journalPageQuery, params: { locale } }),
  ])

  const totalCount = stats?.totalCount ?? 0
  const firstYear = stats?.firstDate
    ? new Date(stats.firstDate).getUTCFullYear()
    : new Date().getUTCFullYear()
  const t = await getTranslations({ locale, namespace: 'Crumbs' })

  return (
    <>
      <JournalHero
        locale={locale}
        totalCount={totalCount}
        firstYear={firstYear}
        crumbs={[{ label: t('home') }]}
        copy={page}
      />
      <JournalList entries={(entries ?? []) as JournalEntrySummary[]} totalCount={totalCount} />
    </>
  )
}
