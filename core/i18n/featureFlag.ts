import { UI_DEFAULT_LOCALE, type Locale } from './locales'

/**
 * Phase-1 rollout flag.
 *
 * When `NEXT_PUBLIC_I18N_ENABLED` is set to the string `"false"`, the
 * public site is locked to a single locale (`UI_DEFAULT_LOCALE`):
 *   - Middleware redirects every other locale prefix to `/en/...`.
 *   - Language picker is hidden.
 *   - Accept-Language detection still happens for the very first hit
 *     (next-intl), but the redirect immediately collapses it.
 *
 * Defaults to enabled. Editors can toggle the flag via the Vercel env
 * without code changes.
 */
export function isI18nEnabled(): boolean {
  return process.env.NEXT_PUBLIC_I18N_ENABLED !== 'false'
}

/** When the flag is off, every public route uses this locale. */
export const SINGLE_LOCALE_FALLBACK: Locale = UI_DEFAULT_LOCALE
