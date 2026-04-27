import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Onder constructie — Bert Webbink',
  description: 'Deze site wordt opnieuw opgebouwd.',
  robots: { index: false, follow: false },
}

export default function UnderConstructionPage() {
  const year = new Date().getFullYear()
  return (
    <main className="min-h-screen bg-bg text-ink flex flex-col items-center justify-center px-6 text-center">
      <div className="font-mono text-[10.5px] tracking-[0.32em] uppercase text-ink-faint mb-7 inline-flex items-center gap-3.5">
        <span className="w-7 h-px bg-current opacity-50" />
        <span className="text-accent">✦</span>
        Onder constructie
      </div>

      <h1
        className="font-serif font-light leading-none m-0 mb-7 text-balance max-w-[18ch]"
        style={{ fontSize: 'clamp(48px, 6vw, 84px)', letterSpacing: '-0.012em' }}
      >
        Een veldjournaal,{' '}
        <em className="italic font-normal">in opbouw</em>.
      </h1>

      <p className="font-serif italic text-[19px] leading-[1.55] text-ink-soft m-0 max-w-[44ch] text-pretty">
        Deze site wordt opnieuw opgebouwd. Kom binnenkort terug — of laat van je horen.
      </p>

      <div className="mt-10 flex items-center gap-3.5 text-ink-faint">
        <span className="w-9 h-px bg-current opacity-50" />
        <span className="w-[5px] h-[5px] rounded-full bg-accent" />
        <span className="w-9 h-px bg-current opacity-50" />
      </div>

      <p className="mt-12 font-mono text-[10.5px] tracking-[0.22em] uppercase text-ink-faint">
        © Bert Webbink, {year}
      </p>
    </main>
  )
}
