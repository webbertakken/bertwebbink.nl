import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

import { searchResultHref, type SearchHitInput } from '@/core/search/url'
import type { Locale } from '@/core/i18n/locales'
import type { SearchQueryResult } from '@/sanity.types'

import { highlight } from './highlight'

type SearchResultsProps = {
  locale: Locale
  query: string
  tokens: readonly string[]
  results: SearchQueryResult
}

const TYPE_LABEL_KEYS = {
  journal: 'journal',
  organ: 'organ',
  score: 'score',
  about: 'about',
  elsewhere: 'elsewhere',
  privacy: 'privacy',
} as const

export async function SearchResults({ locale, query, tokens, results }: SearchResultsProps) {
  const t = await getTranslations('Search')

  if (tokens.length === 0) {
    return (
      <p className="font-serif italic text-ink-soft text-[17px] leading-[1.7] m-0 max-w-[60ch]">
        {t('empty')}
      </p>
    )
  }

  const renderable = results
    .map((hit) => {
      const url = searchResultHref(hit as SearchHitInput, locale)
      return url ? { hit, url } : null
    })
    .filter((row): row is { hit: (typeof results)[number]; url: string } => row !== null)

  if (renderable.length === 0) {
    return (
      <p className="font-serif italic text-ink-soft text-[17px] leading-[1.7] m-0 max-w-[60ch]">
        {t('noResultsFor', { query })}
      </p>
    )
  }

  return (
    <ul className="flex flex-col gap-0 m-0 p-0 list-none">
      {renderable.map(({ hit, url }) => {
        const typeLabel = t(`typeLabels.${TYPE_LABEL_KEYS[hit._type]}`)
        return (
          <li
            key={hit._id}
            className="border-t border-rule-soft py-7 first:border-t-0 first:pt-0"
          >
            <Link
              href={url}
              className="block group transition-transform duration-[300ms] ease-[cubic-bezier(0.2,0.6,0.2,1)] hover:scale-[1.005]"
            >
              <span className="block font-mono text-[10.5px] tracking-[0.22em] uppercase text-ink-faint mb-2.5">
                {typeLabel}
              </span>
              <h2
                className="font-serif font-normal text-[24px] sm:text-[clamp(24px,2.6vw,32px)] leading-[1.18] m-0 mb-2 text-ink text-balance group-hover:text-accent transition-colors"
                style={{ letterSpacing: '-0.008em' }}
              >
                {highlight(hit.title ?? '', tokens)}
              </h2>
              {hit.snippet && (
                <p className="text-[15px] leading-[1.65] text-ink-soft m-0 max-w-[68ch] text-pretty">
                  {highlight(hit.snippet, tokens)}
                </p>
              )}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
