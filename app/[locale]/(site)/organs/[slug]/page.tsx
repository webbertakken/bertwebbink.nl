import type { Metadata, ResolvingMetadata } from 'next'
import { setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { OrganArticle, type OrganDetail } from '@/app/components/landing/OrganArticle'
import { isLocale, type Locale } from '@/core/i18n/locales'
import { sanityFetch } from '@/sanity/lib/live'
import { organPagesSlugs, organQuery } from '@/sanity/lib/queries'
import { resolveOpenGraphImage } from '@/sanity/lib/utils'

type Props = {
  params: Promise<{ locale: string; slug: string }>
}

export async function generateStaticParams() {
  const { data } = await sanityFetch({
    query: organPagesSlugs,
    perspective: 'published',
    stega: false,
  })
  // Each row already carries its own locale via the GROQ projection.
  return (data ?? []) as Array<{ locale: string; slug: string }>
}

export async function generateMetadata(props: Props, parent: ResolvingMetadata): Promise<Metadata> {
  const { locale: raw, slug: rawSlug } = await props.params
  const locale: Locale = isLocale(raw) ? raw : 'en'
  // NFC-normalise so non-Latin scripts (e.g. Hangul) match the stored
  // slug regardless of whether the browser emitted NFC or NFD bytes.
  const slug = decodeURIComponent(rawSlug).normalize('NFC')
  const { data: organ } = await sanityFetch({
    query: organQuery,
    params: { locale, slug },
    stega: false,
  })
  const previousImages = (await parent).openGraph?.images || []
  const ogImage = resolveOpenGraphImage(organ?.coverImage)

  return {
    title: organ?.title,
    description: organ?.excerpt ?? undefined,
    openGraph: {
      images: ogImage ? [ogImage, ...previousImages] : previousImages,
    },
  } satisfies Metadata
}

export default async function OrganPage(props: Props) {
  const { locale: raw, slug: rawSlug } = await props.params
  const locale: Locale = isLocale(raw) ? raw : 'en'
  setRequestLocale(locale)
  const slug = decodeURIComponent(rawSlug).normalize('NFC')
  const { data: organ } = await sanityFetch({ query: organQuery, params: { locale, slug } })

  if (!organ?._id) {
    return notFound()
  }

  return <OrganArticle organ={organ as unknown as OrganDetail} />
}
