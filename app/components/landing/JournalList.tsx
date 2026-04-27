'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Image } from 'next-sanity/image'
import { stegaClean } from '@sanity/client/stega'

import { dataAttr, urlForImage } from '@/sanity/lib/utils'

export type JournalEntrySummary = {
  _id: string
  title: string
  slug: string
  excerpt: string | null
  date: string
  category:
    | 'travelogue'
    | 'workshop'
    | 'memorial'
    | 'home-organ'
    | 'biography'
    | 'news'
    | 'collection'
    | 'other'
    | string
    | null
  hasAudio: boolean
  coverImage: {
    asset?: { _ref: string; _type: 'reference' }
    alt?: string
  } | null
}

type JournalListProps = {
  entries: JournalEntrySummary[]
  totalCount: number
}

const PAGE_SIZE = 8

const CATEGORY_LABEL: Record<string, string> = {
  travelogue: 'Travel',
  workshop: 'Workshop',
  memorial: 'Memorial',
  'home-organ': 'Home organ',
  biography: 'Biography',
  news: 'News',
  collection: 'Collection',
  other: 'Other',
}

const CATEGORY_KIND: Record<string, string> = {
  travelogue: 'travelogue',
  workshop: 'visit',
  memorial: 'memorial',
  'home-organ': 'home organ',
  biography: 'biography',
  news: 'news',
  collection: 'collection',
  other: 'note',
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

const readMin = (excerpt: string | null) => {
  // Rough estimate from excerpt length (full content not in the
  // listing query). Assumes ~200 wpm, excerpt ~10% of full post.
  if (!excerpt) return 3
  const words = excerpt.trim().split(/\s+/).length
  return Math.max(2, Math.round((words * 10) / 200))
}

const figureLabelFor = (entry: JournalEntrySummary) => {
  const t = entry.title.trim()
  return t.length > 36 ? t.slice(0, 33).trim() + '…' : t
}

function EntryFigure({ entry }: { entry: JournalEntrySummary }) {
  const url = entry.coverImage?.asset?._ref
    ? urlForImage(entry.coverImage)?.width(560).height(420).fit('crop').url()
    : null
  return (
    <div className="post-figure relative aspect-[4/3] bg-bg-sunk border border-rule-soft rounded-[3px] overflow-hidden">
      {url ? (
        <Image
          src={url}
          alt={stegaClean(entry.coverImage?.alt) || entry.title}
          width={560}
          height={420}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{
            background:
              'repeating-linear-gradient(135deg, oklch(0.85 0.018 72) 0 16px, oklch(0.78 0.022 68) 16px 32px)',
          }}
        />
      )}
      <span className="absolute left-3 bottom-3 font-mono text-[10px] tracking-[0.04em] text-[oklch(0.30_0.012_70)] bg-[oklch(0.99_0.004_85/0.85)] px-2 py-1 rounded-sm">
        [ {figureLabelFor(entry)} ]
      </span>
      {entry.hasAudio && (
        <span
          className="absolute right-3 top-3 w-7 h-7 bg-[oklch(0.99_0.004_85/0.92)] text-ink rounded-full flex items-center justify-center text-sm"
          aria-label="Has audio"
          title="Has audio"
        >
          ♪
        </span>
      )}
    </div>
  )
}

function EntryRow({ entry, index }: { entry: JournalEntrySummary; index: number }) {
  const titleAttr = dataAttr({ id: entry._id, type: 'journal', path: 'title' }).toString()
  const cat = entry.category ?? 'other'
  const kind = CATEGORY_KIND[cat] ?? cat
  return (
    <Link
      href={`/journal/${entry.slug}`}
      data-sanity={titleAttr}
      className="group grid grid-cols-1 md:grid-cols-[140px_minmax(0,1fr)_280px] gap-6 md:gap-14 items-start py-10 border-t border-rule-soft transition-[padding] duration-[350ms] ease-[cubic-bezier(0.2,0.6,0.2,1)] hover:px-2"
    >
      <div className="font-mono text-[10.5px] tracking-[0.18em] uppercase text-ink-faint leading-[1.6] md:pt-3">
        <span className="block text-ink text-[11px] mb-1.5">
          N° {String(index).padStart(3, '0')}
        </span>
        {fmtDate(entry.date)}
        <br />
        {readMin(entry.excerpt)} min read
      </div>
      <div className="min-w-0">
        <span className="inline-block font-mono text-[10.5px] tracking-[0.22em] uppercase text-ink-faint mb-2.5">
          {kind}
        </span>
        <h2
          className="font-serif font-normal text-[28px] sm:text-[clamp(28px,3.2vw,40px)] leading-[1.12] m-0 mb-3.5 text-ink text-balance transition-colors group-hover:text-accent"
          style={{ letterSpacing: '-0.008em' }}
        >
          {entry.title}
        </h2>
        {entry.excerpt && (
          <p className="font-serif font-light text-[18px] leading-[1.55] text-ink-soft m-0 mb-4 max-w-[60ch] text-pretty line-clamp-3">
            {entry.excerpt}
          </p>
        )}
        <div className="font-mono text-[10.5px] tracking-[0.18em] uppercase text-ink-faint">
          <span className="text-ink inline-flex items-center gap-2 transition-[gap] duration-300 group-hover:gap-3.5">
            Read entry <span className="text-[11px]">→</span>
          </span>
        </div>
      </div>
      <EntryFigure entry={entry} />
    </Link>
  )
}

