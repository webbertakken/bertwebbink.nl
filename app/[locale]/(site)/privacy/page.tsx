import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { Privacy, type PrivacyContent } from '@/app/components/landing/Privacy'
import { sanityFetch } from '@/sanity/lib/live'
import { privacyQuery } from '@/sanity/lib/queries'
import { isLocale, type Locale } from '@/core/i18n/locales'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: raw } = await params
  const locale: Locale = isLocale(raw) ? raw : 'en'
  const t = await getTranslations({ locale, namespace: 'Metadata.privacy' })
  return { title: t('title'), description: t('description') }
}

export default async function PrivacyPage({ params }: Props) {
  const { locale: raw } = await params
  const locale: Locale = isLocale(raw) ? raw : 'en'
  setRequestLocale(locale)
  const { data } = await sanityFetch({ query: privacyQuery, params: { locale } })
  return <Privacy locale={locale} data={(data ?? null) as PrivacyContent | null} />
}
