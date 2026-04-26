import type { Metadata, ResolvingMetadata } from 'next'
import { notFound } from 'next/navigation'

import { PostArticle, type PostDetail } from '@/app/components/landing/PostArticle'
import { sanityFetch } from '@/sanity/lib/live'
import { postPagesSlugs, postQuery } from '@/sanity/lib/queries'
import { resolveOpenGraphImage } from '@/sanity/lib/utils'

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  const { data } = await sanityFetch({
    query: postPagesSlugs,
    perspective: 'published',
    stega: false,
  })
  return data
}

export async function generateMetadata(props: Props, parent: ResolvingMetadata): Promise<Metadata> {
  const params = await props.params
  const { data: post } = await sanityFetch({
    query: postQuery,
    params,
    stega: false,
  })
  const previousImages = (await parent).openGraph?.images || []
  const ogImage = resolveOpenGraphImage(post?.coverImage)

  return {
    title: post?.title,
    description: post?.excerpt ?? undefined,
    openGraph: {
      images: ogImage ? [ogImage, ...previousImages] : previousImages,
    },
  } satisfies Metadata
}

export default async function PostPage(props: Props) {
  const params = await props.params
  const { data: post } = await sanityFetch({ query: postQuery, params })

  if (!post?._id) {
    return notFound()
  }

  return <PostArticle post={post as unknown as PostDetail} />
}
