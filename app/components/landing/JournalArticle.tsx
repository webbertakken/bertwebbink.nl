import { useFormatter, useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { Image } from 'next-sanity/image'
import type { PortableTextBlock } from 'next-sanity'
import { getImageDimensions } from '@sanity/asset-utils'
import { stegaClean } from '@sanity/client/stega'

import { dataAttr, urlForImage } from '@/sanity/lib/utils'
import { Placeholder } from './Placeholder'
import { OrganBody } from './OrganBody'
import { LightboxImage } from '@/app/components/lightbox/LightboxImage'

const journalAttr = (id: string, path: string) => dataAttr({ id, type: 'journal', path }).toString()

export type JournalCategory =
  | 'travelogue'
  | 'workshop'
  | 'memorial'
  | 'home-organ'
  | 'biography'
  | 'news'
  | 'collection'
  | 'other'
  | string

type JournalNeighbor = {
  title: string
  slug: string
  date: string
  category: JournalCategory | null
} | null

export type JournalDetail = {
  _id: string
  title: string
  slug: string
  excerpt: string | null
  category: JournalCategory | null
  date: string
  coverImage: {
    asset?: { _ref: string; _type: 'reference' }
    alt?: string
    caption?: string
  } | null
  position: number
  totalCount: number
  prev: JournalNeighbor
  next: JournalNeighbor
  content: PortableTextBlock[] | null
}

const CATEGORY_KEYS = [
  'travelogue',
  'workshop',
  'memorial',
  'home-organ',
  'biography',
  'news',
  'collection',
  'other',
] as const
type CategoryKey = (typeof CATEGORY_KEYS)[number]

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

function useCategoryLabel(): (category: JournalCategory | null) => string {
  const t = useTranslations('JournalArticle.categories')
  return (category) => {
    const key = (category && (CATEGORY_KEYS as readonly string[]).includes(category)
      ? category
      : 'other') as CategoryKey
    return t(key as never)
  }
}

function Crumbs() {
  const t = useTranslations('JournalArticle')
  return (
    <div className="font-mono text-[10.5px] tracking-[0.22em] uppercase text-ink-faint flex items-center gap-3 mb-16">
      <Link href="/" className="transition-colors hover:text-accent">
        {t('breadcrumbHome')}
      </Link>
    </div>
  )
}

function Header({
  entryId,
  title,
  category,
  position,
  totalCount,
  date,
  readMin,
}: {
  entryId: string
  title: string
  category: JournalCategory | null
  position: number
  totalCount: number
  date: string
  readMin: number
}) {
  const t = useTranslations('JournalArticle')
  const format = useFormatter()
  const categoryLabel = useCategoryLabel()
  const padWidth = Math.max(2, String(totalCount || position).length)
  const numLabel = `N° ${String(position).padStart(padWidth, '0')}`
  return (
    <header className="grid grid-cols-1 gap-7 mx-auto mb-12 max-w-[880px] text-center">
      <div className="inline-flex items-center justify-center gap-4 font-mono text-[10.5px] tracking-[0.32em] uppercase text-ink-faint">
        <span className="w-7 h-px bg-current opacity-50" />
        <span data-sanity={journalAttr(entryId, 'category')}>{categoryLabel(category)}</span>
        <span className="text-accent">✦</span>
        {numLabel}
        <span className="w-7 h-px bg-current opacity-50" />
      </div>
      <h1
        data-sanity={journalAttr(entryId, 'title')}
        className="font-serif font-light leading-[1.02] m-0 text-balance"
        style={{ fontSize: 'clamp(40px, 5.6vw, 76px)', letterSpacing: '-0.012em' }}
      >
        {title}
      </h1>
      <div className="inline-flex items-center justify-center flex-wrap gap-3.5 font-mono text-[11px] tracking-[0.16em] uppercase text-ink-faint">
        <span data-sanity={journalAttr(entryId, 'date')}>
          {format.dateTime(new Date(date), { day: '2-digit', month: 'long', year: 'numeric' })}
        </span>
        {readMin > 0 && (
          <>
            <span className="w-[3px] h-[3px] bg-ink-faint rounded-full opacity-60" />
            <span>{t('minRead', { count: readMin })}</span>
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
  entryId,
  coverImage,
  title,
  seed,
}: {
  entryId: string
  coverImage: JournalDetail['coverImage']
  title: string
  seed?: string
}) {
  if (coverImage?.asset?._ref) {
    const imageSource = coverImage as {
      asset: { _ref: string; _type: 'reference' }
      alt?: string
    }
    const dim = getImageDimensions(imageSource)
    const url = urlForImage(imageSource)?.width(2000).fit('clip').url() as string
    const alt = stegaClean(coverImage.alt) || title
    return (
      <div>
        <div
          data-sanity={journalAttr(entryId, 'coverImage')}
          className="relative mx-auto max-w-[1240px] aspect-[16/9] bg-bg-sunk rounded overflow-hidden border border-rule-soft shadow-card"
        >
          <LightboxImage src={url} alt={alt}>
            <Image
              src={url}
              alt={alt}
              width={dim.width}
              height={dim.height}
              className="w-full h-full object-cover"
              priority
            />
          </LightboxImage>
        </div>
        {coverImage.caption && (
          <div className="mt-4 mx-auto max-w-[1240px] px-1 flex justify-between gap-6 font-serif italic text-ink-soft text-[14.5px] leading-[1.5]">
            <span data-sanity={journalAttr(entryId, 'coverImage.caption')}>
              {coverImage.caption}
            </span>
            <span className="font-mono not-italic text-[10.5px] tracking-[0.18em] uppercase text-ink-faint whitespace-nowrap self-end">
              Plate I
            </span>
          </div>
        )}
      </div>
    )
  }
  return (
    <div
      data-sanity={journalAttr(entryId, 'coverImage')}
      className="relative mx-auto max-w-[1240px] aspect-[16/9] bg-bg-sunk rounded overflow-hidden border border-rule-soft shadow-card"
    >
      <Placeholder label={title || 'journal entry'} seed={seed} />
    </div>
  )
}

function NeighborLink({ side, entry }: { side: 'prev' | 'next'; entry: JournalNeighbor }) {
  const t = useTranslations('JournalArticle')
  const format = useFormatter()
  const categoryLabel = useCategoryLabel()
  if (!entry) {
    return (
      <div className={side === 'next' ? 'md:text-right' : ''}>
        <p className="font-mono text-[10.5px] tracking-[0.22em] uppercase text-ink-faint m-0 mb-3.5">
          {side === 'prev' ? t('previousEntry') : t('nextEntry')}
        </p>
        <p className="font-serif italic text-ink-faint m-0">{t('endOfJournal')}</p>
      </div>
    )
  }
  const meta = [
    categoryLabel(entry.category),
    format.dateTime(new Date(entry.date), { day: '2-digit', month: 'long', year: 'numeric' }),
  ]
    .filter(Boolean)
    .join(' · ')
  return (
    <div className={side === 'next' ? 'md:text-right' : ''}>
      <p className="font-mono text-[10.5px] tracking-[0.22em] uppercase text-ink-faint m-0 mb-3.5">
        {side === 'prev' ? t('previousEntry') : t('nextEntry')}
      </p>
      <Link
        href={{ pathname: '/journal/[slug]', params: { slug: entry.slug } }}
        className={`block transition-all duration-300 hover:text-accent ${
          side === 'next' ? 'md:hover:pr-1.5' : 'hover:pl-1.5'
        }`}
      >
        <h4 className="font-serif font-normal text-[28px] leading-[1.18] m-0 mb-2 text-balance">
          {entry.title}
        </h4>
        <p className="m-0 font-mono text-[11px] text-ink-faint tracking-[0.12em] uppercase">
          {meta}
        </p>
      </Link>
    </div>
  )
}

function NextPrev({ prev, next }: { prev: JournalNeighbor; next: JournalNeighbor }) {
  if (!prev && !next) return null
  return (
    <section
      className="border-t border-rule-soft bg-paper px-12 pt-14 pb-16"
      data-screen-label="next-prev"
    >
      <div className="max-w-[1240px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-12">
        <NeighborLink side="prev" entry={prev} />
        <NeighborLink side="next" entry={next} />
      </div>
    </section>
  )
}

export function JournalArticle({ entry }: { entry: JournalDetail }) {
  const readMin = readMinutes(entry.content)
  return (
    <>
      <main className="max-w-[1240px] mx-auto px-6 md:px-12 pt-8" data-screen-label="article">
        <Crumbs />
        <Header
          entryId={entry._id}
          title={entry.title}
          category={entry.category}
          position={entry.position}
          totalCount={entry.totalCount}
          date={entry.date}
          readMin={readMin}
        />
        <Cover
          entryId={entry._id}
          coverImage={entry.coverImage}
          title={entry.title}
          seed={entry.slug}
        />
      </main>
      <div className="max-w-[1240px] mx-auto mt-20 px-6 md:px-12 pb-[100px] grid grid-cols-1 gap-20 items-start">
        {entry.content && entry.content.length > 0 && (
          <OrganBody value={entry.content} organId={entry._id} />
        )}
      </div>
      <NextPrev prev={entry.prev} next={entry.next} />
    </>
  )
}
