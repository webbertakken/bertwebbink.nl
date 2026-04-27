'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

type NavProps = {
  active?: 'organs' | 'scores' | 'about' | 'elsewhere'
}

const ITEMS = [
  { id: 'organs', label: 'Organs', href: '/' },
  { id: 'scores', label: 'Scores', href: '/scores' },
  { id: 'about', label: 'About me', href: '/about' },
  { id: 'elsewhere', label: 'Elsewhere', href: '/elsewhere' },
] as const

function deriveActive(pathname: string): NavProps['active'] {
  if (pathname.startsWith('/scores')) return 'scores'
  if (pathname.startsWith('/about')) return 'about'
  if (pathname.startsWith('/elsewhere')) return 'elsewhere'
  return 'organs'
}

export function Nav({ active }: NavProps) {
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const pathname = usePathname()
  const current = active ?? deriveActive(pathname)

  // Close on route change
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  // Esc + outside click while open
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node
      if (panelRef.current?.contains(t) || btnRef.current?.contains(t)) return
      setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointerDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointerDown)
    }
  }, [open])

  return (
    <nav className="relative z-[5] max-w-[1320px] mx-auto px-6 md:px-12 pt-8 pb-3.5 flex items-center justify-between gap-6 md:gap-10">
      <Link
        href="/"
        className="font-serif text-2xl font-medium text-ink whitespace-nowrap inline-flex items-baseline gap-2.5"
        style={{ letterSpacing: '0.005em' }}
      >
        Bert Webbink
        <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-ink-faint border-l border-rule pl-2.5 ml-0.5 font-normal">
          Organist
        </span>
      </Link>

      {/* Desktop links */}
      <div className="hidden md:flex gap-10 text-[13px] text-ink-soft tracking-[0.04em]">
        {ITEMS.map((it) => (
          <Link
            key={it.id}
            href={it.href}
            className="nav-link"
            data-active={current === it.id}
            style={{ color: current === it.id ? 'var(--color-ink)' : undefined }}
          >
            {it.label}
          </Link>
        ))}
      </div>

      {/* Mobile hamburger */}
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        aria-controls="mobile-nav-panel"
        className="md:hidden inline-flex items-center justify-center w-11 h-11 -mr-2.5 text-ink cursor-pointer"
      >
        <svg
          viewBox="0 0 24 24"
          width="22"
          height="22"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          aria-hidden="true"
        >
          {open ? (
            <>
              <path d="M5 5 L19 19" />
              <path d="M5 19 L19 5" />
            </>
          ) : (
            <>
              <path d="M3 7 H21" />
              <path d="M3 12 H21" />
              <path d="M3 17 H21" />
            </>
          )}
        </svg>
      </button>

      {/* Mobile panel — absolute, drops below the nav */}
      {open && (
        <div
          ref={panelRef}
          id="mobile-nav-panel"
          className="md:hidden absolute left-6 right-6 top-full mt-2 bg-paper border border-rule-soft rounded shadow-card-hover overflow-hidden"
        >
          <ul className="flex flex-col py-2 m-0 list-none">
            {ITEMS.map((it) => {
              const isActive = current === it.id
              return (
                <li key={it.id}>
                  <Link
                    href={it.href}
                    data-active={isActive}
                    className="block px-5 py-3 font-serif text-lg text-ink transition-colors duration-200 hover:bg-bg-sunk data-[active=true]:text-accent"
                  >
                    {it.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </nav>
  )
}
