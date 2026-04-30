import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { Elsewhere, type ElsewhereContent } from '@/app/components/landing/Elsewhere'
import { sanityFetch } from '@/sanity/lib/live'
import { elsewhereQuery } from '@/sanity/lib/queries'
import { isLocale, type Locale } from '@/core/i18n/locales'

/** Static rendering with ISR safety net. `force-static` is required because
 * `next-sanity/live`'s `sanityFetch` calls `draftMode()` internally, which
 * otherwise forces dynamic rendering. Draft-mode preview still bypasses the
 * static cache at request time when the cookie is set. Per-doc cache busting
 * is handled by `revalidateTag` (see `docs/caching-strategy.md`). */
export const dynamic = 'force-static'
export const revalidate = 3600

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: raw } = await params
  const locale: Locale = isLocale(raw) ? raw : 'en'
  const t = await getTranslations({ locale, namespace: 'Metadata.elsewhere' })
  return { title: t('title'), description: t('description') }
}

export default async function ElsewherePage({ params }: Props) {
  const { locale: raw } = await params
  const locale: Locale = isLocale(raw) ? raw : 'en'
  setRequestLocale(locale)
  const { data } = await sanityFetch({ query: elsewhereQuery, params: { locale } })
  return <Elsewhere locale={locale} data={(data ?? null) as ElsewhereContent | null} />
}
