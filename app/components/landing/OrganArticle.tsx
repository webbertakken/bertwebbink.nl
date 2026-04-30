import { useFormatter, useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { Image } from 'next-sanity/image'
import type { PortableTextBlock } from 'next-sanity'
import { getImageDimensions } from '@sanity/asset-utils'
import { stegaClean } from '@sanity/client/stega'

import { dataAttr, urlForImage } from '@/sanity/lib/utils'
import { Placeholder } from './Placeholder'
import { OrganBody } from './OrganBody'
import { Specs, hasSpecs } from './Specs'
import { LightboxImage } from '@/app/components/lightbox/LightboxImage'

const organAttr = (id: string, path: string) => dataAttr({ id, type: 'organ', path }).toString()

type Location = { city: string; country: string; building: string } | null

type NeighborOrgan = {
  title: string
  slug: string
  date: string
  location: Location
} | null

export type OrganDetail = {
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
  prev: NeighborOrgan
  next: NeighborOrgan
  content: PortableTextBlock[] | null
}

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
  const t = useTranslations('OrganArticle')
  return (
    <div className="font-mono text-[10.5px] tracking-[0.22em] uppercase text-ink-faint flex items-center gap-3 mb-16">
      <Link href="/" className="transition-colors hover:text-accent">
        {t('breadcrumbAll')}
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
  organId,
  title,
  building,
  position,
  totalCount,
  location,
  date,
  readMin,
}: {
  organId: string
  title: string
  building?: string
  position: number
  totalCount: number
  location: Location
  date: string
  readMin: number
}) {
  const t = useTranslations('OrganArticle')
  const format = useFormatter()
  const padWidth = Math.max(2, String(totalCount || position).length)
  const numLabel = `N° ${String(position).padStart(padWidth, '0')}`
  const locLabel = location ? `${location.city}, ${location.country}` : null

  return (
    <header className="grid grid-cols-1 gap-7 mx-auto mb-12 max-w-[880px] text-center">
      <div className="inline-flex items-center justify-center gap-4 font-mono text-[10.5px] tracking-[0.32em] uppercase text-ink-faint">
        <span className="w-7 h-px bg-current opacity-50" />
        {t('fieldNote')}
        <span className="text-accent">✦</span>
        {numLabel}
        <span className="w-7 h-px bg-current opacity-50" />
      </div>
      <h1
        data-sanity={organAttr(organId, 'title')}
        className="font-serif font-light leading-[1.02] m-0 text-balance"
        style={{ fontSize: 'clamp(40px, 5.6vw, 76px)', letterSpacing: '-0.012em' }}
      >
        {building ? (
          <>
            {title.replace(building, '').trim() || title}{' '}
            <em
              data-sanity={organAttr(organId, 'location.building')}
              className="italic font-normal"
            >
              {building}
            </em>
          </>
        ) : (
          title
        )}
      </h1>
      <div className="inline-flex items-center justify-center flex-wrap gap-3.5 font-mono text-[11px] tracking-[0.16em] uppercase text-ink-faint">
        {locLabel && <span data-sanity={organAttr(organId, 'location.city')}>{locLabel}</span>}
        {locLabel && <span className="w-[3px] h-[3px] bg-ink-faint rounded-full opacity-60" />}
        <span data-sanity={organAttr(organId, 'date')}>
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
  organId,
  coverImage,
  building,
  city,
  seed,
}: {
  organId: string
  coverImage: OrganDetail['coverImage']
  building?: string
  city?: string
  seed?: string
}) {
  const placeholderLabel = [building, city].filter(Boolean).join(' — ') || 'organ photograph'
  if (coverImage?.asset?._ref) {
    const imageSource = coverImage as { asset: { _ref: string; _type: 'reference' }; alt?: string }
    const dim = getImageDimensions(imageSource)
    const url = urlForImage(imageSource)?.width(2000).fit('clip').url() as string
    const alt = stegaClean(coverImage.alt) || building || 'organ'
    return (
      <div>
        <div
          data-sanity={organAttr(organId, 'coverImage')}
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
            <span data-sanity={organAttr(organId, 'coverImage.caption')}>{coverImage.caption}</span>
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
      data-sanity={organAttr(organId, 'coverImage')}
      className="relative mx-auto max-w-[1240px] aspect-[16/9] bg-bg-sunk rounded overflow-hidden border border-rule-soft shadow-card"
    >
      <Placeholder label={placeholderLabel} seed={seed} />
    </div>
  )
}

function NeighborLink({ side, organ }: { side: 'prev' | 'next'; organ: NeighborOrgan }) {
  const t = useTranslations('OrganArticle')
  const format = useFormatter()
  if (!organ) {
    return (
      <div className={side === 'next' ? 'md:text-right' : ''}>
        <p className="font-mono text-[10.5px] tracking-[0.22em] uppercase text-ink-faint m-0 mb-3.5">
          {side === 'prev' ? t('previousVisit') : t('nextVisit')}
        </p>
        <p className="font-serif italic text-ink-faint m-0">{t('endOfJournal')}</p>
      </div>
    )
  }
  const meta = [
    organ.location?.city,
    format.dateTime(new Date(organ.date), { day: '2-digit', month: 'long', year: 'numeric' }),
  ]
    .filter(Boolean)
    .join(' · ')
  return (
    <div className={side === 'next' ? 'md:text-right' : ''}>
      <p className="font-mono text-[10.5px] tracking-[0.22em] uppercase text-ink-faint m-0 mb-3.5">
        {side === 'prev' ? t('previousVisit') : t('nextVisit')}
      </p>
      <Link
        href={{ pathname: '/organs/[slug]', params: { slug: organ.slug } }}
        className={`block transition-all duration-300 hover:text-accent ${
          side === 'next' ? 'md:hover:pr-1.5' : 'hover:pl-1.5'
        }`}
      >
        <h4 className="font-serif font-normal text-[28px] leading-[1.18] m-0 mb-2 text-balance">
          {organ.title}
        </h4>
        <p className="m-0 font-mono text-[11px] text-ink-faint tracking-[0.12em] uppercase">
          {meta}
        </p>
      </Link>
    </div>
  )
}

function NextPrev({ prev, next }: { prev: NeighborOrgan; next: NeighborOrgan }) {
  if (!prev && !next) return null
  return (
    <section
      className="border-t border-rule-soft bg-paper px-12 pt-14 pb-16"
      data-screen-label="next-prev"
    >
      <div className="max-w-[1240px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-12">
        <NeighborLink side="prev" organ={prev} />
        <NeighborLink side="next" organ={next} />
      </div>
    </section>
  )
}

export function OrganArticle({ organ }: { organ: OrganDetail }) {
  const readMin = readMinutes(organ.content)
  const showSpecs = hasSpecs({
    builder: organ.builder,
    year: organ.year,
    disposition: organ.disposition,
  })

  return (
    <>
      <main className="max-w-[1240px] mx-auto px-6 md:px-12 pt-8" data-screen-label="article">
        <Crumbs city={organ.location?.city} />
        <Header
          organId={organ._id}
          title={organ.title}
          building={organ.location?.building}
          position={organ.position}
          totalCount={organ.totalCount}
          location={organ.location}
          date={organ.date}
          readMin={readMin}
        />
        <Cover
          organId={organ._id}
          coverImage={organ.coverImage}
          building={organ.location?.building}
          city={organ.location?.city}
          seed={organ.slug}
        />
      </main>
      <div
        className={`max-w-[1240px] mx-auto mt-20 px-6 md:px-12 pb-[100px] grid grid-cols-1 gap-20 items-start ${
          showSpecs ? 'lg:grid-cols-[minmax(0,1fr)_280px]' : ''
        }`}
      >
        {organ.content && organ.content.length > 0 && (
          <OrganBody value={organ.content} organId={organ._id} />
        )}
        {showSpecs && (
          <Specs
            organId={organ._id}
            builder={organ.builder}
            year={organ.year}
            disposition={organ.disposition}
          />
        )}
      </div>
      <NextPrev prev={organ.prev} next={organ.next} />
    </>
  )
}
