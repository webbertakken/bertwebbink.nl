/**
 * Build a locale-prefixed URL string for a search hit.
 *
 * Returns a string like `/{locale}/{path}` that the next-intl `<Link>`
 * accepts as a static href. Score has no detail page so the URL targets
 * the scores list with a `#ed-NN` hash.
 *
 * Returns `null` when the hit can't produce a valid URL (e.g. a journal
 * document without a slug, or an unrecognised `_type`). Callers should
 * filter those out before rendering.
 *
 * **Note:** when `feat/translate-disposition` lands localised pathnames,
 * paths like `/de/organs/...` will redirect to `/de/orgeln/...` via the
 * i18n middleware (one extra hop). At that point this builder can swap
 * to next-intl's typed `Href` shape with `params`, which will substitute
 * params and emit the localised segment directly.
 */

export type SearchHitInput = {
  _type: 'journal' | 'organ' | 'score' | 'about' | 'elsewhere' | 'privacy'
  slug?: string | null
  editionNumber?: number | null
}

export function searchResultHref(hit: SearchHitInput, locale: string): string | null {
  switch (hit._type) {
    case 'journal':
      return hit.slug ? `/${locale}/journal/${hit.slug}` : null
    case 'organ':
      return hit.slug ? `/${locale}/organs/${hit.slug}` : null
    case 'score':
      if (hit.editionNumber == null) return `/${locale}/scores`
      return `/${locale}/scores#ed-${String(hit.editionNumber).padStart(2, '0')}`
    case 'about':
      return `/${locale}/about`
    case 'elsewhere':
      return `/${locale}/elsewhere`
    case 'privacy':
      return `/${locale}/privacy`
    default:
      return null
  }
}
