import { Horizon } from './Horizon'

type JournalHeroProps = {
  totalCount: number
  firstYear: number
}

/**
 * Journal hero — same vocabulary as the landing hero but shorter,
 * with the `trees` horizon variant and the title sitting in the sky.
 * Tucks under the nav via negative margin-top so the sky touches the
 * masthead.
 */
export function JournalHero({ totalCount, firstYear }: JournalHeroProps) {
  return (
    <section
      className="relative w-full overflow-hidden -mt-14"
      style={{ height: 'clamp(560px, 64vh, 720px)' }}
    >
      <Horizon variant="trees" showSun={true} />

      {/* Corner editorial meta */}
      <div className="hidden md:block absolute top-[100px] left-12 z-[3] font-mono text-[10.5px] tracking-[0.18em] uppercase text-ink-faint pointer-events-none leading-[1.6]">
        Vol. {new Date().getUTCFullYear() - firstYear + 1} · Journal
        <span className="block mt-1 font-serif italic text-[13px] normal-case tracking-normal text-ink">
          Notes between visits
        </span>
      </div>
      <div className="hidden md:block absolute top-[100px] right-12 z-[3] font-mono text-[10.5px] tracking-[0.18em] uppercase text-ink-faint pointer-events-none text-right leading-[1.6]">
        {String(totalCount).padStart(3, '0')} entries · since {firstYear}
        <span className="block mt-1 font-serif italic text-[13px] normal-case tracking-normal text-ink">
          Posted irregularly
        </span>
      </div>

      <div
        className="absolute inset-0 z-[3] flex flex-col items-center justify-start pointer-events-none"
        style={{ paddingTop: 'clamp(120px, 14vh, 170px)' }}
      >
        <div className="inline-flex items-center gap-[18px] font-mono text-[11px] tracking-[0.32em] uppercase text-ink-soft mb-6">
          Writings
          <span className="text-accent text-sm">✦</span>
          A field journal
        </div>

        <h1
          className="font-serif font-light leading-[0.96] text-ink text-center m-0 text-balance"
          style={{
            fontSize: 'clamp(64px, 9vw, 124px)',
            letterSpacing: '-0.018em',
          }}
        >
          The <em className="italic font-normal">Journal</em>
        </h1>

        <div className="mt-5 flex items-center justify-center gap-3.5 text-ink-faint">
          <span className="w-11 h-px bg-current opacity-50" />
          <span className="w-1.5 h-1.5 rounded-full bg-accent" />
          <span className="w-11 h-px bg-current opacity-50" />
        </div>

        <p
          className="mt-6 text-center text-ink-soft font-serif italic font-light max-w-[56ch] leading-[1.5] px-6 text-balance"
          style={{ fontSize: 'clamp(18px, 1.7vw, 22px)' }}
        >
          Essays, fragments, half-finished thoughts, and occasional grumbles. Published when there
          is something worth saying — usually after a bench has changed my mind about something.
        </p>
      </div>

      <div className="hero-cap absolute inset-x-0 bottom-0 h-[280px] pointer-events-none z-[2]" />
    </section>
  )
}
