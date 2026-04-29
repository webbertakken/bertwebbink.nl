import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { extractTokens, sanitiseQuery } from '@/core/search/sanitise'
import { isLocale, type Locale } from '@/core/i18n/locales'
import { sanityFetch } from '@/sanity/lib/live'
import { searchQuery } from '@/sanity/lib/queries'
import { SearchResults } from '@/app/components/search/SearchResults'

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ q?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: raw } = await params
  const locale: Locale = isLocale(raw) ? raw : 'en'
  const t = await getTranslations({ locale, namespace: 'Metadata.search' })
  return {
    title: t('title'),
    description: t('description'),
    robots: { index: false, follow: false },
  }
}

export default async function SearchPage({ params, searchParams }: Props) {
  const { locale: raw } = await params
  const locale: Locale = isLocale(raw) ? raw : 'en'
  setRequestLocale(locale)

  const { q: rawQuery = '' } = await searchParams
  const tokens = extractTokens(rawQuery)
  const groqQuery = sanitiseQuery(rawQuery)

  const t = await getTranslations({ locale, namespace: 'Search' })

  const { data: results } = groqQuery
    ? await sanityFetch({
        query: searchQuery,
        params: { locale, q: groqQuery },
        stega: false,
      })
    : { data: [] }

  return (
    <article className="max-w-[1320px] mx-auto px-6 md:px-12 pt-14 pb-24">
      <header className="mb-12">
        <h1
          className="font-serif font-light text-balance m-0"
          style={{
            fontSize: 'clamp(34px, 3.4vw, 46px)',
            lineHeight: 1.08,
            letterSpacing: '-0.008em',
          }}
        >
          {t('heading')}
        </h1>
        {rawQuery && (
          <p className="font-mono text-[12px] tracking-[0.18em] uppercase text-ink-faint mt-3">
            <span className="text-ink-soft">\u201c{rawQuery}\u201d</span>
          </p>
        )}
      </header>
      <SearchResults
        locale={locale}
        query={rawQuery}
        tokens={tokens}
        results={results ?? []}
      />
    </article>
  )
}
