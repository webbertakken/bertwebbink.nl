import type { Locale } from './locales'

/**
 * Document types that participate in document-per-locale and have
 * their own per-locale slugs. Keep in sync with the dynamic routes
 * declared in `i18n/routing.ts` (`/journal/[slug]`, `/organs/[slug]`).
 */
export const SLUGGED_LOCALISED_TYPES = ['journal', 'organ'] as const
export type SluggedLocalisedType = (typeof SLUGGED_LOCALISED_TYPES)[number]

export function isSluggedLocalisedType(value: unknown): value is SluggedLocalisedType {
  return typeof value === 'string' && (SLUGGED_LOCALISED_TYPES as readonly string[]).includes(value)
}

export type SiblingSlugClient = {
  fetch<T>(query: string, params: Record<string, unknown>): Promise<T>
}

export type FindSiblingSlugInput = {
  type: SluggedLocalisedType
  sourceLocale: Locale
  sourceSlug: string
  targetLocale: Locale
}

/**
 * Resolve the slug of the `targetLocale` sibling of a document-per-locale
 * doc identified by `(type, sourceLocale, sourceSlug)`.
 *
 * Returns `null` when no sibling exists for the target locale (e.g. the
 * source hasn't been translated yet, or the target sibling has no slug).
 *
 * Trivial short-circuit: if `targetLocale === sourceLocale`, the sibling
 * is the source itself, so we return `sourceSlug` without querying.
 */
export async function findSiblingSlug(
  client: SiblingSlugClient,
  { type, sourceLocale, sourceSlug, targetLocale }: FindSiblingSlugInput,
): Promise<string | null> {
  if (targetLocale === sourceLocale) return sourceSlug

  const query = /* groq */ `
    *[_type == "translation.metadata" && count(
      translations[
        language == $sourceLocale &&
        value._ref in *[_type == $type && language == $sourceLocale && slug.current == $sourceSlug]._id
      ]
    ) > 0][0]
      .translations[language == $targetLocale][0].value->slug.current
  `
  const slug = await client.fetch<string | null>(query, {
    type,
    sourceLocale,
    sourceSlug,
    targetLocale,
  })
  return typeof slug === 'string' && slug.length > 0 ? slug : null
}
