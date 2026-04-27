import type { Metadata, ResolvingMetadata } from 'next'
import { notFound } from 'next/navigation'

import { OrganArticle, type OrganDetail } from '@/app/components/landing/OrganArticle'
import { sanityFetch } from '@/sanity/lib/live'
import { organPagesSlugs, organQuery } from '@/sanity/lib/queries'
import { resolveOpenGraphImage } from '@/sanity/lib/utils'

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  const { data } = await sanityFetch({
    query: organPagesSlugs,
    perspective: 'published',
    stega: false,
  })
  return data
}

export async function generateMetadata(props: Props, parent: ResolvingMetadata): Promise<Metadata> {
  const params = await props.params
  const { data: organ } = await sanityFetch({
    query: organQuery,
    params,
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
  const params = await props.params
  const { data: organ } = await sanityFetch({ query: organQuery, params })

  if (!organ?._id) {
    return notFound()
  }

  return <OrganArticle organ={organ as unknown as OrganDetail} />
}
