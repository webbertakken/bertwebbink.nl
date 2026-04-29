'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'

import { LOCALES, LOCALE_ENDONYMS, type Locale } from '@/core/i18n/locales'
import { usePathname, useRouter } from '@/i18n/navigation'

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

  const switchTo = (target: Locale) => {
    setOpen(false)
    if (target === locale) return
    startTransition(() => {
      router.replace(pathname, { locale: target })
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
                    onClick={() => switchTo(target)}
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
