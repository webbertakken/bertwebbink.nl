import type { TranslationUnit } from './types'

type AnyDoc = Record<string, unknown>

const SLUG_PATHS = ['slug.current'] as const

/**
 * URL-safe transliteration of a translated title. Lowercase ASCII,
 * dashes between words, no leading/trailing dashes. Mirrors Sanity's
 * default slugifier closely enough for our purposes.
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    // Strip combining diacritics (CJK left intact; transliteration is best-effort).
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96)
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
 * Returns the new slug to write, or `null` to leave the existing slug alone.
 */
export function nextSlugForTranslation(args: {
  newTranslatedTitle: string
  previousTranslatedTitle?: string | null
  existingSlug?: string | null
}): string | null {
  const { newTranslatedTitle, previousTranslatedTitle, existingSlug } = args
  const generated = slugify(newTranslatedTitle)
  if (!existingSlug) return generated || null
  if (!previousTranslatedTitle) return null // can't tell if manual; keep
  const previouslyGenerated = slugify(previousTranslatedTitle)
  if (existingSlug === previouslyGenerated) {
    return generated || null
  }
  return null
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
  })
  if (!next) return doc
  return {
    ...doc,
    slug: { _type: 'slug', current: next },
  }
}

export const SLUG_FIELDS = SLUG_PATHS
