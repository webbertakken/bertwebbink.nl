import { Link } from '@/i18n/navigation'
import { Image } from 'next-sanity/image'
import { dataAttr, urlForImage } from '@/sanity/lib/utils'
import { Placeholder } from './Placeholder'

export type LandingOrgan = {
  _id: string
  title: string
  slug: string
  excerpt: string | null
  date: string
  coverImage: {
    asset?: { _ref: string; _type: 'reference' }
    alt?: string
  } | null
  location: { city: string; country: string; building: string } | null
  builder: string | null
  year: number | null
  hasAudio: boolean
  hasVideo: boolean
}

type OrganCardProps = {
  organ: LandingOrgan
  index?: number
  totalCount?: number
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

const IconAudio = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 12v0M6 9v6M9 6v12M12 8v8M15 5v14M18 9v6M21 12v0" />
  </svg>
)

const IconVideo = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="6" width="13" height="12" rx="1.5" />
    <path d="M16 10l5-3v10l-5-3z" />
  </svg>
)

const IconArrow = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 8h10M9 4l4 4-4 4" />
  </svg>
)

export function OrganCard({ organ, index = 1, totalCount }: OrganCardProps) {
  const padWidth = Math.max(2, String(totalCount ?? index).length)
  const hasAudio = organ.hasAudio
  const hasVideo = organ.hasVideo

  const coverUrl = organ.coverImage?.asset?._ref
    ? urlForImage(organ.coverImage)?.width(800).height(600).fit('crop').url()
    : undefined

  const titleAttr = dataAttr({
    id: organ._id,
    type: 'organ',
    path: 'title',
  })

  const locationLabel = organ.location ? `${organ.location.city}, ${organ.location.country}` : null
  const placeholderLabel = organ.location?.building ?? 'organ photograph'
  const builderLine = [organ.builder, organ.year].filter(Boolean).join(' · ')

  return (
    <article
      data-sanity={titleAttr.toString()}
      className="group relative bg-paper border border-rule-soft rounded shadow-card overflow-hidden cursor-pointer transition-all duration-500 ease-[cubic-bezier(0.2,0.6,0.2,1)] hover:scale-[1.012] hover:shadow-card-hover hover:border-[oklch(0.78_0.012_70)]"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-bg-sunk">
        {coverUrl ? (
          <Image
            src={coverUrl}
            alt={organ.coverImage?.alt || organ.title}
            width={800}
            height={600}
            sizes="(min-width: 1024px) 540px, (min-width: 640px) 50vw, 100vw"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.2,0.6,0.2,1)] group-hover:scale-[1.02]"
          />
        ) : (
          <Placeholder label={placeholderLabel} seed={organ.slug} />
        )}
      </div>

      {/* Editorial badges */}
      <div className="absolute top-3.5 left-3.5 z-[2] font-mono text-[10px] tracking-[0.16em] text-[oklch(0.99_0.004_85)] bg-[oklch(0.22_0.012_70/0.6)] backdrop-blur-[6px] px-2.5 py-[5px] rounded-sm pointer-events-none">
        N° {String(index).padStart(padWidth, '0')}
      </div>
      <div className="absolute top-3.5 right-3.5 z-[2] flex gap-1.5 pointer-events-none">
        {hasAudio && (
          <span
            className="h-[30px] min-w-[30px] px-[9px] inline-flex items-center justify-center gap-1.5 bg-[oklch(0.99_0.004_85/0.92)] backdrop-blur-[8px] border border-[oklch(0.86_0.012_75/0.6)] rounded-full text-ink text-[10.5px]"
            title="Audio fragment"
          >
            <IconAudio className="w-[13px] h-[13px]" />
          </span>
        )}
        {hasVideo && (
          <span
            className="h-[30px] min-w-[30px] px-[9px] inline-flex items-center justify-center gap-1.5 bg-[oklch(0.99_0.004_85/0.92)] backdrop-blur-[8px] border border-[oklch(0.86_0.012_75/0.6)] rounded-full text-ink text-[10.5px]"
            title="Video"
          >
            <IconVideo className="w-[13px] h-[13px]" />
          </span>
        )}
      </div>

      <div className="px-[26px] pt-6 pb-[26px]">
        <div className="flex items-center gap-2.5 font-mono text-[10.5px] tracking-[0.16em] uppercase text-ink-faint mb-3">
          {locationLabel && (
            <>
              <span>{locationLabel}</span>
              <span className="w-[3px] h-[3px] bg-ink-faint rounded-full opacity-70" />
            </>
          )}
          <span>{fmtDate(organ.date)}</span>
        </div>
        <h3
          className="font-serif font-medium text-[27px] leading-[1.16] m-0 mb-2.5 text-ink text-balance"
          style={{ letterSpacing: '0.002em' }}
        >
          {organ.title}
        </h3>
        {organ.excerpt && (
          <p className="text-ink-soft text-sm leading-[1.6] m-0 line-clamp-2">{organ.excerpt}</p>
        )}
        <div className="mt-5 pt-4 border-t border-rule-soft flex items-center justify-between gap-4 font-mono text-[11px] text-ink-faint tracking-[0.06em]">
          <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
            {builderLine || organ.location?.building || ''}
          </span>
          <span className="text-ink inline-flex items-center gap-1.5 transition-colors duration-300 font-sans tracking-[0.04em] text-xs whitespace-nowrap group-hover:text-accent">
            Read&nbsp;more
            <IconArrow className="w-[14px] h-[14px]" />
          </span>
        </div>
      </div>

      {/* Stretched link — sits above visuals, below pointer-events-none badges. */}
      <Link
        href={`/organs/${organ.slug}`}
        className="absolute inset-0 z-[1]"
        aria-label={organ.title}
      >
        <span className="sr-only">{organ.title}</span>
      </Link>
    </article>
  )
}
