import Link from 'next/link'
import { Image } from 'next-sanity/image'
import type { PortableTextBlock } from 'next-sanity'
import { getImageDimensions } from '@sanity/asset-utils'
import { stegaClean } from '@sanity/client/stega'

import { urlForImage } from '@/sanity/lib/utils'
import { Placeholder } from './Placeholder'
import { PostBody } from './PostBody'
import { Specs, hasSpecs } from './Specs'

type Location = { city: string; country: string; building: string } | null

type NeighborPost = {
  title: string
  slug: string
  date: string
  location: Location
} | null

export type PostDetail = {
  _id: string
  title: string
  slug: string
  excerpt: string | null
  date: string
  coverImage: {
    asset?: { _ref: string; _type: 'reference' }
    alt?: string
    caption?: string
  } | null
  location: Location
  builder: string | null
  year: number | null
  disposition: {
    manuals?: number | null
    stops?: number | null
    pitch?: string | null
    temperament?: string | null
    action?: string | null
    restoredYear?: number | null
    registers?: Array<{
      name: string
      range?: string | null
      stops?: Array<{ name: string; pitch?: string | null; note?: string | null }> | null
    }> | null
  } | null
  position: number
  totalCount: number
  prev: NeighborPost
  next: NeighborPost
  content: PortableTextBlock[] | null
}

const fmtLong = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

const fmtShort = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

function readMinutes(content: PortableTextBlock[] | null): number {
  if (!content) return 0
  let words = 0
  for (const b of content) {
    if (b._type !== 'block') continue
    const children = (b as any).children as { text?: string }[] | undefined
    if (!children) continue
    for (const c of children) {
      if (c.text) words += c.text.trim().split(/\s+/).filter(Boolean).length
    }
  }
  return Math.max(1, Math.ceil(words / 200))
}

function Crumbs({ city }: { city?: string }) {
  return (
    <div className="font-mono text-[10.5px] tracking-[0.22em] uppercase text-ink-faint flex items-center gap-3 mb-16">
      <Link href="/" className="transition-colors hover:text-accent">
        All organs
      </Link>
      {city && (
        <>
          <span className="opacity-40">/</span>
          <span className="text-ink">{city}</span>
        </>
      )}
    </div>
  )
}

function Header({
  title,
  building,
  position,
  totalCount,
  location,
  date,
  readMin,
}: {
  title: string
  building?: string
  position: number
  totalCount: number
  location: Location
  date: string
  readMin: number
}) {
  const padWidth = Math.max(2, String(totalCount || position).length)
  const numLabel = `N° ${String(position).padStart(padWidth, '0')}`
  const locLabel = location ? `${location.city}, ${location.country}` : null

  return (
    <header className="grid grid-cols-1 gap-7 mx-auto mb-12 max-w-[880px] text-center">
      <div className="inline-flex items-center justify-center gap-4 font-mono text-[10.5px] tracking-[0.32em] uppercase text-ink-faint">
        <span className="w-7 h-px bg-current opacity-50" />
        Field note
        <span className="text-accent">✦</span>
        {numLabel}
        <span className="w-7 h-px bg-current opacity-50" />
      </div>
      <h1
        className="font-serif font-light leading-[1.02] m-0 text-balance"
        style={{ fontSize: 'clamp(40px, 5.6vw, 76px)', letterSpacing: '-0.012em' }}
      >
        {building ? (
          <>
            {title.replace(building, '').trim() || title}{' '}
            <em className="italic font-normal">{building}</em>
          </>
        ) : (
          title
        )}
      </h1>
      <div className="inline-flex items-center justify-center flex-wrap gap-3.5 font-mono text-[11px] tracking-[0.16em] uppercase text-ink-faint">
        {locLabel && <span>{locLabel}</span>}
        {locLabel && (
          <span className="w-[3px] h-[3px] bg-ink-faint rounded-full opacity-60" />
        )}
        <span>{fmtLong(date)}</span>
        {readMin > 0 && (
          <>
            <span className="w-[3px] h-[3px] bg-ink-faint rounded-full opacity-60" />
            <span>{readMin} min read</span>
          </>
        )}
      </div>
      <div className="mt-1 flex items-center justify-center gap-3.5 text-ink-faint">
        <span className="w-9 h-px bg-current opacity-50" />
        <span className="w-[5px] h-[5px] rounded-full bg-accent" />
        <span className="w-9 h-px bg-current opacity-50" />
      </div>
    </header>
  )
}

