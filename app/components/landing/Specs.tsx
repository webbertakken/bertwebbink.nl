type NamedItem = { name: string; note?: string | null }

type Disposition = {
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
  couplings?: NamedItem[] | null
  accessories?: NamedItem[] | null
}

type SpecsProps = {
  builder?: string | null
  year?: number | null
  disposition?: Disposition | null
}

/** Returns true if any field on the sidebar would render. */
export function hasSpecs({ builder, year, disposition }: SpecsProps): boolean {
  if (builder || year) return true
  if (!disposition) return false
  return Boolean(
    disposition.manuals ||
      disposition.stops ||
      disposition.pitch ||
      disposition.temperament ||
      disposition.action ||
      disposition.restoredYear ||
      (disposition.registers && disposition.registers.length > 0) ||
      (disposition.couplings && disposition.couplings.length > 0) ||
      (disposition.accessories && disposition.accessories.length > 0),
  )
}

function NamedList({ title, items }: { title: string; items: NamedItem[] }) {
  return (
    <div className="mb-[22px]">
      <p className="font-mono text-[10.5px] tracking-[0.22em] uppercase text-accent m-0 mb-2">
        {title}
      </p>
      <ul className="list-none m-0 p-0 flex flex-col">
        {items.map((item, i) => (
          <li
            key={`${item.name}-${i}`}
            className="py-[5px] font-serif text-[15.5px] text-ink leading-[1.3]"
          >
            {item.name}
            {item.note && (
              <span className="text-ink-faint italic font-light text-[13px] ml-1.5">
                {item.note}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function Specs({ builder, year, disposition }: SpecsProps) {
  const d = disposition ?? {}
  const stats: [string, string][] = []
  if (d.manuals != null) stats.push(['Manuals', String(d.manuals)])
  if (d.stops != null) stats.push(['Stops', String(d.stops)])
  if (d.pitch) stats.push(['Pitch', d.pitch])
  if (d.temperament) stats.push(['Temperament', d.temperament])
  if (d.action) stats.push(['Action', d.action])

  const builtLine = [
    year ? `Built ${year}` : null,
    d.restoredYear ? `Restored ${d.restoredYear}` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <aside className="lg:sticky lg:top-8">
      <h3 className="font-mono text-[10.5px] tracking-[0.22em] uppercase text-ink-faint m-0 mb-4 pb-3 border-b border-rule-soft">
        Specification
      </h3>
      {builder && (
        <p className="font-serif text-[22px] font-medium text-ink m-0 mb-1 leading-[1.2]">
          {builder}
        </p>
      )}
      {builtLine && (
        <p className="font-mono text-[11px] tracking-[0.16em] uppercase text-ink-faint m-0 mb-[22px]">
          {builtLine}
        </p>
      )}

      {stats.length > 0 && (
        <div className="grid grid-cols-1 gap-4 mb-7">
          {stats.map(([k, v]) => (
            <div
              key={k}
              className="grid grid-cols-[1fr_auto] gap-3 pb-2.5 border-b border-rule-soft text-[13px]"
            >
              <span className="font-mono text-[10.5px] tracking-[0.16em] uppercase text-ink-faint">
                {k}
              </span>
              <span className="font-serif italic text-base text-ink text-right">{v}</span>
            </div>
          ))}
        </div>
      )}

      {((d.registers && d.registers.length > 0) ||
        (d.couplings && d.couplings.length > 0) ||
        (d.accessories && d.accessories.length > 0)) && (
        <div className="mt-2">
          {d.registers?.map((sec) => (
            <div key={sec.name} className="mb-[22px]">
              <p className="font-mono text-[10.5px] tracking-[0.22em] uppercase text-accent m-0 mb-2">
                {sec.name}
                {sec.range && (
                  <span className="text-ink-faint normal-case tracking-[0.04em] ml-1.5 italic font-serif">
                    {' '}
                    {sec.range}
                  </span>
                )}
              </p>
              {sec.stops && sec.stops.length > 0 && (
                <ul className="list-none m-0 p-0 flex flex-col">
                  {sec.stops.map((s) => (
                    <li
                      key={`${sec.name}-${s.name}-${s.pitch ?? ''}`}
                      className="grid grid-cols-[1fr_auto] gap-3 py-[5px] font-serif text-[15.5px] text-ink leading-[1.3]"
                    >
                      <span>
                        {s.name}
                        {s.note && (
                          <span className="text-ink-faint italic font-light text-[13px] ml-1.5">
                            {s.note}
                          </span>
                        )}
                      </span>
                      <span className="font-mono not-italic text-[11px] text-ink-faint tracking-[0.04em]">
                        {s.pitch ?? ''}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
          {d.couplings && d.couplings.length > 0 && (
            <NamedList title="Couplings" items={d.couplings} />
          )}
          {d.accessories && d.accessories.length > 0 && (
            <NamedList title="Accessories" items={d.accessories} />
          )}
        </div>
      )}
    </aside>
  )
}
