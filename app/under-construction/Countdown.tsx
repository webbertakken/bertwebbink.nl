'use client'

import { useEffect, useState } from 'react'

type CountdownProps = {
  /** ISO timestamp of the launch moment. */
  launchAt: string
  /** Server-rendered fallback labels so the SSR output is meaningful pre-hydration. */
  initial: { days: number; hours: number; minutes: number; seconds: number }
}

function diff(now: number, target: number) {
  const ms = Math.max(0, target - now)
  const seconds = Math.floor(ms / 1000) % 60
  const minutes = Math.floor(ms / (60 * 1000)) % 60
  const hours = Math.floor(ms / (60 * 60 * 1000)) % 24
  const days = Math.floor(ms / (24 * 60 * 60 * 1000))
  return { days, hours, minutes, seconds, done: ms === 0 }
}

const pad = (n: number) => String(n).padStart(2, '0')

export function Countdown({ launchAt, initial }: CountdownProps) {
  const target = Date.parse(launchAt)
  const [t, setT] = useState({ ...initial, done: false })

  useEffect(() => {
    if (!Number.isFinite(target)) return
    const tick = () => {
      const next = diff(Date.now(), target)
      setT(next)
      // Once we reach zero, the gate has lifted. A reload pushes the visitor
      // through the now-disabled middleware to the real site.
      if (next.done) window.location.reload()
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [target])

  return (
    <div
      className="font-mono tracking-[0.18em] uppercase text-ink-faint flex items-baseline gap-3 sm:gap-5"
      aria-live="polite"
    >
      <Cell value={t.days} unit="days" />
      <Sep />
      <Cell value={t.hours} unit="hrs" />
      <Sep />
      <Cell value={t.minutes} unit="min" />
      <Sep />
      <Cell value={t.seconds} unit="sec" />
    </div>
  )
}

function Cell({ value, unit }: { value: number; unit: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <span
        className="font-serif font-light text-ink tabular-nums"
        style={{ fontSize: 'clamp(34px, 5vw, 56px)' }}
      >
        {pad(value)}
      </span>
      <span className="text-[9px] tracking-[0.28em]">{unit}</span>
    </div>
  )
}

function Sep() {
  return (
    <span
      aria-hidden
      className="font-serif font-light text-ink-faint"
      style={{ fontSize: 'clamp(28px, 4vw, 44px)' }}
    >
      ·
    </span>
  )
}
