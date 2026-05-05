'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

type LightboxImageProps = {
  /**
   * Source URL of the image. Re-used verbatim by the modal so the
   * browser/CDN serve the version the page already has cached \u2014 the
   * modal opens instantly instead of waiting for a fresh transform.
   */
  src: string
  alt: string
  className?: string
  /** Thumbnail markup (typically a `<Image>` element) shown in-page. */
  children: ReactNode
}

/**
 * Wraps an image in a button that opens a minimal modal showing the
 * same image scaled up. WCAG 2.2 considerations:
 *
 *  \u00b7 Trigger and modal both expose proper roles + accessible names.
 *  \u00b7 Focus moves into the modal on open, returns to the trigger on close.
 *  \u00b7 Tab is captured inside the dialog so focus cannot leak out.
 *  \u00b7 Escape closes; clicking the backdrop or the image also closes.
 *  \u00b7 Body scroll is locked while the modal is open.
 */
export function LightboxImage({ src, alt, className, children }: LightboxImageProps) {
  const t = useTranslations('Lightbox')
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const closeRef = useRef<HTMLButtonElement | null>(null)
  const wasOpenRef = useRef(false)

  // Setup while the modal is open: focus the close affordance, lock
  // body scroll, listen for Escape. Cleanup on close/unmount.
  useEffect(() => {
    if (!open) return
    closeRef.current?.focus()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  // Restore focus to the trigger only when transitioning open \u2192 closed
  // through user action (not on first mount or when the trigger itself
  // unmounts).
  useEffect(() => {
    if (wasOpenRef.current && !open) {
      triggerRef.current?.focus()
    }
    wasOpenRef.current = open
  }, [open])

  function onDialogKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Tab') return
    // Single focusable inside the dialog \u2014 keep focus pinned to it so
    // tabbing never lands on background page chrome behind the modal.
    event.preventDefault()
    closeRef.current?.focus()
  }

  const triggerLabel = t('open', { alt: alt || t('untitled') })

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={triggerLabel}
        className={`block bg-transparent border-0 p-0 m-0 text-left cursor-zoom-in w-full h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded ${
          className ?? ''
        }`}
      >
        {children}
      </button>
      {open && typeof document !== 'undefined'
        ? createPortal(
            <div
              role="dialog"
              aria-modal="true"
              aria-label={t('label')}
              onClick={() => setOpen(false)}
              onKeyDown={onDialogKeyDown}
              className="fixed inset-0 z-[100] flex items-center justify-center bg-[oklch(0.18_0.012_70/0.9)] backdrop-blur-sm cursor-zoom-out p-4"
            >
              {/* Visually-hidden close button: discoverable for screen
                  readers and keyboard users; receives initial focus. */}
              <button
                ref={closeRef}
                type="button"
                onClick={() => setOpen(false)}
                className="sr-only"
              >
                {t('close')}
              </button>
              {/* Plain <img> intentionally: same URL as the thumbnail so
                  the browser/CDN serve a warm cache hit. next/image
                  would generate a fresh proxy URL and refetch. */}
              {/* eslint-disable-next-line nextjs/no-img-element */}
              <img
                src={src}
                alt={alt}
                decoding="sync"
                fetchPriority="high"
                className="block max-w-[90vw] max-h-[90vh] w-auto h-auto object-contain shadow-card rounded"
              />
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
