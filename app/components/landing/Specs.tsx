import { useTranslations } from 'next-intl'

import { dataAttr } from '@/sanity/lib/utils'

const organAttr = (id: string, path: string) =>
  dataAttr({ id, type: 'organ', path }).toString()

type NamedItem = { _key?: string; name: string; note?: string | null }
type Stop = { _key?: string; name: string; pitch?: string | null; note?: string | null }
type Register = {
  _key?: string
  name: string
  range?: string | null
  stops?: Stop[] | null
}

type Disposition = {
  manuals?: number | null
  stops?: number | null
  pitch?: string | null
  temperament?: string | null
  action?: string | null
  restoredYear?: number | null
  registers?: Register[] | null
  couplings?: NamedItem[] | null
  accessories?: NamedItem[] | null
}

type SpecsProps = {
  organId?: string
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

function NamedList({
  title,
  items,
  organId,
  field,
}: {
  title: string
  items: NamedItem[]
  organId?: string
  field: 'couplings' | 'accessories'
}) {
  const listAttr = organId
    ? organAttr(organId, `disposition.${field}`)
    : undefined
  return (
    <div className="mb-[22px]">
      <p className="font-mono text-[10.5px] tracking-[0.22em] uppercase text-accent m-0 mb-2">
        {title}
      </p>
      <ul data-sanity={listAttr} className="list-none m-0 p-0 flex flex-col">
        {items.map((item, i) => {
          const itemAttr =
            organId && item._key
              ? organAttr(
                  organId,
                  `disposition.${field}[_key=="${item._key}"]`,
                )
              : undefined
          return (
            <li
              key={item._key ?? `${item.name}-${i}`}
              data-sanity={itemAttr}
              className="py-[5px] font-serif text-[15.5px] text-ink leading-[1.3]"
            >
              {item.name}
              {item.note && (
                <span className="text-ink-faint italic font-light text-[13px] ml-1.5">
                  {item.note}
                </span>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function Specs({ organId, builder, year, disposition }: SpecsProps) {
  const t = useTranslations('Specs')
  const d: Disposition = disposition ?? {}
  const dispAttr = (path: string) =>
    organId ? organAttr(organId, `disposition.${path}`) : undefined
  const stats: { key: string; label: string; value: string; field: string }[] = []
  if (d.manuals != null)
    stats.push({ key: 'manuals', label: t('manuals'), value: String(d.manuals), field: 'manuals' })
  if (d.stops != null)
    stats.push({ key: 'stops', label: t('stops'), value: String(d.stops), field: 'stops' })
  if (d.pitch)
    stats.push({ key: 'pitch', label: t('pitch'), value: d.pitch, field: 'pitch' })
  if (d.temperament)
    stats.push({
      key: 'temperament',
      label: t('temperament'),
      value: d.temperament,
      field: 'temperament',
    })
  if (d.action)
    stats.push({ key: 'action', label: t('action'), value: d.action, field: 'action' })

  const builtLine = [
    year ? t('built', { year }) : null,
    d.restoredYear ? t('restored', { year: d.restoredYear }) : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <aside className="lg:sticky lg:top-8">
      <h3 className="font-mono text-[10.5px] tracking-[0.22em] uppercase text-ink-faint m-0 mb-4 pb-3 border-b border-rule-soft">
        {t('specification')}
      </h3>
      {builder && (
        <p
          data-sanity={organId ? organAttr(organId, 'builder') : undefined}
          className="font-serif text-[22px] font-medium text-ink m-0 mb-1 leading-[1.2]"
        >
          {builder}
        </p>
      )}
      {builtLine && (
        <p
          data-sanity={organId ? organAttr(organId, 'year') : undefined}
          className="font-mono text-[11px] tracking-[0.16em] uppercase text-ink-faint m-0 mb-[22px]"
        >
          {builtLine}
        </p>
      )}

      {stats.length > 0 && (
        <div className="grid grid-cols-1 gap-4 mb-7">
          {stats.map((s) => (
            <div
              key={s.key}
              data-sanity={dispAttr(s.field)}
              className="grid grid-cols-[1fr_auto] gap-3 pb-2.5 border-b border-rule-soft text-[13px]"
            >
              <span className="font-mono text-[10.5px] tracking-[0.16em] uppercase text-ink-faint">
                {s.label}
              </span>
              <span className="font-serif italic text-base text-ink text-right">{s.value}</span>
            </div>
          ))}
        </div>
      )}

      {((d.registers && d.registers.length > 0) ||
        (d.couplings && d.couplings.length > 0) ||
        (d.accessories && d.accessories.length > 0)) && (
        <div className="mt-2">
          {d.registers?.map((sec) => {
            const sectionAttr =
              organId && sec._key
                ? organAttr(organId, `disposition.registers[_key=="${sec._key}"]`)
                : undefined
            return (
              <div
                key={sec._key ?? sec.name}
                data-sanity={sectionAttr}
                className="mb-[22px]"
              >
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
                    {sec.stops.map((s) => {
                      const stopAttr =
                        organId && sec._key && s._key
                          ? organAttr(
                              organId,
                              `disposition.registers[_key=="${sec._key}"].stops[_key=="${s._key}"]`,
                            )
                          : undefined
                      return (
                        <li
                          key={s._key ?? `${sec.name}-${s.name}-${s.pitch ?? ''}`}
                          data-sanity={stopAttr}
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
                      )
                    })}
                  </ul>
                )}
              </div>
            )
          })}
          {d.couplings && d.couplings.length > 0 && (
            <NamedList
              title={t('couplings')}
              items={d.couplings as NamedItem[]}
              organId={organId}
              field="couplings"
            />
          )}
          {d.accessories && d.accessories.length > 0 && (
            <NamedList
              title={t('accessories')}
              items={d.accessories as NamedItem[]}
              organId={organId}
              field="accessories"
            />
          )}
        </div>
      )}
    </aside>
  )
}
