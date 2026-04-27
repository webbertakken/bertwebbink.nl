import { Horizon } from './Horizon'
import { Crumbs, type CrumbItem } from './Crumbs'

type JournalHeroProps = {
  totalCount: number
  firstYear: number
  /** Optional crumbs floated over the sky, top-centred. */
  crumbs?: CrumbItem[]
}

/**
 * Journal hero — identical shell to the landing hero (same dimensions,
 * same padding stack, same corner-meta + ornament + cap), only with
 * the `trees` horizon variant baked in instead of the `fields`
 * variant's church + windmill.
 */
export function JournalHero({ totalCount, firstYear, crumbs }: JournalHeroProps) {
  return (
    <section
      className="relative w-full overflow-hidden -mt-20"
      style={{ height: 'clamp(780px, 92vh, 980px)' }}
    >
      <Horizon variant="trees" showSun={true} />

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

      {/* corner editorial meta — top left */}
      <div className="hidden md:block absolute top-[150px] left-12 z-[3] font-mono text-[10px] tracking-[0.18em] uppercase text-ink-faint pointer-events-none">
        Since {firstYear} · {totalCount} entries
        <span className="block mt-0.5 font-serif italic text-sm normal-case tracking-[0.04em] text-ink">
          Notes between visits
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
          Writings
          <span className="text-accent text-[10px] -translate-y-px">✦</span>
          A field journal
        </div>

        <h1
          className="font-serif font-light leading-[0.96] text-ink text-center whitespace-nowrap m-0"
          style={{
            fontSize: 'clamp(48px, 7.4vw, 108px)',
            letterSpacing: '-0.012em',
          }}
        >
          The <em className="font-normal italic">Journal</em>
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
          Essays, fragments, half-finished thoughts — published when there is something worth
          saying, usually after a bench has changed my mind about something.
        </p>
      </div>

      {/* fade hero into page bg */}
      <div className="hero-cap absolute inset-x-0 bottom-0 h-[320px] pointer-events-none z-[2]" />
    </section>
  )
}
