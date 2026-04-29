import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { Elsewhere, type ElsewhereContent } from '@/app/components/landing/Elsewhere'
import { sanityFetch } from '@/sanity/lib/live'
import { elsewhereQuery } from '@/sanity/lib/queries'
import { isLocale, type Locale } from '@/core/i18n/locales'

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
