import { isTranslatableType } from '@/core/translator/orchestrator'
import { DEFAULT_LOCALE } from '@/core/i18n/locales'

/**
 * Decide whether the "Translate to all locales" / "Publish to all locales"
 * Studio actions should appear for the current document.
 *
 * Both actions follow the same rule:
 *   - never on non-translatable types (assets, system docs, etc.)
 *   - score: always visible (single doc)
 *   - any other doc-per-locale type: only on the source-language doc
 *     (so editors don't end up triggering re-translations from a
 *     locale that's downstream of the source).
 */
export function shouldShowTranslateAction(args: {
  type: string
  language?: string | null
}): boolean {
  if (!isTranslatableType(args.type)) return false
  if (args.type === 'score') return true
  const docLang = args.language ?? DEFAULT_LOCALE
  return docLang === DEFAULT_LOCALE
}