export function JournalList({ entries, totalCount }: JournalListProps) {
  const [activeCat, setActiveCat] = useState<string>('all')
  const [page, setPage] = useState(1)

  const counts = useMemo(() => {
    const m: Record<string, number> = { all: entries.length }
    for (const p of entries) {
      const c = p.category ?? 'other'
      m[c] = (m[c] ?? 0) + 1
    }
    return m
  }, [entries])

  const categories = useMemo(() => {
    const order = [
      'travelogue',
      'workshop',
      'memorial',
      'home-organ',
      'biography',
      'news',
      'collection',
      'other',
    ]
    return order.filter((c) => (counts[c] ?? 0) > 0)
  }, [counts])

  const filtered = useMemo(
    () =>
      activeCat === 'all'
        ? entries
        : entries.filter((p) => (p.category ?? 'other') === activeCat),
    [entries, activeCat],
  )

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const start = (safePage - 1) * PAGE_SIZE
  const visible = filtered.slice(start, start + PAGE_SIZE)

  const setCat = (c: string) => {
    setActiveCat(c)
    setPage(1)
  }

  const baseCount = activeCat === 'all' ? entries.length : counts[activeCat] ?? 0

  return (
    <section
      className="relative z-[4] pb-[120px]"
      style={{ marginTop: '-340px' }}
      data-screen-label="journal"
    >
      <div className="max-w-[1240px] mx-auto px-6 md:px-12">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-y border-rule-soft py-3.5 mb-14">
        <span className="font-mono text-[10.5px] tracking-[0.22em] uppercase text-ink-faint mr-3">
          Filter
        </span>
        <FilterButton
          label="All"
          count={counts.all ?? 0}
          active={activeCat === 'all'}
          onClick={() => setCat('all')}
        />
        {categories.map((c) => (
          <FilterButton
            key={c}
            label={CATEGORY_LABEL[c] ?? c}
            count={counts[c] ?? 0}
            active={activeCat === c}
            onClick={() => setCat(c)}
          />
        ))}
        <span className="ml-auto font-mono text-[10.5px] tracking-[0.18em] uppercase text-ink-faint">
          {String(baseCount).padStart(2, '0')} entries
        </span>
      </div>

      <div className="flex flex-col mb-12">
        {visible.length === 0 ? (
          <p className="font-serif italic text-ink-faint text-lg py-16 text-center">
            Nothing in this category yet.
          </p>
        ) : (
          visible.map((p, i) => (
            <EntryRow key={p._id} entry={p} index={totalCount - (start + i)} />
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-rule-soft pt-7 -mt-px pb-4">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage === 1}
            className="font-serif italic text-[18px] text-ink-soft border-b border-rule pb-[3px] transition-colors duration-200 hover:text-accent hover:border-accent disabled:opacity-50 disabled:pointer-events-none disabled:border-rule-soft cursor-pointer disabled:cursor-default bg-transparent border-x-0 border-t-0"
          >
            ← Newer
          </button>
          <span className="font-mono text-[10.5px] tracking-[0.22em] uppercase text-ink-faint">
            Page {safePage} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
            className="font-serif italic text-[18px] text-ink-soft border-b border-rule pb-[3px] transition-colors duration-200 hover:text-accent hover:border-accent disabled:opacity-50 disabled:pointer-events-none disabled:border-rule-soft cursor-pointer disabled:cursor-default bg-transparent border-x-0 border-t-0"
          >
            Older →
          </button>
        </div>
      )}
      </div>
    </section>
  )
}

function FilterButton({
  label,
  count,
  active,
  onClick,
}: {
  label: string
  count: number
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative bg-transparent border-0 py-1.5 text-[13px] tracking-[0.02em] cursor-pointer transition-colors duration-200 ${
        active ? 'text-ink' : 'text-ink-soft hover:text-ink'
      }`}
    >
      {label}
      <span className="ml-1.5 font-mono text-[10.5px] text-ink-faint align-baseline">
        ({count})
      </span>
      {active && (
        <span
          aria-hidden="true"
          className="absolute left-0 right-0 -bottom-[15px] h-px bg-accent"
        />
      )}
    </button>
  )
}
