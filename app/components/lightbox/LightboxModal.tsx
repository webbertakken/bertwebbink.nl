'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Image } from 'next-sanity/image'

import type { LightboxItem } from './LightboxProvider'

type LightboxModalProps = {
  items: LightboxItem[]
  index: number
  onClose: () => void
  onIndexChange: (next: number) => void
}

const SWIPE_THRESHOLD_PX = 40

export function LightboxModal({ items, index, onClose, onIndexChange }: LightboxModalProps) {
  const t = useTranslations('Lightbox')
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)
  const overlayRef = useRef<HTMLDivElement | null>(null)
  const touchStartXRef = useRef<number | null>(null)
  const [mounted, setMounted] = useState(false)

  const total = items.length
  const item = items[index]
  const hasMultiple = total > 1
  const next = () => onIndexChange(index + 1)
  const prev = () => onIndexChange(index - 1)

  // Lock body scroll while the modal is open and focus the close
  // button. We mount on the next tick so the entrance transition can
  // play from a clean initial state.
  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const raf = requestAnimationFrame(() => {
      setMounted(true)
      closeButtonRef.current?.focus()
    })
    return () => {
      document.body.style.overflow = previousOverflow
      cancelAnimationFrame(raf)
    }
  }, [])

  // Keyboard: Escape closes, ←/→ navigate when there are siblings.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (!hasMultiple) return
      if (event.key === 'ArrowRight') {
        event.preventDefault()
        next()
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault()
        prev()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  function onOverlayMouseDown(event: React.MouseEvent<HTMLDivElement>) {
    if (event.target === overlayRef.current) onClose()
  }

  function onTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    touchStartXRef.current = event.touches[0]?.clientX ?? null
  }

  function onTouchEnd(event: React.TouchEvent<HTMLDivElement>) {
    const startX = touchStartXRef.current
    touchStartXRef.current = null
    if (startX == null || !hasMultiple) return
    const endX = event.changedTouches[0]?.clientX
    if (endX == null) return
    const delta = endX - startX
    if (delta > SWIPE_THRESHOLD_PX) prev()
    else if (delta < -SWIPE_THRESHOLD_PX) next()
  }

  if (!item) return null

  const counter = hasMultiple ? `${index + 1} / ${total}` : null

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label={t('label')}
      onMouseDown={onOverlayMouseDown}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[oklch(0.18_0.012_70/0.92)] backdrop-blur-sm transition-opacity duration-200 ${
        mounted ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <button
        type="button"
        ref={closeButtonRef}
        onClick={onClose}
        aria-label={t('close')}
        className="absolute top-4 right-4 z-[2] inline-flex items-center justify-center w-10 h-10 rounded-full bg-[oklch(0.99_0.004_85/0.9)] text-ink shadow-card transition-colors hover:bg-[oklch(0.99_0.004_85)] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-5 h-5"
        >
          <path d="M6 6l12 12M6 18L18 6" />
        </svg>
      </button>

      {hasMultiple && (
        <>
          <button
            type="button"
            onClick={prev}
            aria-label={t('previous')}
            className="hidden md:inline-flex absolute left-4 top-1/2 -translate-y-1/2 z-[2] items-center justify-center w-11 h-11 rounded-full bg-[oklch(0.99_0.004_85/0.9)] text-ink shadow-card transition-colors hover:bg-[oklch(0.99_0.004_85)] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-5 h-5"
            >
              <path d="M15 6l-6 6 6 6" />
            </svg>
          </button>
          <button
            type="button"
            onClick={next}
            aria-label={t('next')}
            className="hidden md:inline-flex absolute right-4 top-1/2 -translate-y-1/2 z-[2] items-center justify-center w-11 h-11 rounded-full bg-[oklch(0.99_0.004_85/0.9)] text-ink shadow-card transition-colors hover:bg-[oklch(0.99_0.004_85)] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-5 h-5"
            >
              <path d="M9 6l6 6-6 6" />
            </svg>
          </button>
        </>
      )}

      <figure className="relative max-w-[min(96vw,1600px)] max-h-[min(92vh,1100px)] m-auto flex flex-col items-center justify-center">
        <Image
          key={item.src}
          src={item.src}
          alt={item.alt}
          width={item.width ?? 2400}
          height={item.height ?? 1600}
          sizes="96vw"
          className="block max-w-full max-h-[80vh] w-auto h-auto object-contain rounded shadow-card"
          priority
        />
        {(item.caption || counter) && (
          <figcaption className="mt-4 max-w-[min(96vw,900px)] flex items-baseline justify-between gap-6 text-[oklch(0.99_0.004_85)]">
            {item.caption ? (
              <span className="font-serif italic text-[15px] leading-[1.5] opacity-90 text-pretty">
                {item.caption}
              </span>
            ) : (
              <span />
            )}
            {counter && (
              <span className="font-mono not-italic text-[10.5px] tracking-[0.18em] uppercase opacity-70 whitespace-nowrap self-end">
                {counter}
              </span>
            )}
          </figcaption>
        )}
      </figure>
    </div>
  )
}
