'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'

import { dataAttr } from '@/sanity/lib/utils'
import type { Locale } from '@/core/i18n/locales'
import { renderEmphasised, renderInlineItalic } from './renderEmphasised'

export type Score = {
  _id: string
  composer: string
  work: string
  catalog: string | null
  era: 'baroque' | 'dutch' | 'romantic' | 'modern' | 'arrangement' | string | null
  year: number | null
  pages: number | null
  editionNumber: number
  forInstrument: string | null
  edition: string | null
  blurb: string | null
  pdfUrl: string | null
  isFeatured: boolean | null
}

type ScoresProps = {
  locale: Locale
  scores: Score[]
  /** Editable hero copy. All fields fall back to design defaults. */
  copy?: {
    kicker?: string | null
    heading?: string | null
    tagline?: string | null
    noticeBody?: string | null
    editionLine?: string | null
    contactHref?: string | null
  } | null
}

const ERA_KEYS = ['baroque', 'dutch', 'romantic', 'modern', 'arrangement'] as const
type EraKey = (typeof ERA_KEYS)[number]
type FilterKey = 'all' | EraKey
type SortKey = 'composer' | 'year' | 'edition'

const FILTER_ORDER: FilterKey[] = ['all', ...ERA_KEYS]
const SORT_KEYS: SortKey[] = ['composer', 'year', 'edition']

const IconDownload = () => (
  <svg
    viewBox="0 0 12 12"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.4}
    aria-hidden="true"
    className="w-3 h-3"
  >
    <path d="M6 1 V8 M3 5.5 L6 8.5 L9 5.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M2 10.5 H10" strokeLinecap="round" />
  </svg>
)

const IconCaret = () => (
  <svg
    viewBox="0 0 10 10"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.4}
    aria-hidden="true"
    className="w-2.5 h-2.5"
  >
    <path d="M2 4 L5 7 L8 4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const SCORES_PAGE_TYPE = 'scoresPage'
const makeScoresPageAttr = (locale: Locale) => (path: string) =>
  dataAttr({
    id: `scoresPage-${locale}`,
    type: SCORES_PAGE_TYPE,
    path,
  }).toString()
const scoreAttr = (id: string, path: string) =>
  dataAttr({ id, type: 'score', path }).toString()

const fmtEdition = (n: number) => `Ed. Webbink · No. ${String(n).padStart(2, '0')}`
const fmtEditionShort = (n: number) => `Ed. Webbink · No. ${String(n).padStart(2, '0')}`

function useEraLabel(): (era: string | null) => string {
  const t = useTranslations('Scores.filters')
  return (era) => {
    if (!era) return ''
    if ((ERA_KEYS as readonly string[]).includes(era)) return t(era as never)
    return era
  }
}

function Crumbs() {
  const t = useTranslations('Crumbs')
  return (
    <div className="font-mono text-[10.5px] tracking-[0.22em] uppercase text-ink-faint flex items-center gap-3 mb-14">
      <Link href="/" className="transition-colors hover:text-accent">
        {t('home')}
      </Link>
      <span className="opacity-40">/</span>
      <span className="text-ink">{t('scores')}</span>
    </div>
  )
}

function Header({
  copy,
  scoresPageAttr,
}: {
  copy?: ScoresProps['copy']
  scoresPageAttr: (path: string) => string
}) {
  const t = useTranslations('Scores')
  const kicker = copy?.kicker ?? t('headerKickerFallback')
  const heading = copy?.heading ?? t('headerHeadingFallback')
  const tagline = copy?.tagline ?? t('headerTaglineFallback')
  return (
    <>
      <Crumbs />
      <div className="flex items-center gap-3.5 font-mono text-[10.5px] tracking-[0.32em] uppercase text-ink-faint mb-[22px]">
        <span className="w-7 h-px bg-current opacity-50" />
        <span className="text-accent">✦</span>
        <span data-sanity={scoresPageAttr('kicker')}>{kicker}</span>
      </div>
      <h1
        data-sanity={scoresPageAttr('heading')}
        className="font-serif font-light leading-[1.0] m-0 mb-7 text-balance max-w-[18ch]"
        style={{ fontSize: 'clamp(48px, 6vw, 84px)', letterSpacing: '-0.012em' }}
      >
        {renderEmphasised(heading)}
      </h1>
      <p
        data-sanity={scoresPageAttr('tagline')}
        className="font-serif italic text-[21px] leading-[1.5] text-ink-soft m-0 mb-14 max-w-[60ch] text-pretty"
      >
        {tagline}
      </p>
    </>
  )
}

