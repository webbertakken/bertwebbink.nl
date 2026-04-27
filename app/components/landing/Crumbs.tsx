import { Fragment } from 'react'
import Link from 'next/link'

export type CrumbItem = { label: string; href?: string }

type CrumbsProps = {
  items: CrumbItem[]
  /**
   * When true, renders inside a 1240px max-width centered container
   * with horizontal padding — useful when used as a top-of-page strip
   * on hero pages. When false, renders bare so the parent controls
   * its placement (used by the no-hero pages' main content area).
   */
  bare?: boolean
  className?: string
}

const ROW_CLASSES =
  'font-mono text-[10.5px] tracking-[0.22em] uppercase text-ink-faint flex items-center gap-3'

export function Crumbs({ items, bare = false, className }: CrumbsProps) {
  const row = (
    <div className={`${ROW_CLASSES}${className ? ` ${className}` : ''}`}>
      {items.map((it, i) => {
        const isLast = i === items.length - 1
        const node = it.href && !isLast ? (
          <Link href={it.href} className="transition-colors hover:text-accent">
            {it.label}
          </Link>
        ) : (
          <span className={isLast ? 'text-ink' : ''}>{it.label}</span>
        )
        return (
          <Fragment key={i}>
            {node}
            {!isLast && <span className="opacity-40">/</span>}
          </Fragment>
        )
      })}
    </div>
  )

  if (bare) return row
  return (
    <div className="max-w-[1240px] mx-auto px-6 md:px-12 pt-6 pb-2">{row}</div>
  )
}
