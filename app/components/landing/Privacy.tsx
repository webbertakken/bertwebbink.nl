import { Link } from '@/i18n/navigation'

import { stegaAttrFor } from '@/sanity/lib/stegaFactory'
import type { Locale } from '@/core/i18n/locales'

type Section = {
  _key: string
  heading: string
  body: string
}

export type PrivacyContent = {
  _id?: string
  eyebrow: string | null
  title: string
  intro: string | null
  lastUpdated: string | null
  sections: Section[] | null
  contactLine: string | null
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

function Crumbs() {
  return (
    <div className="font-mono text-[10.5px] tracking-[0.22em] uppercase text-ink-faint flex items-center gap-3 mb-14">
      <Link href="/" className="transition-colors hover:text-accent">
        Home
      </Link>
      <span className="opacity-40">/</span>
      <span className="text-ink">Privacy</span>
    </div>
  )
}

function EmptyState() {
  return (
    <section className="max-w-[840px] mx-auto px-6 md:px-12 py-32 text-center">
      <Crumbs />
      <h1
        className="font-serif font-light leading-none m-0 mb-8 text-balance"
        style={{ fontSize: 'clamp(40px, 5vw, 64px)', letterSpacing: '-0.012em' }}
      >
        Privacy
      </h1>
      <p className="font-serif italic text-2xl text-ink-soft m-0 mb-4 max-w-[40ch] mx-auto">
        Deze pagina is nog niet ingericht in de Studio.
      </p>
      <p className="font-serif italic text-lg text-ink-faint m-0 max-w-[50ch] mx-auto">
        Open <span className="not-italic font-mono text-sm text-ink">/admin → Privacy page</span>{' '}
        om de inhoud toe te voegen.
      </p>
    </section>
  )
}

export function Privacy({
  locale,
  data,
}: {
  locale: Locale
  data: PrivacyContent | null
}) {
  if (!data) return <EmptyState />
  const privacyId = data._id ?? `privacy-${locale}`
  const privacyAttr = stegaAttrFor(privacyId, 'privacy')

  return (
    <main
      className="max-w-[840px] mx-auto px-6 md:px-12 pt-8 pb-32"
      data-screen-label="privacy"
    >
      <Crumbs />

      {data.eyebrow && (
        <div className="flex items-center gap-3.5 font-mono text-[10.5px] tracking-[0.32em] uppercase text-ink-faint mb-[22px]">
          <span className="w-7 h-px bg-current opacity-50" />
          <span className="text-accent">✦</span>
          <span data-sanity={privacyAttr('eyebrow')}>{data.eyebrow}</span>
        </div>
      )}

      <h1
        data-sanity={privacyAttr('title')}
        className="font-serif font-light leading-none m-0 mb-7 max-w-[16ch] text-balance"
        style={{
          fontSize: 'clamp(48px, 6vw, 84px)',
          letterSpacing: '-0.012em',
        }}
      >
        {data.title}
      </h1>

      {data.lastUpdated && (
        <p
          data-sanity={privacyAttr('lastUpdated')}
          className="font-mono text-[10.5px] tracking-[0.22em] uppercase text-ink-faint m-0 mb-10"
        >
          Last updated {fmtDate(data.lastUpdated)}
        </p>
      )}

      {data.intro && (
        <p
          data-sanity={privacyAttr('intro')}
          className="font-serif italic text-[21px] leading-[1.5] text-ink-soft m-0 mb-14 max-w-[60ch] text-pretty"
        >
          {data.intro}
        </p>
      )}

      {data.sections && data.sections.length > 0 && (
        <ul
          data-sanity={privacyAttr('sections')}
          className="list-none m-0 p-0 border-t border-rule-soft"
        >
          {data.sections.map((s) => (
            <li
              key={s._key}
              data-sanity={privacyAttr(`sections[_key=="${s._key}"]`)}
              className="grid grid-cols-1 md:grid-cols-[220px_minmax(0,1fr)] gap-3 md:gap-12 items-baseline py-7 border-b border-rule-soft"
            >
              <h2 className="font-mono font-bold text-[10.5px] tracking-[0.32em] uppercase text-ink-faint m-0">
                {s.heading}
              </h2>
              <p className="font-serif text-[17px] leading-[1.6] text-ink m-0 max-w-[60ch] text-pretty">
                {s.body}
              </p>
            </li>
          ))}
        </ul>
      )}

      {data.contactLine && (
        <p
          data-sanity={privacyAttr('contactLine')}
          className="mt-14 font-serif italic text-[19px] leading-[1.55] text-ink-soft m-0 max-w-[55ch] text-pretty"
        >
          {data.contactLine}
        </p>
      )}
    </main>
  )
}
