import type { DocumentBadgeComponent, DocumentBadgeProps } from 'sanity'

import { isTranslatableType } from '@/core/translator/orchestrator'
import { DEFAULT_LOCALE } from '@/core/i18n/locales'

/**
 * Document badge that flags a translation as stale when the source has
 * been edited since the last `Translate to all locales` run.
 *
 * - On the source-language doc (Dutch by default), never stale.
 * - On a sibling, compares the sibling's stored `_translationSourceRev`
 *   against the source doc's current `_rev`. If they differ, badge.
 * - For `score`, `_translationProvenance[locale].sourceRev` is the per-
 *   locale stamp; same idea.
 *
 * The badge is purely informational; it does NOT block publishing.
 */
export const staleTranslationBadge: DocumentBadgeComponent = (
  props: DocumentBadgeProps,
) => {
  const { type, draft, published } = props
  if (!isTranslatableType(type)) return null

  const doc = (draft ?? published) as Record<string, unknown> | null
  if (!doc) return null

  const language = doc.language as string | undefined

  if (type === 'score') {
    const provenance =
      (doc._translationProvenance as Record<string, { sourceRev?: string }> | undefined) ?? {}
    const sourceRev = doc._rev as string | undefined
    const stale = Object.entries(provenance).some(
      ([loc, p]) => loc !== DEFAULT_LOCALE && p.sourceRev && p.sourceRev !== sourceRev,
    )
    if (!stale) return null
    return {
      label: 'Stale translations',
      title:
        'One or more locale translations were made before the most recent edit to this score. Run "Translate to all locales" to refresh.',
      color: 'warning',
    }
  }

  // Document-per-locale: only flag siblings, not the source.
  if (!language || language === DEFAULT_LOCALE) return null
  const storedSourceRev = doc._translationSourceRev as string | undefined
  if (!storedSourceRev) {
    return {
      label: 'Never translated',
      title:
        'This locale has never been translated by the action. Run "Translate to all locales" on the source document.',
      color: 'warning',
    }
  }
  return null
}