function Cover({
  coverImage,
  building,
  city,
}: {
  coverImage: PostDetail['coverImage']
  building?: string
  city?: string
}) {
  const placeholderLabel = [building, city].filter(Boolean).join(' — ') || 'organ photograph'
  if (coverImage?.asset?._ref) {
    const imageSource = coverImage as { asset: { _ref: string; _type: 'reference' }; alt?: string }
    const dim = getImageDimensions(imageSource)
    const url = urlForImage(imageSource)?.width(2000).fit('clip').url() as string
    const alt = stegaClean(coverImage.alt) || building || 'organ'
    return (
      <div>
        <div className="relative mx-auto max-w-[1240px] aspect-[16/9] bg-bg-sunk rounded overflow-hidden border border-rule-soft shadow-card">
          <Image
            src={url}
            alt={alt}
            width={dim.width}
            height={dim.height}
            className="w-full h-full object-cover"
            priority
          />
        </div>
        {coverImage.caption && (
          <div className="mt-4 mx-auto max-w-[1240px] px-1 flex justify-between gap-6 font-serif italic text-ink-soft text-[14.5px] leading-[1.5]">
            <span>{coverImage.caption}</span>
            <span className="font-mono not-italic text-[10.5px] tracking-[0.18em] uppercase text-ink-faint whitespace-nowrap self-end">
              Plate I
            </span>
          </div>
        )}
      </div>
    )
  }
  return (
    <div className="relative mx-auto max-w-[1240px] aspect-[16/9] bg-bg-sunk rounded overflow-hidden border border-rule-soft shadow-card">
      <Placeholder label={placeholderLabel} />
    </div>
  )
}

function NeighborLink({
  side,
  post,
}: {
  side: 'prev' | 'next'
  post: NeighborPost
}) {
  if (!post) {
    return (
      <div className={side === 'next' ? 'md:text-right' : ''}>
        <p className="font-mono text-[10.5px] tracking-[0.22em] uppercase text-ink-faint m-0 mb-3.5">
          {side === 'prev' ? '← Previous visit' : 'Next visit →'}
        </p>
        <p className="font-serif italic text-ink-faint m-0">— end of the journal —</p>
      </div>
    )
  }
  const meta = [post.location?.city, fmtLong(post.date)].filter(Boolean).join(' · ')
  return (
    <div className={side === 'next' ? 'md:text-right' : ''}>
      <p className="font-mono text-[10.5px] tracking-[0.22em] uppercase text-ink-faint m-0 mb-3.5">
        {side === 'prev' ? '← Previous visit' : 'Next visit →'}
      </p>
      <Link
        href={`/posts/${post.slug}`}
        className={`block transition-all duration-300 hover:text-accent ${
          side === 'next' ? 'md:hover:pr-1.5' : 'hover:pl-1.5'
        }`}
      >
        <h4 className="font-serif font-normal text-[28px] leading-[1.18] m-0 mb-2 text-balance">
          {post.title}
        </h4>
        <p className="m-0 font-mono text-[11px] text-ink-faint tracking-[0.12em] uppercase">
          {meta}
        </p>
      </Link>
    </div>
  )
}

function NextPrev({ prev, next }: { prev: NeighborPost; next: NeighborPost }) {
  if (!prev && !next) return null
  return (
    <section
      className="border-t border-rule-soft bg-paper px-12 pt-14 pb-16"
      data-screen-label="next-prev"
    >
      <div className="max-w-[1240px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-12">
        <NeighborLink side="prev" post={prev} />
        <NeighborLink side="next" post={next} />
      </div>
    </section>
  )
}

export function PostArticle({ post }: { post: PostDetail }) {
  const readMin = readMinutes(post.content)
  const showSpecs = hasSpecs({
    builder: post.builder,
    year: post.year,
    disposition: post.disposition,
  })

  return (
    <>
      <main className="max-w-[1240px] mx-auto px-6 md:px-12 pt-8" data-screen-label="article">
        <Crumbs city={post.location?.city} />
        <Header
          title={post.title}
          building={post.location?.building}
          position={post.position}
          totalCount={post.totalCount}
          location={post.location}
          date={post.date}
          readMin={readMin}
        />
        <Cover
          coverImage={post.coverImage}
          building={post.location?.building}
          city={post.location?.city}
        />
      </main>
      <div
        className={`max-w-[1240px] mx-auto mt-20 px-6 md:px-12 pb-[100px] grid grid-cols-1 gap-20 items-start ${
          showSpecs ? 'lg:grid-cols-[minmax(0,1fr)_280px]' : ''
        }`}
      >
        {post.content && post.content.length > 0 && (
          <PostBody value={post.content} postId={post._id} />
        )}
        {showSpecs && (
          <Specs
            builder={post.builder}
            year={post.year}
            disposition={post.disposition}
          />
        )}
      </div>
      <NextPrev prev={post.prev} next={post.next} />
    </>
  )
}
