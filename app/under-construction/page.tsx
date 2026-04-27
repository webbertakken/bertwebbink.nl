import type { Metadata } from 'next'

import { LAUNCH_AT_ISO, LAUNCH_AT_MS } from '@/core/launch'
import { Countdown } from './Countdown'

export const metadata: Metadata = {
  title: 'Onder constructie — Bert Webbink',
  description: 'Deze site wordt opnieuw opgebouwd.',
  robots: { index: false, follow: false },
}

type SearchParams = { bad?: string }

function ssrDiff(target: number) {
  const ms = Math.max(0, target - Date.now())
  return {
    days: Math.floor(ms / (24 * 60 * 60 * 1000)),
    hours: Math.floor(ms / (60 * 60 * 1000)) % 24,
    minutes: Math.floor(ms / (60 * 1000)) % 60,
    seconds: Math.floor(ms / 1000) % 60,
  }
}

const launchDateLabel = (ms: number) =>
  new Intl.DateTimeFormat('nl-NL', {
    timeZone: 'Europe/Amsterdam',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(ms))

export default async function UnderConstructionPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const { bad } = await searchParams
  const showCountdown = Number.isFinite(LAUNCH_AT_MS) && Date.now() < LAUNCH_AT_MS
  const year = new Date().getFullYear()

  return (
    <main className="min-h-screen bg-bg text-ink flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="font-mono text-[10.5px] tracking-[0.32em] uppercase text-ink-faint mb-7 inline-flex items-center gap-3.5">
        <span className="w-7 h-px bg-current opacity-50" />
        <span className="text-accent">✦</span>
        Onder constructie
      </div>

      <h1
        className="font-serif font-light leading-none m-0 mb-7 text-balance max-w-[18ch]"
        style={{ fontSize: 'clamp(48px, 6vw, 84px)', letterSpacing: '-0.012em' }}
      >
        Een veldjournaal, <em className="italic font-normal">in opbouw</em>.
      </h1>

      <p className="font-serif italic text-[19px] leading-[1.55] text-ink-soft m-0 max-w-[44ch] text-pretty">
        Deze site wordt opnieuw opgebouwd. Kom binnenkort terug — of laat van je horen.
      </p>

      {showCountdown && (
        <section className="mt-12 flex flex-col items-center gap-4">
          <Countdown launchAt={LAUNCH_AT_ISO} initial={ssrDiff(LAUNCH_AT_MS)} />
          <p className="font-mono text-[10px] tracking-[0.22em] uppercase text-ink-faint">
            Lancering: {launchDateLabel(LAUNCH_AT_MS)}
          </p>
        </section>
      )}

      <div className="mt-12 flex items-center gap-3.5 text-ink-faint">
        <span className="w-9 h-px bg-current opacity-50" />
        <span className="w-[5px] h-[5px] rounded-full bg-accent" />
        <span className="w-9 h-px bg-current opacity-50" />
      </div>

      <form
        action="/api/bypass"
        method="POST"
        className="mt-12 flex flex-col items-center gap-3"
        aria-label="Toegangscode"
      >
        <label
          htmlFor="bypass-code"
          className="font-mono text-[10px] tracking-[0.22em] uppercase text-ink-faint"
        >
          Heb je een code?
        </label>
        <div className="flex items-stretch gap-2">
          <input
            id="bypass-code"
            name="code"
            type="text"
            autoComplete="off"
            spellCheck={false}
            className="font-mono text-[12px] tracking-[0.12em] uppercase px-3 py-3 rounded-[2px] bg-paper text-ink placeholder:text-ink-faint focus:outline-none focus:ring-1 focus:ring-accent"
            style={{ border: '1px solid var(--color-rule-soft)', minWidth: '220px' }}
            placeholder="…"
            aria-invalid={bad ? 'true' : undefined}
            aria-describedby={bad ? 'bypass-error' : undefined}
          />
          <button type="submit" className="action-btn">
            Open
          </button>
        </div>
        {bad && (
          <p
            id="bypass-error"
            role="alert"
            className="font-mono text-[10px] tracking-[0.22em] uppercase text-accent"
          >
            Onbekende code
          </p>
        )}
      </form>

      <p className="mt-12 font-mono text-[10.5px] tracking-[0.22em] uppercase text-ink-faint">
        © Bert Webbink, {year}
      </p>
    </main>
  )
}
