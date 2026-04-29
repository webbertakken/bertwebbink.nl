import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { About, type AboutContent } from '@/app/components/landing/About'
import { sanityFetch } from '@/sanity/lib/live'
import { aboutQuery } from '@/sanity/lib/queries'
import { isLocale, type Locale } from '@/core/i18n/locales'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: raw } = await params
  const locale: Locale = isLocale(raw) ? raw : 'en'
  const t = await getTranslations({ locale, namespace: 'Metadata.about' })
  return { title: t('title'), description: t('description') }
}

export default async function AboutPage({ params }: Props) {
  const { locale: raw } = await params
  const locale: Locale = isLocale(raw) ? raw : 'en'
  setRequestLocale(locale)
  const { data } = await sanityFetch({ query: aboutQuery, params: { locale } })
  return <About locale={locale} data={(data ?? null) as AboutContent | null} />
}
