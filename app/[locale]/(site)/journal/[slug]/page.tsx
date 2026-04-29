import type { Metadata, ResolvingMetadata } from 'next'
import { notFound } from 'next/navigation'
import { setRequestLocale } from 'next-intl/server'

import { JournalArticle, type JournalDetail } from '@/app/components/landing/JournalArticle'
import { sanityFetch } from '@/sanity/lib/live'
import { journalPagesSlugs, journalQuery } from '@/sanity/lib/queries'
import { resolveOpenGraphImage } from '@/sanity/lib/utils'
import { isLocale, type Locale } from '@/core/i18n/locales'

type Props = {
  params: Promise<{ locale: string; slug: string }>
}

export async function generateStaticParams() {
  const { data } = await sanityFetch({
    query: journalPagesSlugs,
    perspective: 'published',
    stega: false,
  })
  return (data ?? []) as Array<{ locale: string; slug: string }>
}

export async function generateMetadata(
  props: Props,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const { locale: raw, slug: rawSlug } = await props.params
  const locale: Locale = isLocale(raw) ? raw : 'en'
  const slug = decodeURIComponent(rawSlug).normalize('NFC')
  const { data: entry } = await sanityFetch({
    query: journalQuery,
    params: { locale, slug },
    stega: false,
  })
  const previousImages = (await parent).openGraph?.images || []
  const ogImage = resolveOpenGraphImage(entry?.coverImage)

  return {
    title: entry?.title,
    description: entry?.excerpt ?? undefined,
    openGraph: {
      images: ogImage ? [ogImage, ...previousImages] : previousImages,
    },
  } satisfies Metadata
}

export default async function JournalEntryPage(props: Props) {
  const { locale: raw, slug: rawSlug } = await props.params
  const locale: Locale = isLocale(raw) ? raw : 'en'
  setRequestLocale(locale)
  const slug = decodeURIComponent(rawSlug).normalize('NFC')
  const { data: entry } = await sanityFetch({ query: journalQuery, params: { locale, slug } })

  if (!entry?._id) {
    return notFound()
  }

  return <JournalArticle entry={entry as unknown as JournalDetail} />
}
