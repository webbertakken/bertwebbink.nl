import Link from 'next/link'
import { Image } from 'next-sanity/image'
import { PortableText, type PortableTextBlock } from 'next-sanity'
import { getImageDimensions } from '@sanity/asset-utils'
import { stegaClean } from '@sanity/client/stega'

import { dataAttr, urlForImage } from '@/sanity/lib/utils'

type Fact = { _key: string; label: string; value: string }
type TimelineEntry = { _key: string; year: string | null; what: string; where: string | null }
type RepertoireCard = {
  _key: string
  era: string
  title: string
  pieces: string[] | null
}
type ContactRow = {
  _key: string
  label: string
  value: string
  italic: boolean | null
  href: string | null
}

type SanityImage = {
  asset?: { _ref: string; _type: 'reference' }
  alt?: string
} | null

export type AboutContent = {
  eyebrow: string | null
  title: string
  letter: PortableTextBlock[] | null
  signoffName: string | null
  signoffLocation: string | null
  portraitImage: SanityImage
  portraitCaption: string | null
  portraitPlate: string | null
  secondaryImage: SanityImage
  secondaryCaption: string | null
  secondaryPlate: string | null
  quickFacts: Fact[] | null
  timelineSummary: string | null
  timeline: TimelineEntry[] | null
  repertoireIntro: string | null
  repertoire: RepertoireCard[] | null
  contactTitle: string | null
  contactLede: string | null
  contactRows: ContactRow[] | null
}

const ABOUT_ID = 'siteAbout'

/** Replace `{{...}}` segments with <em>...</em>. Keeps surrounding text plain. */
function renderEmphasised(text: string | null | undefined) {
  if (!text) return null
  const parts = text.split(/(\{\{[^}]+\}\})/g)
  return parts.map((part, i) => {
    if (part.startsWith('{{') && part.endsWith('}}')) {
      return (
        <em key={i} className="italic font-normal">
          {part.slice(2, -2)}
        </em>
      )
    }
    return <span key={i}>{part}</span>
  })
}

const letterComponents = {
  block: {
    lede: ({ children }: { children?: React.ReactNode }) => (
      <p className="font-serif italic font-normal text-[26px] leading-[1.45] text-ink m-0 mb-7 text-pretty">
        {children}
      </p>
    ),
    normal: ({ children }: { children?: React.ReactNode }) => (
      <p className="text-[17px] leading-[1.72] text-ink m-0 mb-[22px] text-pretty max-w-[60ch]">
        {children}
      </p>
    ),
  },
  marks: {
    em: ({ children }: { children?: React.ReactNode }) => (
      <em className="italic">{children}</em>
    ),
    strong: ({ children }: { children?: React.ReactNode }) => (
      <strong className="font-semibold">{children}</strong>
    ),
  },
}

function Crumbs() {
  return (
    <div className="font-mono text-[10.5px] tracking-[0.22em] uppercase text-ink-faint flex items-center gap-3 mb-14">
      <Link href="/" className="transition-colors hover:text-accent">
        Home
      </Link>
      <span className="opacity-40">/</span>
      <span className="text-ink">About me</span>
    </div>
  )
}

function Header({ eyebrow, title }: { eyebrow: string | null; title: string }) {
  const titleAttr = dataAttr({ id: ABOUT_ID, type: 'about', path: 'title' }).toString()
  return (
    <>
      <Crumbs />
      <div className="flex items-center gap-3.5 font-mono text-[10.5px] tracking-[0.32em] uppercase text-ink-faint mb-[22px]">
        <span className="w-7 h-px bg-current opacity-50" />
        <span className="text-accent">✦</span>
        {eyebrow ?? 'A few words about me'}
      </div>
      <h1
        data-sanity={titleAttr}
        className="font-serif font-light leading-none m-0 mb-8 max-w-[16ch] text-balance"
        style={{
          fontSize: 'clamp(48px, 6vw, 84px)',
          letterSpacing: '-0.012em',
        }}
      >
        {renderEmphasised(title)}
      </h1>
    </>
  )
}

