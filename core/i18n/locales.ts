/**
 * Single source of truth for the site's supported locales.
 *
 * Both Sanity i18n plugins (`@sanity/document-internationalization` and
 * `sanity-plugin-internationalized-array`) and `next-intl` derive their
 * configuration from these constants. Adding or removing a locale is a
 * one-line change here plus a translation pass.
 */

export const LOCALES = ['nl', 'en', 'de', 'fr', 'es', 'it', 'pt', 'hi', 'ja', 'zh', 'ko'] as const

export type Locale = (typeof LOCALES)[number]

/** Source language for Sanity content. The Dutch doc is authored; others are translated from it. */
export const DEFAULT_LOCALE: Locale = 'nl'

/** Source language for code, UI strings, schema labels, design copy. */
export const UI_DEFAULT_LOCALE: Locale = 'en'

/** Endonym (the locale's name in the locale itself) for the language picker. No flags. */
export const LOCALE_ENDONYMS: Record<Locale, string> = {
  nl: 'Nederlands',
  en: 'English',
  de: 'Deutsch',
  fr: 'Français',
  es: 'Español',
  it: 'Italiano',
  pt: 'Português',
  hi: 'हिन्दी',
  ja: '日本語',
  zh: '中文',
  ko: '한국어',
}

/** English display label, used for studio UI and admin tooling. */
export const LOCALE_LABELS_EN: Record<Locale, string> = {
  nl: 'Dutch',
  en: 'English',
  de: 'German',
  fr: 'French',
  es: 'Spanish',
  it: 'Italian',
  pt: 'Portuguese',
  hi: 'Hindi',
  ja: 'Japanese',
  zh: 'Chinese',
  ko: 'Korean',
}

/** Locale list shaped for `@sanity/document-internationalization`'s `supportedLanguages`. */
export const SUPPORTED_LANGUAGES = LOCALES.map((id) => ({
  id,
  title: LOCALE_LABELS_EN[id],
}))

/** Locale list shaped for `sanity-plugin-internationalized-array`'s `languages`. */
export const I18N_ARRAY_LANGUAGES = SUPPORTED_LANGUAGES

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value)
}

/**
 * Negotiate a supported locale from a raw `Accept-Language`-like list of preferences.
 * Returns the first match, or `fallback`.
 */
export function negotiateLocale(
  preferences: readonly string[],
  fallback: Locale = UI_DEFAULT_LOCALE,
): Locale {
  for (const raw of preferences) {
    const code = raw.toLowerCase().split('-')[0]?.trim()
    if (code && isLocale(code)) return code
  }
  return fallback
}