function Toolbar({
  active,
  setActive,
  counts,
  total,
  sortKey,
  cycleSort,
}: {
  active: FilterKey
  setActive: (k: FilterKey) => void
  counts: Record<FilterKey, number>
  total: number
  sortKey: SortKey
  cycleSort: () => void
}) {
  const t = useTranslations('Scores')
  const sortLabel = t(`sortBy.${sortKey}` as never)
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-7 mb-9 border-b border-rule-soft">
      <div className="flex flex-wrap gap-1">
        {FILTER_ORDER.map((id) => (
          <button
            key={id}
            type="button"
            className="filter-btn"
            data-active={active === id}
            onClick={() => setActive(id)}
          >
            {t(`filters.${id}` as never)}
            <span className="count">/ {counts[id] ?? 0}</span>
          </button>
        ))}
      </div>
      <div className="flex items-center gap-3.5 font-mono text-[11px] tracking-[0.18em] uppercase text-ink-faint">
        <span>{t('editionsCount', { count: total })}</span>
        <button type="button" className="sort-btn" onClick={cycleSort}>
          {t('sort', { label: sortLabel })} <IconCaret />
        </button>
      </div>
    </div>
  )
}

function ScoreCoverFeatured({ score }: { score: Score }) {
  return (
    <div className="score-cover">
      <div className="font-mono text-[9.5px] tracking-[0.32em] uppercase text-ink-faint text-center">
        {fmtEdition(score.editionNumber)}
      </div>
      <div className="flex flex-col gap-3.5 items-center text-center -mt-3">
        <div className="font-serif italic font-normal text-lg text-ink-soft">{score.composer}</div>
        <div className="font-serif font-normal text-[26px] leading-[1.15] text-ink text-balance">
          {renderInlineItalic(score.work)}
        </div>
        <div className="flex items-center gap-2 text-ink-faint">
          <span className="w-6 h-px bg-current opacity-60" />
          <span className="w-1 h-1 rounded-full bg-accent" />
          <span className="w-6 h-px bg-current opacity-60" />
        </div>
        {score.catalog && (
          <div className="font-serif italic font-normal text-lg text-ink-soft">
            {score.catalog}
          </div>
        )}
      </div>
      <div className="flex flex-col items-center gap-1.5 font-mono text-[9px] tracking-[0.22em] uppercase text-ink-faint">
        <span
          className="w-[38px] h-[38px] rounded-full flex items-center justify-center text-[11px]"
          style={{ border: '1px solid var(--color-ink-faint)' }}
        >
          B<span className="opacity-50">·</span>W
        </span>
        {score.forInstrument && <span>{score.forInstrument}</span>}
      </div>
    </div>
  )
}

