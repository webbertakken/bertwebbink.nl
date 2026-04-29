'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'

import type { Locale } from '@/core/i18n/locales'

type SearchBoxProps = {
  locale: Locale
  /**
   * Visual mode. `inline` = collapsed icon that expands on click (desktop nav).
   * `expanded` = always-visible input (mobile drawer).
   */
  variant?: 'inline' | 'expanded'
}

export function SearchBox({ locale, variant = 'inline' }: SearchBoxProps) {
  const tNav = useTranslations('Nav')
  const tSearch = useTranslations('Search')
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlQuery = searchParams?.get('q') ?? ''

  const startExpanded = variant === 'expanded'
  const [open, setOpen] = useState(startExpanded)
  const [value, setValue] = useState(urlQuery)
  const inputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  // Sync the input with the URL when it changes (browser back/forward, manual edits).
  useEffect(() => {
    setValue(urlQuery)
  }, [urlQuery])

  // Inline-mode behaviour: focus on open, Esc + outside-click to close.
  useEffect(() => {
    if (startExpanded) return
    if (!open) return
    inputRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    const onPointerDown = (e: PointerEvent) => {
      if (formRef.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointerDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointerDown)
    }
  }, [open, startExpanded])

  const showInput = open || startExpanded

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const trimmed = value.trim()
    const target = trimmed
      ? `/${locale}/search?q=${encodeURIComponent(trimmed)}`
      : `/${locale}/search`
    router.push(target)
  }

  return (
    <form
      ref={formRef}
      role="search"
      onSubmit={handleSubmit}
      className={
        startExpanded ? 'flex items-center gap-2 w-full' : 'flex items-center gap-1.5'
      }
    >
      {showInput && (
        <input
          ref={inputRef}
          type="search"
          name="q"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-label={tSearch('placeholder')}
          placeholder={tSearch('placeholder')}
          autoComplete="off"
          className={
            startExpanded
              ? 'flex-1 bg-transparent border border-rule-soft rounded px-3 py-2 text-[13px] text-ink placeholder:text-ink-faint focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2'
              : 'w-44 lg:w-56 bg-transparent border-b border-rule text-[13px] text-ink placeholder:text-ink-faint focus-visible:outline-none focus-visible:border-accent py-1'
          }
        />
      )}
      <button
        type={showInput ? 'submit' : 'button'}
        onClick={!showInput ? () => setOpen(true) : undefined}
        aria-label={showInput ? tSearch('submit') : tNav('openSearch')}
        className="inline-flex items-center justify-center w-8 h-8 text-ink-soft hover:text-ink transition-colors cursor-pointer"
      >
        <svg
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M16.5 16.5 L21 21" />
        </svg>
      </button>
    </form>
  )
}
