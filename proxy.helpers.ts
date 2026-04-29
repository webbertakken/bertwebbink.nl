import { LAUNCH_AT_MS } from '@/core/launch'

/**
 * Pure helpers for the proxy middleware. Lives in its own file so the
 * unit tests can import them without pulling in `next-intl/middleware`,
 * which depends on the Next.js runtime that vitest doesn't provide.
 */

export const ALWAYS_ALLOW = [
  '/under-construction',
  '/admin',
  '/api',
  '/_next',
  '/favicon',
  '/sitemap.xml',
  '/robots.txt',
] as const

export function isAlwaysAllowed(pathname: string): boolean {
  if (ALWAYS_ALLOW.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return true
  // /llms.txt and /llms.{locale}.txt should bypass the gate too.
  if (/^\/llms(\.[a-z]{2})?\.txt$/.test(pathname)) return true
  return false
}

export function gateIsActive(
  now: number = Date.now(),
  env: { UNDER_CONSTRUCTION?: string } = process.env as { UNDER_CONSTRUCTION?: string },
): boolean {
  if (env.UNDER_CONSTRUCTION === 'true') return true
  if (Number.isFinite(LAUNCH_AT_MS) && now < LAUNCH_AT_MS) return true
  return false
}
