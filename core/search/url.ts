/**
 * Build a next-intl-compatible `Href` for a search hit.
 *
 * Returns the typed object that `<Link>` from `@/i18n/navigation` and
 * `getPathname({ locale, href })` accept. next-intl substitutes the
 * `params` and rewrites the first segment to the locale-translated form
 * (e.g. `/de/orgeln/foo` instead of `/de/organs/foo`).
 *
 * Returns `null` when the hit can't produce a valid URL (e.g. a journal
 * document without a slug, or an unrecognised `_type`). Callers should
 * filter those out before rendering.
 */

export type SearchHitInput = {
  _type: 'journal' | 'organ' | 'score' | 'about' | 'elsewhere' | 'privacy'
  slug?: string | null
  editionNumber?: number | null
}

export type SearchResultHref =
  | { pathname: '/journal/[slug]'; params: { slug: string } }
  | { pathname: '/organs/[slug]'; params: { slug: string } }
  | { pathname: '/scores'; hash?: string }
  | { pathname: '/about' }
  | { pathname: '/elsewhere' }
  | { pathname: '/privacy' }

export function searchResultHref(hit: SearchHitInput): SearchResultHref | null {
  switch (hit._type) {
    case 'journal':
      return hit.slug ? { pathname: '/journal/[slug]', params: { slug: hit.slug } } : null
    case 'organ':
      return hit.slug ? { pathname: '/organs/[slug]', params: { slug: hit.slug } } : null
    case 'score':
      if (hit.editionNumber == null) return { pathname: '/scores' }
      return { pathname: '/scores', hash: `ed-${String(hit.editionNumber).padStart(2, '0')}` }
    case 'about':
      return { pathname: '/about' }
    case 'elsewhere':
      return { pathname: '/elsewhere' }
    case 'privacy':
      return { pathname: '/privacy' }
    default:
      return null
  }
}
