'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { dataAttr } from '@/sanity/lib/utils'

type AudioBlockProps = {
  src: string
  title?: string | null
  kind?: string | null
  description?: string | null
  duration?: string | null
  /**
   * Document id + block key are used to build Visual Editing data-sanity
   * attributes so editors can click the title / kind label in draft mode
   * to jump straight to the field in Sanity Studio.
   */
  organId?: string
  blockKey?: string
}

const IconPlay = () => (
  <svg
    viewBox="0 0 16 16"
    fill="currentColor"
    aria-hidden="true"
    className="w-3.5 h-3.5 translate-x-px"
  >
    <polygon points="3,2 13,8 3,14" />
  </svg>
)

const IconPause = () => (
  <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" className="w-3.5 h-3.5">
    <rect x="4" y="2.5" width="2.5" height="11" />
    <rect x="9.5" y="2.5" width="2.5" height="11" />
  </svg>
)

// 64 stylized bars with a fixed pseudo-random envelope shape.
const BAR_COUNT = 64
const BARS = (() => {
  let seed = 42
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280
    return seed / 233280
  }
  return Array.from({ length: BAR_COUNT }).map((_, i) => {
    const env = Math.sin((i / (BAR_COUNT - 1)) * Math.PI)
    return 6 + env * 22 + rand() * 10
  })
})()

const fmtTime = (s: number) => {
  if (!Number.isFinite(s) || s < 0) return '00:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

export function AudioBlock({
  src,
  title,
  kind,
  description,
  duration,
  organId,
  blockKey,
}: AudioBlockProps) {
  const editAttrs = useMemo(() => {
    if (!organId || !blockKey) return { title: undefined, kind: undefined }
    const path = (field: string) => `content[_key=="${blockKey}"].${field}`
    return {
      title: dataAttr({ id: organId, type: 'organ', path: path('title') }).toString(),
      kind: dataAttr({ id: organId, type: 'organ', path: path('kind') }).toString(),
    }
  }, [organId, blockKey])
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0) // 0..1
  const [current, setCurrent] = useState(0)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    const a = audioRef.current
    if (!a) return
    const onTime = () => {
      setCurrent(a.currentTime)
      setProgress(a.duration > 0 ? a.currentTime / a.duration : 0)
    }
    const onMeta = () => setTotal(a.duration || 0)
    const onEnd = () => setPlaying(false)
    a.addEventListener('timeupdate', onTime)
    a.addEventListener('loadedmetadata', onMeta)
    a.addEventListener('ended', onEnd)
    return () => {
      a.removeEventListener('timeupdate', onTime)
      a.removeEventListener('loadedmetadata', onMeta)
      a.removeEventListener('ended', onEnd)
    }
  }, [])

  const toggle = () => {
    const a = audioRef.current
    if (!a) return
    if (playing) {
      a.pause()
      setPlaying(false)
    } else {
      void a.play()
      setPlaying(true)
    }
  }

  const seekTo = (frac: number) => {
    const a = audioRef.current
    if (!a || !total) return
    a.currentTime = Math.max(0, Math.min(total, frac * total))
  }

  const totalLabel = total > 0 ? fmtTime(total) : (duration ?? '—')
  const kindLabel = kind || 'Recording'

  return (
    <figure className="my-9 mb-8 px-6 py-[22px] bg-paper border border-rule-soft rounded shadow-[inset_0_1px_0_oklch(1_0_0/0.6)]">
      <div className="flex items-center justify-between gap-4 mb-3.5">
        <p data-sanity={editAttrs.title} className="font-serif italic text-lg text-ink m-0">
          {title || 'Recording'}
        </p>
        <span
          data-sanity={editAttrs.kind}
          className="font-mono text-[10.5px] tracking-[0.16em] uppercase text-ink-faint whitespace-nowrap"
        >
          {kindLabel} · {totalLabel}
        </span>
      </div>
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? 'Pause recording' : 'Play recording'}
          className="flex-none w-11 h-11 rounded-full bg-ink text-paper border-none cursor-pointer flex items-center justify-center transition-all duration-200 hover:bg-accent hover:scale-105"
        >
          {playing ? <IconPause /> : <IconPlay />}
        </button>
        <button
          type="button"
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect()
            seekTo((e.clientX - r.left) / r.width)
          }}
          aria-label="Seek"
          className="flex-1 h-11 flex items-center gap-0.5 cursor-pointer bg-transparent border-none p-0"
        >
          {BARS.map((h, i) => (
            <span
              key={i}
              aria-hidden="true"
              className={`flex-1 rounded-[1px] transition-colors duration-150 ${
                i / BAR_COUNT < progress ? 'bg-accent' : 'bg-rule'
              }`}
              style={{ height: `${h}px` }}
            />
          ))}
        </button>
        <span className="font-mono text-[11px] text-ink-faint tracking-[0.04em] flex-none whitespace-nowrap">
          {fmtTime(current)} / {totalLabel}
        </span>
      </div>
      {description && (
        <figcaption className="mt-3 font-serif italic text-[14.5px] leading-[1.5] text-ink-soft">
          {description}
        </figcaption>
      )}
      <audio ref={audioRef} preload="metadata" src={src} className="sr-only" />
    </figure>
  )
}