function Letter({
  letter,
  signoffName,
  signoffLocation,
}: {
  letter: PortableTextBlock[] | null
  signoffName: string | null
  signoffLocation: string | null
}) {
  const letterAttr = dataAttr({ id: ABOUT_ID, type: 'about', path: 'letter' }).toString()
  return (
    <div data-sanity={letterAttr} className="text-ink">
      {letter && letter.length > 0 && (
        <PortableText value={letter} components={letterComponents} />
      )}
      {(signoffName || signoffLocation) && (
        <div className="mt-9 flex flex-col gap-1">
          {signoffName && (
            <div className="font-serif italic font-normal text-[32px] leading-none text-ink -rotate-3 origin-left mb-2">
              {signoffName}
            </div>
          )}
          {signoffLocation && (
            <div className="font-mono text-[10.5px] tracking-[0.22em] uppercase text-ink-faint">
              {signoffLocation}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function PhotoCard({
  image,
  caption,
  plate,
  fieldName,
  fallbackLabel,
}: {
  image: SanityImage
  caption: string | null
  plate: string | null
  fieldName: string
  fallbackLabel: string
}) {
  const fieldAttr = dataAttr({ id: ABOUT_ID, type: 'about', path: fieldName }).toString()

  let media: React.ReactNode
  if (image?.asset?._ref) {
    const src = image as { asset: { _ref: string; _type: 'reference' }; alt?: string }
    const dim = getImageDimensions(src)
    const url = urlForImage(src)?.width(1200).fit('clip').url() as string
    media = (
      <Image
        className="w-full h-full object-cover"
        src={url}
        alt={stegaClean(image.alt) || 'Bert Webbink'}
        width={dim.width}
        height={dim.height}
      />
    )
  } else {
    media = (
      <div
        className="w-full h-full flex items-end justify-start p-[18px]"
        style={{
          background:
            'repeating-linear-gradient(135deg, oklch(0.85 0.018 72) 0 22px, oklch(0.78 0.022 68) 22px 44px)',
        }}
      >
        <span className="font-mono text-[11px] tracking-[0.04em] text-[oklch(0.30_0.012_70)] bg-[oklch(0.99_0.004_85/0.85)] px-2.5 py-1.5 rounded-sm">
          [ {fallbackLabel} ]
        </span>
      </div>
    )
  }

  return (
    <div>
      <div
        data-sanity={fieldAttr}
        className="aspect-[4/5] bg-bg-sunk rounded overflow-hidden border border-rule-soft shadow-card relative"
      >
        {media}
      </div>
      {(caption || plate) && (
        <div className="mt-3.5 flex justify-between gap-3 font-serif italic text-ink-soft text-sm leading-[1.5]">
          {caption && <span>{caption}</span>}
          {plate && (
            <span className="font-mono not-italic text-[10.5px] tracking-[0.18em] uppercase text-ink-faint self-end">
              {plate}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

function Portrait({
  image,
  caption,
  plate,
  secondaryImage,
  secondaryCaption,
  secondaryPlate,
  facts,
}: {
  image: SanityImage
  caption: string | null
  plate: string | null
  secondaryImage: SanityImage
  secondaryCaption: string | null
  secondaryPlate: string | null
  facts: Fact[] | null
}) {
  const factsAttr = dataAttr({ id: ABOUT_ID, type: 'about', path: 'quickFacts' }).toString()
  const hasSecondary = Boolean(secondaryImage?.asset?._ref)

  return (
    <aside className="lg:sticky lg:top-8 flex flex-col gap-7">
      <PhotoCard
        image={image}
        caption={caption}
        plate={plate}
        fieldName="portraitImage"
        fallbackLabel="portret bij het orgel — Vriezenveen"
      />

      {facts && facts.length > 0 && (
        <div data-sanity={factsAttr} className="pt-[18px] border-t border-rule-soft grid gap-3">
          {facts.map((f, i) => (
            <div
              key={f._key}
              className={`grid grid-cols-[90px_1fr] gap-3.5 items-baseline pb-2.5 text-[13px] ${
                i < facts.length - 1 ? 'border-b border-rule-soft' : ''
              }`}
            >
              <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-ink-faint">
                {f.label}
              </span>
              <span className="font-serif italic text-[17px] text-ink leading-[1.3]">
                {f.value}
              </span>
            </div>
          ))}
        </div>
      )}

      {hasSecondary && (
        <PhotoCard
          image={secondaryImage}
          caption={secondaryCaption}
          plate={secondaryPlate}
          fieldName="secondaryImage"
          fallbackLabel="tweede portret"
        />
      )}
    </aside>
  )
}

function SecHead({ num, label, children }: { num: string; label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)] gap-8 lg:gap-16 items-baseline mb-11 pb-[22px] border-b border-rule-soft">
      <div className="flex items-center gap-3 font-mono text-[10.5px] tracking-[0.32em] uppercase text-ink-faint">
        <span className="text-accent text-[11px]">No. {num}</span>
        <span>·</span>
        <span>{label}</span>
      </div>
      <h2
        className="font-serif font-light leading-[1.05] m-0 text-balance"
        style={{
          fontSize: 'clamp(34px, 4vw, 52px)',
          letterSpacing: '-0.005em',
        }}
      >
        {children}
      </h2>
    </div>
  )
}

function Timeline({
  summary,
  entries,
}: {
  summary: string | null
  entries: TimelineEntry[] | null
}) {
  if (!entries || entries.length === 0) return null
  const summaryLines = (summary ?? '').split('\n').filter(Boolean)
  return (
    <section className="max-w-[1240px] mx-auto px-6 md:px-12 pt-24" data-screen-label="timeline">
      <SecHead num="01" label="Trajectory">
        Een korte <em className="italic font-normal">chronologie</em> — hoe ik hier kwam.
      </SecHead>
      <div className="grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)] gap-8 lg:gap-16 items-start">
        {summaryLines.length > 0 && (
          <div className="font-mono text-[10.5px] tracking-[0.18em] uppercase text-ink-faint leading-[1.6] lg:sticky lg:top-8">
            {summaryLines.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        )}
        <ul className="list-none m-0 p-0">
          {entries.map((entry, i) => (
            <li
              key={entry._key}
              className={`grid grid-cols-1 sm:grid-cols-[110px_minmax(0,1fr)_auto] gap-3 sm:gap-8 items-baseline py-[22px] ${
                i < entries.length - 1 ? 'border-b border-rule-soft' : ''
              }`}
            >
              <span className="font-mono text-[11px] tracking-[0.16em] text-accent pt-1">
                {entry.year || '—'}
              </span>
              <span className="font-serif font-normal text-[22px] leading-[1.3] text-ink text-balance">
                {renderEmphasised(entry.what)}
              </span>
              {entry.where && (
                <span className="font-mono text-[10.5px] tracking-[0.18em] uppercase text-ink-faint sm:text-right whitespace-nowrap pt-1.5">
                  {entry.where}
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function Repertoire({
  intro,
  cards,
}: {
  intro: string | null
  cards: RepertoireCard[] | null
}) {
  if (!cards || cards.length === 0) return null
  return (
    <section className="max-w-[1240px] mx-auto px-6 md:px-12 pt-24" data-screen-label="repertoire">
      <SecHead num="02" label="What I play">
        Repertoire waar ik naar <em className="italic font-normal">terugkeer</em>.
      </SecHead>
      <div className="grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)] gap-8 lg:gap-16">
        {intro && (
          <p className="font-serif italic text-[19px] leading-[1.5] text-ink-soft m-0 text-pretty">
            {intro}
          </p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7">
          {cards.map((c) => (
            <article
              key={c._key}
              className="bg-paper border border-rule-soft rounded p-6 flex flex-col gap-3.5 min-h-[220px] shadow-[inset_0_1px_0_oklch(1_0_0/0.6)]"
            >
              <div className="font-mono text-[10px] tracking-[0.22em] uppercase text-accent">
                {c.era}
              </div>
              <h3
                className="font-serif font-normal text-[26px] leading-[1.15] m-0 text-balance"
                style={{ letterSpacing: '-0.005em' }}
              >
                {renderEmphasised(c.title)}
              </h3>
              {c.pieces && c.pieces.length > 0 && (
                <ul className="list-none m-0 p-0 mt-auto pt-3.5 border-t border-rule-soft flex flex-col gap-1.5">
                  {c.pieces.map((p, i) => (
                    <li
                      key={i}
                      className="font-serif italic text-[15.5px] text-ink-soft leading-[1.35]"
                    >
                      {p}
                    </li>
                  ))}
                </ul>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function Contact({
  title,
  lede,
  rows,
}: {
  title: string | null
  lede: string | null
  rows: ContactRow[] | null
}) {
  if (!title && !lede && (!rows || rows.length === 0)) return null
  return (
    <section
      className="mt-30 bg-paper border-t border-b border-rule-soft py-[88px] px-6 md:px-12"
      data-screen-label="contact"
    >
      <div className="max-w-[1240px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
        <div>
          {title && (
            <h2
              className="font-serif font-light leading-[1.05] m-0 mb-[18px] text-balance"
              style={{
                fontSize: 'clamp(36px, 4.6vw, 60px)',
                letterSpacing: '-0.008em',
              }}
            >
              {renderEmphasised(title)}
            </h2>
          )}
          {lede && (
            <p className="font-serif italic text-[19px] leading-[1.55] text-ink-soft m-0 max-w-[44ch]">
              {lede}
            </p>
          )}
        </div>
        {rows && rows.length > 0 && (
          <div className="bg-bg border border-rule-soft rounded p-8 flex flex-col gap-[18px]">
            {rows.map((row, i) => {
              const last = i === rows.length - 1
              const valueClasses = `font-serif text-[19px] text-ink leading-[1.3] ${
                row.italic ? 'italic text-ink-soft text-[17px]' : ''
              }`
              const valueEl = row.href ? (
                <a className="hover:text-accent transition-colors" href={row.href}>
                  {row.value}
                </a>
              ) : (
                row.value
              )
              return (
                <div
                  key={row._key}
                  className={`grid grid-cols-[80px_minmax(0,1fr)] gap-[18px] items-baseline ${
                    last ? '' : 'pb-3.5 border-b border-rule-soft'
                  }`}
                >
                  <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-ink-faint">
                    {row.label}
                  </span>
                  <span className={valueClasses}>{valueEl}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </section>
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
        About me
      </h1>
      <p className="font-serif italic text-2xl text-ink-soft m-0 mb-4 max-w-[40ch] mx-auto">
        Deze pagina is nog niet ingericht in de Studio.
      </p>
      <p className="font-serif italic text-lg text-ink-faint m-0 max-w-[50ch] mx-auto">
        Open <span className="not-italic font-mono text-sm text-ink">/admin → About page</span>{' '}
        om de inhoud toe te voegen.
      </p>
    </section>
  )
}

export function About({ data }: { data: AboutContent | null }) {
  if (!data) return <EmptyState />
  return (
    <>
      <main className="max-w-[1240px] mx-auto px-6 md:px-12 pt-8" data-screen-label="about">
        <Header eyebrow={data.eyebrow} title={data.title} />
        <div className="mt-14 grid grid-cols-1 lg:grid-cols-[minmax(0,1.15fr)_380px] gap-10 lg:gap-20 items-start">
          <Letter
            letter={data.letter}
            signoffName={data.signoffName}
            signoffLocation={data.signoffLocation}
          />
          <Portrait
            image={data.portraitImage}
            caption={data.portraitCaption}
            plate={data.portraitPlate}
            secondaryImage={data.secondaryImage}
            secondaryCaption={data.secondaryCaption}
            secondaryPlate={data.secondaryPlate}
            facts={data.quickFacts}
          />
        </div>
      </main>
      <Timeline summary={data.timelineSummary} entries={data.timeline} />
      <Repertoire intro={data.repertoireIntro} cards={data.repertoire} />
      <Contact title={data.contactTitle} lede={data.contactLede} rows={data.contactRows} />
    </>
  )
}
