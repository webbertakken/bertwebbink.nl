'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'

import { OrganCard, type LandingOrgan } from './OrganCard'
import { loadMoreOrgans } from './archiveActions'
import { cityHref, sortedCitiesForSidebar, withYearGroups, type YearGroupItem } from './archiveUtil'

const PAGE_SIZE = 24

type OrgansArchiveProps = {
  initialOrgans: LandingOrgan[]
  totalCount: number
  cityCounts: Record<string, number>
  /** Active city filter — empty string when "all". */
  city: string
}

export function OrgansArchive({ initialOrgans, totalCount, cityCounts, city }: OrgansArchiveProps) {
  const [organs, setOrgans] = useState<LandingOrgan[]>(initialOrgans)
  const [loading, setLoading] = useState(false)
  const [exhausted, setExhausted] = useState(initialOrgans.length >= totalCount)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  // Reset when the filter changes (Next.js will remount with new initial data).
  useEffect(() => {
    setOrgans(initialOrgans)
    setExhausted(initialOrgans.length >= totalCount)
  }, [initialOrgans, totalCount])

  const fetchMore = useCallback(async () => {
    if (loading || exhausted) return
    setLoading(true)
    try {
      const more = await loadMoreOrgans({
        offset: organs.length,
        limit: PAGE_SIZE,
        city,
      })
      if (more.length === 0) {
        setExhausted(true)
      } else {
        setOrgans((prev) => {
          const next = [...prev, ...more]
          if (next.length >= totalCount) setExhausted(true)
          return next
        })
      }
    } finally {
      setLoading(false)
    }
  }, [loading, exhausted, organs.length, city, totalCount])

  useEffect(() => {
    const node = sentinelRef.current
    if (!node || exhausted) return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            void fetchMore()
            break
          }
        }
      },
      { rootMargin: '600px 0px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [fetchMore, exhausted])

  const grouped = useMemo<YearGroupItem[]>(() => withYearGroups(organs), [organs])
  const sortedCities = useMemo(() => sortedCitiesForSidebar(cityCounts), [cityCounts])
  const filterActive = city !== ''

  return (
    <section
      className="relative z-[4] pb-[120px]"
      style={{ marginTop: '-340px' }}
      data-screen-label="organ-archive"
    >
      <div className="max-w-[1320px] mx-auto px-12 grid gap-14 items-baseline grid-cols-1 lg:grid-cols-[minmax(0,1fr)_220px]">
        <div className="min-w-0">
          <ArchiveHeader
            filterActive={filterActive}
            city={city}
            shown={organs.length}
            total={totalCount}
          />
          <div className="grid gap-x-8 gap-y-10 grid-cols-1 sm:grid-cols-2">
            {grouped.map(({ organ, year, isYearStart }, i) => (
              <YearAwareCell
                key={organ._id}
                organ={organ}
                year={year}
                isYearStart={isYearStart}
                index={totalCount - i}
                totalCount={totalCount}
              />
            ))}
          </div>

          {!exhausted && (
            <div ref={sentinelRef} className="mt-12 flex justify-center" aria-hidden="true">
              <span className="font-mono text-[10.5px] tracking-[0.22em] uppercase text-ink-faint">
                {loading ? 'Loading…' : ''}
              </span>
            </div>
          )}
          {exhausted && organs.length > PAGE_SIZE && (
            <p className="mt-14 text-center font-mono text-[10.5px] tracking-[0.22em] uppercase text-ink-faint">
              — end of the archive —
            </p>
          )}
        </div>

        {sortedCities.length > 0 && (
          <aside className="lg:sticky lg:top-8">
            <h3 className="font-mono font-bold text-[10.5px] tracking-[0.22em] uppercase text-ink-faint m-0 mb-4 pb-3 border-b border-rule-soft">
              By city
            </h3>
            <ul className="list-none m-0 p-0 flex flex-col">
              {sortedCities.map(({ city: c, count }) => {
                const isActive = c === city
                return (
                  <li key={c}>
                    <Link
                      href={cityHref(c)}
                      className={`flex items-baseline justify-between gap-3 py-[9px] border-b border-rule-soft font-serif text-lg transition-all duration-300 hover:text-accent hover:pl-2 ${
                        isActive ? 'text-accent pl-2' : 'text-ink'
                      }`}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <span>{c}</span>
                      <span className="font-mono text-[10.5px] tracking-[0.1em] text-ink-faint">
                        {String(count).padStart(2, '0')}
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
            <div className="mt-4 font-mono text-[10.5px] tracking-[0.18em] uppercase text-ink-faint">
              <Link
                href={cityHref('')}
                className="text-ink-soft border-b border-rule pb-[3px] transition-colors duration-200 hover:text-accent hover:border-accent"
              >
                Browse all &nbsp;→
              </Link>
            </div>
          </aside>
        )}
      </div>
    </section>
  )
}

function ArchiveHeader({
  filterActive,
  city,
  shown,
  total,
}: {
  filterActive: boolean
  city: string
  shown: number
  total: number
}) {
  return (
    <div className="flex items-baseline justify-between mb-8 px-1 gap-6">
      <h2
        className="font-serif italic text-[22px] m-0 text-ink-soft"
        style={{ letterSpacing: '0.005em' }}
      >
        {filterActive ? (
          <>
            Visits in <span className="not-italic font-normal text-ink">{city}</span>
          </>
        ) : (
          'The archive'
        )}
      </h2>
      <span className="font-mono text-[11px] tracking-[0.22em] uppercase text-ink-faint flex items-center gap-3 whitespace-nowrap">
        <span>
          {shown} of {total}
        </span>
        {filterActive && (
          <Link
            href={cityHref('')}
            className="text-ink-soft border-b border-rule pb-[2px] transition-colors duration-200 hover:text-accent hover:border-accent"
          >
            clear filter ✕
          </Link>
        )}
      </span>
    </div>
  )
}

function YearAwareCell({
  organ,
  year,
  isYearStart,
  index,
  totalCount,
}: {
  organ: LandingOrgan
  year: number
  isYearStart: boolean
  index: number
  totalCount: number
}) {
  return (
    <>
      {isYearStart && <YearRule year={year} />}
      <OrganCard organ={organ} index={index} totalCount={totalCount} />
    </>
  )
}

function YearRule({ year }: { year: number }) {
  return (
    <div
      className="col-span-full flex items-center gap-4 mt-4 mb-1 first:mt-0 select-none"
      aria-label={`Year ${year}`}
    >
      <span className="font-mono text-[10.5px] tracking-[0.22em] uppercase text-ink-faint">
        {year}
      </span>
      <span className="flex-1 h-px bg-current opacity-15" />
    </div>
  )
}
