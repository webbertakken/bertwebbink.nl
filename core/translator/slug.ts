import type { TranslationUnit } from './types'

type AnyDoc = Record<string, unknown>

const SLUG_PATHS = ['slug.current'] as const

/**
 * URL-safe transliteration of a translated title. Lowercase ASCII,
 * dashes between words, no leading/trailing dashes. Mirrors Sanity's
 * default slugifier closely enough for our purposes.
 */
export function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      // Decompose so we can strip combining diacritics from Latin scripts.
      .normalize('NFKD')
      // Strip combining marks in the Latin diacritic range only. Marks
      // outside this range are part of the script (Devanagari
      // anusvara, Arabic harakat, etc.) and must stay so the slug
      // remains the actual word.
      .replace(/[\u0300-\u036f]/g, '')
      // Replace non-letter / non-digit / non-mark runs with a single
      // dash. Including \p{M} preserves combining marks used by
      // Devanagari, Hebrew, Arabic, Thai, etc.
      .replace(/[^\p{L}\p{N}\p{M}]+/gu, '-')
      .replace(/^-+|-+$/g, '')
      // Re-compose to NFC so non-Latin scripts (Hangul, etc.) end up in
      // the canonical web form. Browsers and search engines compare
      // URL paths byte-strictly, and NFC is what they emit; storing NFD
      // would 404 every visit because the stored slug differs from the
      // browser's normalized URL.
      .normalize('NFC')
      .slice(0, 96)
  )
}

/**
 * Decide what slug a translated sibling should carry.
 *
 * Rules:
 * 1. If the sibling has no slug yet, derive from the translated title.
 * 2. If the sibling already has a slug AND it matches `slugify(previousTranslatedTitle)`,
 *    treat it as machine-generated and refresh from the new title.
 * 3. Otherwise treat it as a manual override and keep it untouched.
 *
 * If `siblingSlugs` is provided, the candidate slug is suffixed with
 * `-2`, `-3`, ... as needed to avoid colliding with another sibling
 * in the same (type, locale) bucket. The caller is expected to pass
 * a set that EXCLUDES this doc's own previous slug.
 *
 * Returns the new slug to write, or `null` to leave the existing slug alone.
 */
export function nextSlugForTranslation(args: {
  newTranslatedTitle: string
  previousTranslatedTitle?: string | null
  existingSlug?: string | null
  /** Slugs already used by *other* siblings in the same (type, locale). */
  siblingSlugs?: ReadonlySet<string>
}): string | null {
  const { newTranslatedTitle, previousTranslatedTitle, existingSlug, siblingSlugs } = args
  const generated = slugify(newTranslatedTitle)
  let candidate: string | null = null
  if (!existingSlug) {
    candidate = generated || null
  } else if (!previousTranslatedTitle) {
    return null // can't tell if manual; keep
  } else {
    const previouslyGenerated = slugify(previousTranslatedTitle)
    if (existingSlug === previouslyGenerated) {
      candidate = generated || null
    } else {
      return null
    }
  }
  if (candidate == null) return null
  if (!siblingSlugs || siblingSlugs.size === 0) return candidate
  return makeUniqueSlug(candidate, siblingSlugs)
}

/**
 * Suffix a slug with `-2`, `-3`, ... so it doesn't collide with any
 * entry in `taken`. The 999 cap is purely a paranoia rail; if it
 * ever fires (would need almost a thousand colliding slugs in one
 * (type, locale) bucket) the caller surfaces a duplicate, which is
 * better than silently erasing data.
 */
export function makeUniqueSlug(base: string, taken: ReadonlySet<string>): string {
  if (!taken.has(base)) return base
  for (let n = 2; n < 1000; n++) {
    const suffixed = `${base}-${n}`
    if (!taken.has(suffixed)) return suffixed
  }
  return base
}

/**
 * Apply slug logic in place. Mutates a deep clone of the doc.
 * `units` carries the translated `title` if it was in the LLM output;
 * if no title was translated this call is a no-op.
 */
export function applyTranslatedSlug(
  doc: AnyDoc,
  previousSibling: AnyDoc | undefined,
  units: TranslationUnit[],
  siblingSlugs?: ReadonlySet<string>,
): AnyDoc {
  const titleUnit = units.find((u) => u.id === 'title')
  if (!titleUnit) return doc
  const previousTitle =
    previousSibling && typeof previousSibling.title === 'string'
      ? (previousSibling.title as string)
      : null
  const previousSlug =
    previousSibling && (previousSibling.slug as { current?: string } | undefined)?.current
  const next = nextSlugForTranslation({
    newTranslatedTitle: titleUnit.sourceText,
    previousTranslatedTitle: previousTitle,
    existingSlug: previousSlug ?? null,
    siblingSlugs,
  })
  if (!next) return doc
  return {
    ...doc,
    slug: { _type: 'slug', current: next },
  }
}

export const SLUG_FIELDS = SLUG_PATHS
