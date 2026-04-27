import Link from 'next/link'
import { PortableText, type PortableTextBlock } from 'next-sanity'

import { dataAttr } from '@/sanity/lib/utils'

type LinkItem = {
  _key: string
  label: string
  href: string
  description: string | null
}

type Group = {
  _key: string
  title: string
  links: LinkItem[] | null
}

export type ElsewhereContent = {
  title: string | null
  eyebrow: string | null
  intro: PortableTextBlock[] | null
  groups: Group[] | null
}

const ID = 'siteElsewhere'
const elsewhereAttr = (path: string) =>
  dataAttr({ id: ID, type: 'elsewhere', path }).toString()

const introComponents = {
  block: {
    normal: ({ children }: { children?: React.ReactNode }) => (
      <p className="font-serif italic text-[19px] leading-[1.5] text-ink-soft m-0 mb-6 max-w-[60ch] text-pretty">
        {children}
      </p>
    ),
  },
  marks: {
    em: ({ children }: { children?: React.ReactNode }) => (
      <em className="italic">{children}</em>
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
      <span className="text-ink">Elsewhere</span>
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
        Elsewhere
      </h1>
      <p className="font-serif italic text-2xl text-ink-soft m-0 mb-4 max-w-[40ch] mx-auto">
        Deze pagina is nog niet ingericht in de Studio.
      </p>
      <p className="font-serif italic text-lg text-ink-faint m-0 max-w-[50ch] mx-auto">
        Open <span className="not-italic font-mono text-sm text-ink">/admin → Elsewhere page</span>{' '}
        om links toe te voegen.
      </p>
    </section>
  )
}

export function Elsewhere({ data }: { data: ElsewhereContent | null }) {
  if (!data) return <EmptyState />

  return (
    <main className="max-w-[1240px] mx-auto px-6 md:px-12 pt-8 pb-32" data-screen-label="elsewhere">
      <Crumbs />

      {data.eyebrow && (
        <div className="flex items-center gap-3.5 font-mono text-[10.5px] tracking-[0.32em] uppercase text-ink-faint mb-[22px]">
          <span className="w-7 h-px bg-current opacity-50" />
          <span className="text-accent">✦</span>
          <span data-sanity={elsewhereAttr('eyebrow')}>{data.eyebrow}</span>
        </div>
      )}

      <h1
        data-sanity={elsewhereAttr('title')}
        className="font-serif font-light leading-none m-0 mb-8 max-w-[16ch] text-balance"
        style={{
          fontSize: 'clamp(48px, 6vw, 84px)',
          letterSpacing: '-0.012em',
        }}
      >
        {data.title || 'Elsewhere'}
      </h1>

      {data.intro && data.intro.length > 0 && (
        <div data-sanity={elsewhereAttr('intro')} className="mb-14">
          <PortableText value={data.intro} components={introComponents} />
        </div>
      )}

      {data.groups && data.groups.length > 0 && (
        <div data-sanity={elsewhereAttr('groups')} className="grid gap-16">
          {data.groups.map((group) => (
            <section
              key={group._key}
              data-sanity={elsewhereAttr(`groups[_key=="${group._key}"]`)}
              className="grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)] gap-8 lg:gap-16 items-baseline pb-10 border-b border-rule-soft"
            >
              <h2
                data-sanity={elsewhereAttr(`groups[_key=="${group._key}"].title`)}
                className="font-mono font-bold text-[10.5px] tracking-[0.32em] uppercase text-ink-faint m-0"
              >
                {group.title}
              </h2>
              {group.links && group.links.length > 0 && (
                <ul
                  data-sanity={elsewhereAttr(`groups[_key=="${group._key}"].links`)}
                  className="list-none m-0 p-0 flex flex-col"
                >
                  {group.links.map((item, i) => {
                    const linkPath = `groups[_key=="${group._key}"].links[_key=="${item._key}"]`
                    return (
                      <li
                        key={item._key}
                        data-sanity={elsewhereAttr(linkPath)}
                        className={`grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] gap-2 sm:gap-8 items-baseline py-[18px] ${
                          group.links && i < group.links.length - 1
                            ? 'border-b border-rule-soft'
                            : ''
                        }`}
                      >
                        <div className="min-w-0">
                          <a
                            href={item.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            data-sanity={elsewhereAttr(`${linkPath}.label`)}
                            className="font-serif font-normal text-[22px] leading-[1.3] text-ink transition-colors hover:text-accent"
                          >
                            {item.label}
                          </a>
                          {item.description && (
                            <p
                              data-sanity={elsewhereAttr(`${linkPath}.description`)}
                              className="font-serif italic text-[15.5px] leading-[1.4] text-ink-soft m-0 mt-1"
                            >
                              {item.description}
                            </p>
                          )}
                        </div>
                        <a
                          href={item.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          data-sanity={elsewhereAttr(`${linkPath}.href`)}
                          className="font-mono text-[10.5px] tracking-[0.16em] text-ink-faint sm:text-right truncate transition-colors hover:text-accent"
                          aria-label={`${item.label} (opens in new tab)`}
                        >
                          {item.href.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                        </a>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}

      {(!data.groups || data.groups.length === 0) && (
        <p className="font-serif italic text-ink-faint text-lg">Nog geen links toegevoegd.</p>
      )}
    </main>
  )
}
