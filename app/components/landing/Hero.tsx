import { Horizon } from './Horizon'
import { Crumbs, type CrumbItem } from './Crumbs'

type HeroProps = {
  variant?: 'fields' | 'pipes' | 'plains'
  showSun?: boolean
  totalCount: number
  firstYear: number
  /** Optional crumbs floated over the sky, top-centred. */
  crumbs?: CrumbItem[]
}

/**
 * Distant church silhouette — small enough to read as “on the horizon”.
 * Originally lived inside the Horizon SVG at viewBox x=486; pulled out so it
 * remains visible at viewport-edge positions on narrow screens (where the
 * wide SVG would crop it via xMidYMid slice).
 */
const ChurchSilhouette = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 36 52" aria-hidden="true" {...props}>
    <g opacity="0.72">
      <rect x="14" y="38" width="22" height="14" fill="oklch(0.46 0.022 60)" />
      <rect x="0" y="24" width="14" height="28" fill="oklch(0.42 0.024 58)" />
      <polygon points="0,24 7,6 14,24" fill="oklch(0.40 0.024 56)" />
      <line x1="7" y1="6" x2="7" y2="0" stroke="oklch(0.36 0.024 56)" strokeWidth="0.7" />
      <line x1="4" y1="3" x2="10" y2="3" stroke="oklch(0.36 0.024 56)" strokeWidth="0.7" />
      <polygon points="14,38 25,32 36,38" fill="oklch(0.42 0.024 58)" />
    </g>
  </svg>
)

const WindmillSilhouette = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 15 19" aria-hidden="true" {...props}>
    <g opacity="0.5">
      <rect x="6" y="9" width="3" height="10" fill="oklch(0.46 0.022 60)" />
      <line x1="7.5" y1="7" x2="15" y2="0" stroke="oklch(0.46 0.022 60)" strokeWidth="0.7" />
      <line x1="7.5" y1="7" x2="0" y2="0" stroke="oklch(0.46 0.022 60)" strokeWidth="0.7" />
      <line x1="7.5" y1="7" x2="15" y2="14" stroke="oklch(0.46 0.022 60)" strokeWidth="0.7" />
      <line x1="7.5" y1="7" x2="0" y2="14" stroke="oklch(0.46 0.022 60)" strokeWidth="0.7" />
    </g>
  </svg>
)

export function Hero({
  variant = 'fields',
  showSun = true,
  totalCount,
  firstYear,
  crumbs,
}: HeroProps) {
  return (
    <section
      className="relative w-full overflow-hidden -mt-20"
      style={{ height: 'clamp(780px, 92vh, 980px)' }}
    >
      <Horizon variant={variant} showSun={showSun} />

      {/* Crumbs at the exact same page-y as the no-hero pages put them:
          inside max-w-[1240px] + px-12, at pt-8 of main. Hero is -mt-20
          (-80px), so we add 80px to land at page_top + nav_height + 32px. */}
      {crumbs && crumbs.length > 0 && (
        <div className="absolute inset-x-0 top-[112px] z-[3]">
          <div className="max-w-[1240px] mx-auto px-6 md:px-12">
            <Crumbs items={crumbs} bare />
          </div>
        </div>
      )}

      {/* Distant silhouettes — anchored to viewport edges so they stay
          visible on mobile, where the SVG above crops them out. Bottom
          50% sits the base of the silhouette on the horizon line. */}
      {variant === 'fields' && (
        <>
          <ChurchSilhouette
            className="absolute z-[1] pointer-events-none"
            style={{
              left: 'clamp(20px, 16vw, 240px)',
              bottom: '50%',
              width: 'clamp(28px, 2.6vw, 40px)',
            }}
          />
          <WindmillSilhouette
            className="absolute z-[1] pointer-events-none"
            style={{
              right: 'clamp(20px, 11vw, 180px)',
              bottom: '50%',
              width: 'clamp(14px, 1.2vw, 20px)',
            }}
          />
        </>
      )}

      {/* corner editorial meta — top left */}
      <div className="hidden md:block absolute top-[150px] left-12 z-[3] font-mono text-[10px] tracking-[0.18em] uppercase text-ink-faint pointer-events-none">
        Since {firstYear} · {totalCount} organs
        <span className="block mt-0.5 font-serif italic text-sm normal-case tracking-[0.04em] text-ink">
          A field journal
        </span>
      </div>
      <div className="hidden md:block absolute top-[150px] right-12 z-[3] font-mono text-[10px] tracking-[0.18em] uppercase text-ink-faint text-right pointer-events-none">
        N 52° 30′ · E 5° 55′
        <span className="block mt-0.5 font-serif italic text-sm normal-case tracking-[0.04em] text-ink">
          The low countries
        </span>
      </div>

      <div
        className="absolute inset-0 z-[3] flex flex-col items-center justify-start pointer-events-none"
        style={{ paddingTop: 'clamp(150px, 17vh, 190px)' }}
      >
        <div className="inline-flex items-center gap-[18px] font-mono text-[10.5px] tracking-[0.32em] uppercase text-ink-faint mb-9">
          Field notes
          <span className="text-accent text-[10px] -translate-y-px">✦</span>
          From the organ loft
        </div>

        <h1
          className="font-serif font-light leading-[0.96] text-ink text-center whitespace-nowrap m-0"
          style={{
            fontSize: 'clamp(48px, 7.4vw, 108px)',
            letterSpacing: '-0.012em',
          }}
        >
          Visits to <em className="font-normal italic">old&nbsp;organs</em>
        </h1>

        <div className="mt-7 flex items-center justify-center gap-3.5 text-ink-faint">
          <span className="w-9 h-px bg-current opacity-50" />
          <span className="w-[5px] h-[5px] rounded-full bg-accent" />
          <span className="w-9 h-px bg-current opacity-50" />
        </div>

        <p
          className="mt-[22px] text-center text-ink-soft font-serif italic font-light max-w-[560px] leading-[1.45] px-6"
          style={{
            fontSize: 'clamp(16px, 1.5vw, 21px)',
            letterSpacing: '0.01em',
          }}
        >
          Recordings, photographs and registers from one Saturday at a time, gathered in the
          Netherlands and beyond.
        </p>
      </div>

      {/* fade hero into page bg */}
      <div className="hero-cap absolute inset-x-0 bottom-0 h-[320px] pointer-events-none z-[2]" />
    </section>
  )
}
