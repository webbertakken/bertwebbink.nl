import { useTranslations } from 'next-intl'
import type { Locale } from '@/core/i18n/locales'
import { dataAttr } from '@/sanity/lib/utils'
import { Crumbs, type CrumbItem } from './Crumbs'
import { Horizon } from './Horizon'
import { renderEmphasised } from './renderEmphasised'

const JOURNAL_PAGE_TYPE = 'journalPage'

type JournalHeroProps = {
  locale: Locale
  totalCount: number
  firstYear: number
  /** Optional crumbs floated over the sky, top-centred. */
  crumbs?: CrumbItem[]
  /** Editable hero copy. All fields fall back to design defaults. */
  copy?: {
    kickerLeft?: string | null
    kickerRight?: string | null
    heading?: string | null
    tagline?: string | null
    cornerLeftSub?: string | null
    cornerRightSub?: string | null
  } | null
}

/**
 * Journal hero — identical shell to the landing hero (same dimensions,
 * same padding stack, same corner-meta + ornament + cap), only with
 * the `trees` horizon variant baked in instead of the `fields`
 * variant's church + windmill.
 */
export function JournalHero({ locale, totalCount, firstYear, crumbs, copy }: JournalHeroProps) {
  const t = useTranslations('JournalHero')
  const JOURNAL_PAGE_ID = `journalPage-${locale}`
  const journalAttr = (path: string) =>
    dataAttr({ id: JOURNAL_PAGE_ID, type: JOURNAL_PAGE_TYPE, path }).toString()

  const kickerLeft = copy?.kickerLeft ?? t('kickerLeftFallback')
  const kickerRight = copy?.kickerRight ?? t('kickerRightFallback')
  // Heading: editor copy uses `{{...}}` (Sanity convention via
  // renderEmphasised); fallback uses ICU rich-text `<em>...</em>` to
  // sidestep the `{{}}`/ICU brace clash.
  const heading = copy?.heading
    ? renderEmphasised(copy.heading)
    : t.rich('headingFallback', {
        em: (chunks) => <em className="italic font-normal">{chunks}</em>,
      })
  const tagline = copy?.tagline ?? t('taglineFallback')
  const cornerLeftSub = copy?.cornerLeftSub ?? t('cornerLeftSubFallback')
  const cornerRightSub = copy?.cornerRightSub ?? t('cornerRightSubFallback')

  return (
    <section
      className="relative w-full overflow-hidden"
      style={{ height: 'clamp(780px, 92vh, 980px)' }}
    >
      <Horizon variant="trees" showSun={true} />

      {/* Crumbs sit at pt-8 of the hero so they line up with the
          pt-8 crumbs on the no-hero pages (Nav lives above the hero,
          contributing the same vertical offset on every route). */}
      {crumbs && crumbs.length > 0 && (
        <div className="absolute inset-x-0 top-8 z-[3]">
          <div className="max-w-[1240px] mx-auto px-6 md:px-12">
            <Crumbs items={crumbs} bare />
          </div>
        </div>
      )}

      {/* corner editorial meta — top left */}
      <div className="hidden md:block absolute top-[68px] left-12 z-[3] font-mono text-[10px] tracking-[0.18em] uppercase text-ink-faint">
        {t('stats', { firstYear, totalCount })}
        <span
          data-sanity={journalAttr('cornerLeftSub')}
          className="block mt-0.5 font-serif italic text-sm normal-case tracking-[0.04em] text-ink"
        >
          {cornerLeftSub}
        </span>
      </div>
      <div className="hidden md:block absolute top-[68px] right-12 z-[3] font-mono text-[10px] tracking-[0.18em] uppercase text-ink-faint text-right">
        N 52° 25′ · E 6° 38′
        <span
          data-sanity={journalAttr('cornerRightSub')}
          className="block mt-0.5 font-serif italic text-sm normal-case tracking-[0.04em] text-ink"
        >
          {cornerRightSub}
        </span>
      </div>

      <div
        className="absolute inset-0 z-[3] flex flex-col items-center justify-start pointer-events-none"
        style={{ paddingTop: 'clamp(120px, 13vh, 160px)' }}
      >
        <div className="inline-flex items-center gap-[18px] font-mono text-[10.5px] tracking-[0.32em] uppercase text-ink-faint mb-9 pointer-events-auto">
          <span data-sanity={journalAttr('kickerLeft')}>{kickerLeft}</span>
          <span className="text-accent text-[10px] -translate-y-px">✦</span>
          <span data-sanity={journalAttr('kickerRight')}>{kickerRight}</span>
        </div>

        <h1
          data-sanity={journalAttr('heading')}
          className="font-serif font-light leading-[0.96] text-ink text-center whitespace-nowrap m-0 pointer-events-auto"
          style={{
            fontSize: 'clamp(48px, 7.4vw, 108px)',
            letterSpacing: '-0.012em',
          }}
        >
          {heading}
        </h1>

        <div className="mt-7 flex items-center justify-center gap-3.5 text-ink-faint">
          <span className="w-9 h-px bg-current opacity-50" />
          <span className="w-[5px] h-[5px] rounded-full bg-accent" />
          <span className="w-9 h-px bg-current opacity-50" />
        </div>

        <p
          data-sanity={journalAttr('tagline')}
          className="mt-[22px] text-center text-ink-soft font-serif italic font-light max-w-[560px] leading-[1.45] px-6 pointer-events-auto"
          style={{
            fontSize: 'clamp(16px, 1.5vw, 21px)',
            letterSpacing: '0.01em',
          }}
        >
          {tagline}
        </p>
      </div>

      {/* fade hero into page bg */}
      <div className="hero-cap absolute inset-x-0 bottom-0 h-[280px] pointer-events-none z-[2]" />
    </section>
  )
}
