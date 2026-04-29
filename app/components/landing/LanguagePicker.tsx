'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'

import { LOCALES, LOCALE_ENDONYMS, type Locale } from '@/core/i18n/locales'
import { usePathname, useRouter } from '@/i18n/navigation'

/**
 * Routes whose `[slug]` segment is per-locale (the slug itself is
 * translated, not just the static segments). When switching locale on
 * one of these we look up the sibling slug for the target locale via
 * the `/api/locale-sibling` route; if no sibling exists we land on the
 * listing page instead of a 404.
 */
const SLUGGED_ROUTES = {
  '/journal/[slug]': { type: 'journal' as const, fallback: '/' as const },
  '/organs/[slug]': { type: 'organ' as const, fallback: '/organs' as const },
}
type SluggedPathname = keyof typeof SLUGGED_ROUTES

async function fetchSiblingSlug(
  type: 'journal' | 'organ',
  from: Locale,
  slug: string,
  to: Locale,
): Promise<string | null> {
  try {
    const url = `/api/locale-sibling?type=${encodeURIComponent(type)}&from=${encodeURIComponent(from)}&slug=${encodeURIComponent(slug)}&to=${encodeURIComponent(to)}`
    const resp = await fetch(url, { cache: 'no-store' })
    if (!resp.ok) return null
    const data = (await resp.json()) as { slug?: string | null }
    return typeof data.slug === 'string' && data.slug.length > 0 ? data.slug : null
  } catch {
    return null
  }
}

/**
 * Read on the client at module-eval time. `next-intl`/Next.js inlines
 * `NEXT_PUBLIC_*` env vars into the client bundle so this is safe.
 */
const I18N_ENABLED = process.env.NEXT_PUBLIC_I18N_ENABLED !== 'false'

type LanguagePickerProps = {
  locale: Locale
  className?: string
}

/**
 * Top-right language picker. Endonyms only (no flags). Mirrors the
 * mobile-panel pattern from `Nav.tsx`: outside-click + Esc + route
 * change close it. Uses `next-intl`'s `useRouter().replace(pathname,
 * { locale })` to swap the URL prefix; the cookie is updated by
 * `next-intl` automatically.
 */
export function LanguagePicker({ locale, className }: LanguagePickerProps) {
  const t = useTranslations('LanguagePicker')
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [, startTransition] = useTransition()
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // Phase-1 rollout flag — hide the picker entirely when i18n is off.
  if (!I18N_ENABLED) return null

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (panelRef.current?.contains(target)) return
      if (buttonRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointerDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointerDown)
    }
  }, [open])

  // For localised pathnames, `usePathname()` returns the canonical
  // template form (e.g. `/journal/[slug]`); switching locales needs
  // both the template + the resolved params so the new URL is built
  // correctly. The cast is required because the router's typed `href`
  // is the union of all known pathname keys, but TypeScript can't
  // narrow `pathname` (a runtime string) to one of them.
  const params = useParams()
  const switchTo = async (target: Locale) => {
    setOpen(false)
    if (target === locale) return
    const slugRoute = SLUGGED_ROUTES[pathname as SluggedPathname]
    const slug = typeof params.slug === 'string' ? params.slug : null
    let nextHref:
      | { pathname: string; params?: Record<string, string | string[]> }
      | string
    if (slugRoute && slug) {
      const siblingSlug = await fetchSiblingSlug(slugRoute.type, locale, slug, target)
      nextHref = siblingSlug
        ? { pathname, params: { ...params, slug: siblingSlug } as Record<string, string> }
        : { pathname: slugRoute.fallback }
    } else {
      nextHref = { pathname, params: params as Record<string, string | string[]> }
    }
    startTransition(() => {
      router.replace(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        nextHref as any,
        { locale: target },
      )
    })
  }

  return (
    <div className={`relative ${className ?? ''}`}>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('label')}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 font-mono text-[11px] tracking-[0.18em] uppercase text-ink-soft hover:text-ink transition-colors px-2 py-1.5 cursor-pointer"
      >
        <span>{LOCALE_ENDONYMS[locale]}</span>
        <svg viewBox="0 0 10 10" width="10" height="10" aria-hidden="true">
          <path
            d="M2 4 L5 7 L8 4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {open && (
        <div
          ref={panelRef}
          role="listbox"
          aria-label={t('label')}
          className="absolute right-0 top-full mt-2 z-10 min-w-[10rem] bg-paper border border-rule-soft rounded shadow-card-hover overflow-hidden"
        >
          <ul className="flex flex-col py-1 m-0 list-none">
            {LOCALES.map((target) => {
              const isActive = target === locale
              return (
                <li key={target}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    aria-label={t('switchTo', { language: LOCALE_ENDONYMS[target] })}
                    onClick={() => {
                      void switchTo(target)
                    }}
                    data-active={isActive}
                    className="w-full text-left px-3 py-2 text-sm text-ink hover:bg-bg-sunk data-[active=true]:text-accent cursor-pointer"
                  >
                    {LOCALE_ENDONYMS[target]}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
