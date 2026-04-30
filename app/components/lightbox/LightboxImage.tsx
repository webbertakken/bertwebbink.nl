'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { useTranslations } from 'next-intl'

import { useLightbox } from './LightboxProvider'

type LightboxImageProps = {
  /** High-resolution URL displayed inside the modal. */
  fullSrc: string
  /** Intrinsic dimensions of `fullSrc` so the modal can render via next/image. */
  fullWidth?: number
  fullHeight?: number
  alt: string
  caption?: string | null
  /** Optional class on the wrapping <button>. */
  className?: string
  /** The thumbnail markup (typically a `<Image>` element) shown in-page. */
  children: ReactNode
}

/**
 * Wraps `children` in a button that registers itself with the
 * surrounding `LightboxProvider` and opens the lightbox on click.
 *
 * Falls back to a plain wrapper if no provider is present so the page
 * still renders in isolation (e.g. during tests or in error boundaries).
 */
export function LightboxImage({
  fullSrc,
  fullWidth,
  fullHeight,
  alt,
  caption,
  className,
  children,
}: LightboxImageProps) {
  const t = useTranslations('Lightbox')
  const lightbox = useLightbox()
  const buttonRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    const el = buttonRef.current
    if (!el || !lightbox) return
    return lightbox.register(el, {
      src: fullSrc,
      alt,
      caption: caption ?? null,
      width: fullWidth,
      height: fullHeight,
    })
  }, [lightbox, fullSrc, alt, caption, fullWidth, fullHeight])

  if (!lightbox) {
    return <>{children}</>
  }

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={() => {
        if (buttonRef.current) lightbox.open(buttonRef.current)
      }}
      aria-label={t('open', { alt: alt || t('untitled') })}
      className={`block bg-transparent border-0 p-0 m-0 text-left cursor-zoom-in w-full h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded ${
        className ?? ''
      }`}
    >
      {children}
    </button>
  )
}
