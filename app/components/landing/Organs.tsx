import Link from 'next/link'

import { OrganCard, type LandingOrgan } from './OrganCard'

type OrgansProps = {
  organs: LandingOrgan[]
  totalCount: number
  cityCounts: Record<string, number>
}

export function Organs({ organs, totalCount, cityCounts }: OrgansProps) {
  const cities = Object.keys(cityCounts).sort((a, b) => a.localeCompare(b))

  return (
    <section
      className="relative z-[4] pb-[120px]"
      style={{ marginTop: '-340px' }}
      data-screen-label="latest-organs"
    >
      <div className="max-w-[1320px] mx-auto px-12 grid gap-14 items-baseline grid-cols-1 lg:grid-cols-[minmax(0,1fr)_220px]">
        <div className="min-w-0">
          <div className="flex items-baseline justify-between mb-8 px-1">
            <h2
              className="font-serif italic text-[22px] m-0 text-ink-soft"
              style={{ letterSpacing: '0.005em' }}
            >
              Recent visits
            </h2>
            <span className="font-mono text-[11px] tracking-[0.22em] uppercase text-ink-faint">
              {organs.length} of {totalCount} · updated weekly
            </span>
          </div>
          <div className="grid gap-8 grid-cols-1 sm:grid-cols-2">
            {organs.map((o, i) => (
              <OrganCard
                key={o._id}
                organ={o}
                index={totalCount - i}
                totalCount={totalCount}
              />
            ))}
          </div>
          <div className="mt-16 flex justify-center">
            <Link href="/organs" className="see-all-link">
              All organs &nbsp;→
            </Link>
          </div>
        </div>
        {cities.length > 0 && (
          <aside className="lg:sticky lg:top-8">
            <h3 className="font-mono font-bold text-[10.5px] tracking-[0.22em] uppercase text-ink-faint m-0 mb-4 pb-3 border-b border-rule-soft">
              By city
            </h3>
            <ul className="list-none m-0 p-0 flex flex-col">
              {cities.map((city) => (
                <li key={city}>
                  <a
                    href={`#city-${city.toLowerCase()}`}
                    className="flex items-baseline justify-between gap-3 py-[9px] border-b border-rule-soft font-serif text-lg text-ink transition-all duration-300 hover:text-accent hover:pl-2"
                  >
                    <span>{city}</span>
                    <span className="font-mono text-[10.5px] tracking-[0.1em] text-ink-faint">
                      {String(cityCounts[city]).padStart(2, '0')}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
            <div className="mt-4 font-mono text-[10.5px] tracking-[0.18em] uppercase text-ink-faint">
              <a
                href="#"
                className="text-ink-soft border-b border-rule pb-[3px] transition-colors duration-200 hover:text-accent hover:border-accent"
              >
                Browse all &nbsp;→
              </a>
            </div>
          </aside>
        )}
      </div>
    </section>
  )
}
