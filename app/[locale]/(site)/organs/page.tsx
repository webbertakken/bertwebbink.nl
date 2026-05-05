import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { countCitiesFromRows, normaliseCityParam } from '@/app/components/landing/archiveUtil'
import { Hero } from '@/app/components/landing/Hero'
import type { LandingOrgan } from '@/app/components/landing/OrganCard'
import { OrgansArchive } from '@/app/components/landing/OrgansArchive'
import { isLocale, type Locale } from '@/core/i18n/locales'
import { sanityFetch } from '@/sanity/lib/live'
import {
  archiveOrgansCountQuery,
  archiveOrgansQuery,
  landingCitiesQuery,
  landingStatsQuery,
  organsPageQuery,
} from '@/sanity/lib/queries'

const PAGE_SIZE = 24

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ city?: string | string[] }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: raw } = await params
  const locale: Locale = isLocale(raw) ? raw : 'en'
  const t = await getTranslations({ locale, namespace: 'Metadata.organs' })
  return { title: t('title'), description: t('description') }
}

export default async function Page({ params, searchParams }: Props) {
  const { locale: raw } = await params
  const locale: Locale = isLocale(raw) ? raw : 'en'
  setRequestLocale(locale)
  const sp = await searchParams
  const city = normaliseCityParam(sp.city)

  const [
    { data: organs },
    { data: filteredCount },
    { data: stats },
    { data: cities },
    { data: page },
  ] = await Promise.all([
    sanityFetch({
      query: archiveOrgansQuery,
      params: { locale, city, offset: 0, end: PAGE_SIZE },
    }),
    sanityFetch({
      query: archiveOrgansCountQuery,
      params: { locale, city },
    }),
    sanityFetch({ query: landingStatsQuery, params: { locale } }),
    sanityFetch({ query: landingCitiesQuery, params: { locale } }),
    sanityFetch({ query: organsPageQuery, params: { locale } }),
  ])

  const totalCount = stats?.totalCount ?? 0
  const firstYear = stats?.firstDate
    ? new Date(stats.firstDate).getUTCFullYear()
    : new Date().getUTCFullYear()

  const cityCounts = countCitiesFromRows(cities)
  const filtered = filteredCount ?? 0
  const tCrumbs = await getTranslations({ locale, namespace: 'Crumbs' })

  return (
    <>
      <Hero
        locale={locale}
        totalCount={totalCount}
        firstYear={firstYear}
        crumbs={[{ label: tCrumbs('home'), href: `/` }, { label: tCrumbs('organs') }]}
        copy={page}
      />
      <OrgansArchive
        initialOrgans={(organs ?? []) as LandingOrgan[]}
        totalCount={filtered}
        cityCounts={cityCounts}
        city={city}
      />
    </>
  )
}
