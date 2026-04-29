/**
 * Build a next-intl-compatible `Href` for a search hit.
 *
 * Returns the typed object shape `<Link href={...}>` from `@/i18n/navigation`
 * accepts. next-intl resolves it to the active locale's pathname at render
 * time, so this builder doesn't need a `locale` argument.
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
