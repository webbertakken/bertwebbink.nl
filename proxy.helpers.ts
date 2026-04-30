import { LOCALES, type Locale } from '@/core/i18n/locales'
import { SINGLE_LOCALE_FALLBACK } from '@/core/i18n/featureFlag'

/**
 * Pure helpers for the proxy middleware. Lives in its own file so the
 * unit tests can import them without pulling in `next-intl/middleware`,
 * which depends on the Next.js runtime that vitest doesn't provide.
 */

export const ALWAYS_ALLOW = [
  '/admin',
  '/api',
  '/_next',
  '/favicon',
  '/sitemap.xml',
  '/robots.txt',
] as const

export function isAlwaysAllowed(pathname: string): boolean {
  if (ALWAYS_ALLOW.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return true
  // /llms.txt and /llms.{locale}.txt are always public.
  if (/^\/llms(\.[a-z]{2})?\.txt$/.test(pathname)) return true
  return false
}

/**
 * Decide whether a single-locale lock applies and what target path to
 * redirect to. Returns `null` when no redirect is needed.
 *
 * Used by the proxy middleware. Pure function; no side effects.
 */
export function singleLocaleLockTarget(
  pathname: string,
  i18nEnabled: boolean,
  fallback: Locale = SINGLE_LOCALE_FALLBACK,
): string | null {
  if (i18nEnabled) return null
  const segments = pathname.split('/')
  const localePrefix = segments[1]
  if (!LOCALES.includes(localePrefix as Locale)) return null
  if (localePrefix === fallback) return null
  segments[1] = fallback
  return segments.join('/')
}