function Featured({ score }: { score: Score }) {
  const t = useTranslations('Scores')
  const eraLabel = useEraLabel()
  const composerAttr = scoreAttr(score._id, 'composer')
  const workAttr = scoreAttr(score._id, 'work')
  const blurbAttr = scoreAttr(score._id, 'blurb')
  const featuredFlagAttr = scoreAttr(score._id, 'isFeatured')
  const editionNumAttr = scoreAttr(score._id, 'editionNumber')

  const periodLabel = [eraLabel(score.era), score.year ? `ca. ${score.year}` : null]
    .filter(Boolean)
    .join(' · ')

  return (
    <section
      className="grid grid-cols-1 md:grid-cols-[360px_1fr] gap-14 pt-2 pb-16 mb-16 border-b border-rule-soft"
      data-screen-label="featured"
    >
      <ScoreCoverFeatured score={score} />
      <div className="pt-2">
        <p
          data-sanity={featuredFlagAttr}
          className="font-mono text-[10.5px] tracking-[0.32em] uppercase text-accent m-0 mb-[18px] flex items-center gap-3"
        >
          <span className="w-7 h-px bg-current opacity-60" />
          {t('featuredHeader')} ·{' '}
          <span data-sanity={editionNumAttr}>
            {t('editionNumber', { number: String(score.editionNumber).padStart(2, '0') })}
          </span>
        </p>
        <h2
          className="font-serif font-light text-balance m-0 mb-5"
          style={{
            fontSize: 'clamp(34px, 3.4vw, 46px)',
            lineHeight: 1.08,
            letterSpacing: '-0.008em',
          }}
        >
          <span data-sanity={composerAttr}>{score.composer}</span> —{' '}
          <em data-sanity={workAttr} className="italic font-normal">
            {renderInlineItalic(score.work)}
          </em>
          .
        </h2>
        {score.blurb && (
          <p
            data-sanity={blurbAttr}
            className="text-[16.5px] leading-[1.7] text-ink-soft m-0 mb-7 max-w-[60ch] text-pretty"
          >
            {score.blurb}
          </p>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-[18px] gap-x-9 mb-7 pb-5 border-b border-rule-soft">
          {(
            [
              [t('meta.catalog'), score.catalog, 'catalog'],
              [t('meta.period'), periodLabel || null, 'era'],
              [t('meta.pages'), score.pages ? String(score.pages) : null, 'pages'],
              [t('meta.edition'), score.edition, 'edition'],
            ] as const
          ).map(([k, v, field]) =>
            v ? (
              <div key={k} data-sanity={scoreAttr(score._id, field)} className="flex flex-col">
                <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-ink-faint mb-1">
                  {k}
                </span>
                <span className="font-serif italic text-lg text-ink">{v}</span>
              </div>
            ) : null,
          )}
        </div>
        <div data-sanity={scoreAttr(score._id, 'pdfFile')} className="flex flex-wrap gap-3">
          {score.pdfUrl ? (
            <a
              href={score.pdfUrl}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="action-btn no-underline"
            >
              <IconDownload /> {t('downloadPdf')}
            </a>
          ) : (
            <span className="action-btn ghost opacity-60 cursor-not-allowed">
              <IconDownload /> {t('noPdfYet')}
            </span>
          )}
        </div>
      </div>
    </section>
  )
}

function ScoreCard({ score }: { score: Score }) {
  const t = useTranslations('Scores')
  const eraLabel = useEraLabel()
  return (
    <a
      href={score.pdfUrl ?? undefined}
      download={score.pdfUrl ? '' : undefined}
      target={score.pdfUrl ? '_blank' : undefined}
      rel={score.pdfUrl ? 'noopener noreferrer' : undefined}
      onClick={(e) => {
        if (!score.pdfUrl) e.preventDefault()
      }}
      data-sanity={scoreAttr(score._id, 'work')}
      className={`score-card flex flex-col gap-[18px] no-underline ${
        score.pdfUrl ? 'cursor-pointer' : 'cursor-default'
      }`}
    >
      <div className="mini-cover">
        <div
          data-sanity={scoreAttr(score._id, 'editionNumber')}
          className="font-mono text-[8.5px] tracking-[0.28em] uppercase text-ink-faint"
        >
          {fmtEditionShort(score.editionNumber)}
        </div>
        <div className="flex flex-col gap-2 items-center -mt-1.5">
          <div
            data-sanity={scoreAttr(score._id, 'composer')}
            className="font-serif italic font-normal text-[13px] text-ink-soft"
          >
            {score.composer}
          </div>
          <div
            data-sanity={scoreAttr(score._id, 'work')}
            className="font-serif font-normal text-base leading-[1.15] text-ink text-balance max-w-[18ch]"
          >
            {renderInlineItalic(score.work)}
          </div>
          <span className="w-1 h-1 rounded-full bg-accent" />
          {score.catalog && (
            <div
              data-sanity={scoreAttr(score._id, 'catalog')}
              className="font-mono text-[8.5px] tracking-[0.22em] uppercase text-ink-faint"
            >
              {score.catalog}
            </div>
          )}
        </div>
        {score.forInstrument && (
          <div
            data-sanity={scoreAttr(score._id, 'forInstrument')}
            className="font-mono text-[8.5px] tracking-[0.22em] uppercase text-ink-faint"
          >
            {score.forInstrument}
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1.5 px-0.5">
        <div className="flex items-baseline justify-between gap-3 font-mono text-[10px] tracking-[0.18em] uppercase text-ink-faint">
          <span data-sanity={scoreAttr(score._id, 'era')} className="text-accent">
            {eraLabel(score.era)}
          </span>
          {score.year && (
            <span data-sanity={scoreAttr(score._id, 'year')}>{score.year}</span>
          )}
        </div>
        <h4
          data-sanity={scoreAttr(score._id, 'work')}
          className="font-serif font-normal text-[22px] leading-[1.18] m-0 text-ink text-balance"
        >
          {renderInlineItalic(score.work)}
        </h4>
        <p
          data-sanity={scoreAttr(score._id, 'composer')}
          className="font-serif italic text-[15px] text-ink-soft m-0"
        >
          {score.composer}
        </p>
        <div className="mt-1.5 pt-2.5 flex items-center justify-between font-mono text-[10px] tracking-[0.18em] uppercase text-ink-faint border-t border-rule-soft">
          <span>
            {score.pages != null && (
              <span data-sanity={scoreAttr(score._id, 'pages')}>
                {t('pagesShort', { count: score.pages })}
              </span>
            )}
            {score.pages == null && '—'}
            {score.catalog && (
              <>
                {' · '}
                <span data-sanity={scoreAttr(score._id, 'catalog')}>{score.catalog}</span>
              </>
            )}
          </span>
          <span
            data-sanity={scoreAttr(score._id, 'pdfFile')}
            className="text-ink inline-flex items-center gap-1.5 transition-colors duration-200 hover:text-accent"
          >
            <IconDownload /> {score.pdfUrl ? t('pdfTag') : t('comingSoon')}
          </span>
        </div>
      </div>
    </a>
  )
}

function Grid({ scores, total }: { scores: Score[]; total: number }) {
  const t = useTranslations('Scores')
  return (
    <section data-screen-label="grid">
      <div className="flex items-baseline justify-between gap-6 mb-7">
        <h3 className="font-serif font-normal text-3xl m-0" style={{ letterSpacing: '-0.005em' }}>
          {t.rich('libraryHeading', {
            em: (chunks) => <em className="italic">{chunks}</em>,
          })}
        </h3>
        <span className="font-mono text-[10.5px] tracking-[0.18em] uppercase text-ink-faint">
          {t('showing', { shown: scores.length, total })}
        </span>
      </div>
      {scores.length === 0 ? (
        <p className="font-serif italic text-ink-faint text-lg pb-24">
          {t('emptyFilter')}
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-9 gap-x-8 pb-24">
          {scores.map((s) => (
            <ScoreCard key={s._id} score={s} />
          ))}
        </div>
      )}
    </section>
  )
}

function Notice({
  locale,
  body,
  editionLine,
  contactHref,
}: {
  locale: Locale
  body?: string | null
  editionLine?: string | null
  contactHref?: string | null
}) {
  const settingsId = `settings-${locale}`
  const noticeAttr = dataAttr({
    id: settingsId,
    type: 'settings',
    path: 'scoresNoticeBody',
  }).toString()
  const editionAttr = dataAttr({
    id: settingsId,
    type: 'settings',
    path: 'scoresEditionLine',
  }).toString()
  const t = useTranslations('Scores')
  const text = body ?? t('noticeBodyFallback')
  const editionPrefix = editionLine ?? t('noticeEditionLineFallback')
  const href = contactHref ?? 'mailto:bert@webbink.nl'
  return (
    <section
      className="mx-6 md:mx-12 mt-8 mb-20 max-w-[1240px] xl:mx-auto px-8 py-7 bg-paper rounded grid grid-cols-1 md:grid-cols-[auto_1fr_auto] gap-6 items-center"
      style={{ border: '1px solid var(--color-rule-soft)' }}
      data-screen-label="notice"
    >
      <div
        className="w-11 h-11 rounded-full flex items-center justify-center font-serif italic text-[22px] text-accent"
        style={{ border: '1px solid var(--color-accent)' }}
      >
        §
      </div>
      <div>
        <p
          data-sanity={noticeAttr}
          className="m-0 font-serif italic text-[17px] leading-[1.5] text-ink text-pretty"
        >
          {text}
        </p>
        <small className="block mt-1 font-mono text-[10px] tracking-[0.22em] uppercase text-ink-faint not-italic">
          <span data-sanity={editionAttr}>{editionPrefix}</span> · {new Date().getFullYear()}
        </small>
      </div>
      <a className="action-btn ghost not-italic no-underline" href={href}>
        {t('writeToMe')}
      </a>
    </section>
  )
}

function EmptyLibrary() {
  const t = useTranslations('Scores')
  return (
    <section className="pt-2 pb-24 text-center">
      <p className="font-serif italic text-2xl text-ink-soft m-0 mb-4 max-w-[40ch] mx-auto">
        {t('emptyTitle')}
      </p>
      <p className="font-serif italic text-lg text-ink-faint m-0 max-w-[50ch] mx-auto">
        {t('emptyBody')}
      </p>
    </section>
  )
}

export function Scores({ locale, scores, copy }: ScoresProps) {
  const [active, setActive] = useState<FilterKey>('all')
  const [sortIdx, setSortIdx] = useState(0)
  const sortKey = SORT_KEYS[sortIdx]
  const scoresPageAttr = makeScoresPageAttr(locale)

  const counts = useMemo(() => {
    const out: Record<FilterKey, number> = {
      all: scores.length,
      baroque: 0,
      dutch: 0,
      romantic: 0,
      modern: 0,
      arrangement: 0,
    }
    for (const s of scores) {
      const k = s.era as EraKey | null
      if (k && k in out) out[k] += 1
    }
    return out
  }, [scores])

  const featured = scores.find((s) => s.isFeatured) ?? null

  const visible = useMemo(() => {
    const filtered = active === 'all' ? scores : scores.filter((s) => s.era === active)
    return [...filtered].sort((a, b) => {
      switch (sortKey) {
        case 'composer':
          return a.composer.localeCompare(b.composer)
        case 'year':
          return (a.year ?? 0) - (b.year ?? 0)
        case 'edition':
          return (b.editionNumber ?? 0) - (a.editionNumber ?? 0)
      }
    })
  }, [scores, active, sortKey])

  const cycleSort = () => setSortIdx((i) => (i + 1) % SORT_KEYS.length)

  return (
    <>
      <main className="max-w-[1240px] mx-auto px-6 md:px-12 pt-8" data-screen-label="scores">
        <Header copy={copy} scoresPageAttr={scoresPageAttr} />
        {scores.length === 0 ? (
          <EmptyLibrary />
        ) : (
          <>
            <Toolbar
              active={active}
              setActive={setActive}
              counts={counts}
              total={scores.length}
              sortKey={sortKey}
              cycleSort={cycleSort}
            />
            {featured && <Featured score={featured} />}
            <Grid scores={visible} total={scores.length} />
          </>
        )}
      </main>
      <Notice
        locale={locale}
        body={copy?.noticeBody ?? null}
        editionLine={copy?.editionLine ?? null}
        contactHref={copy?.contactHref ?? null}
      />
    </>
  )
}
