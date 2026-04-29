import type { Locale } from '@/core/i18n/locales'

/**
 * One translatable unit. Walkers produce these from a Sanity value;
 * the translator returns the translated equivalents (same `id`, new
 * `sourceText`); walkers re-apply them back into the original shape.
 */
export type TranslationUnit = {
  /**
   * Stable, walker-scoped path. Examples:
   *   - PT walker:  `block[2].child[0]`
   *   - field walker: `coverImage.alt`
   *   - i18n-array walker: `blurb`
   */
  id: string
  sourceText: string
  /** Optional sibling context for the LLM (e.g. surrounding paragraph). */
  context?: string
}

export type DocumentShape = 'portable-text' | 'field-level' | 'mixed'

export type TranslateRequest = {
  sourceLocale: Locale
  targetLocale: Locale
  units: TranslationUnit[]
  /** Previous source units, by id, to enable diff-aware updates. */
  previousUnits?: TranslationUnit[]
  /** Previous target translations, by id, used as context for re-translation. */
  previousTranslation?: TranslationUnit[]
  /** Glossary: key = source term, value = either preferred translation or the literal "DO_NOT_TRANSLATE". */
  glossary?: Record<string, string>
  documentContext?: {
    type: string
    title?: string
    shape: DocumentShape
  }
}

export type TranslateUsage = {
  inputTokens?: number
  outputTokens?: number
  totalTokens?: number
  durationMs?: number
}

export type TranslateResult = {
  units: TranslationUnit[]
  usage?: TranslateUsage
}

export interface Translator {
  /** Human-readable name (used in logs, e.g. `gemini`). */
  readonly name: string
  /** Provider model identifier, e.g. `gemini-2.5-pro`. */
  readonly model: string
  translate(req: TranslateRequest): Promise<TranslateResult>
}

/** Sentinel: a glossary entry whose target says "do not translate". */
export const DO_NOT_TRANSLATE = 'DO_NOT_TRANSLATE'
