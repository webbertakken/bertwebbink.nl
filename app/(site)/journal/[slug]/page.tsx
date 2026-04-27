import type { Metadata, ResolvingMetadata } from 'next'
import { notFound } from 'next/navigation'

import { JournalArticle, type JournalDetail } from '@/app/components/landing/JournalArticle'
import { sanityFetch } from '@/sanity/lib/live'
import { journalPagesSlugs, journalQuery } from '@/sanity/lib/queries'
import { resolveOpenGraphImage } from '@/sanity/lib/utils'

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  const { data } = await sanityFetch({
    query: journalPagesSlugs,
    perspective: 'published',
    stega: false,
  })
  return data
}

export async function generateMetadata(
  props: Props,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const params = await props.params
  const { data: entry } = await sanityFetch({
    query: journalQuery,
    params,
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
  const params = await props.params
  const { data: entry } = await sanityFetch({ query: journalQuery, params })

  if (!entry?._id) {
    return notFound()
  }

  return <JournalArticle entry={entry as unknown as JournalDetail} />
}
