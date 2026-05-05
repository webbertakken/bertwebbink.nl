import createMiddleware from 'next-intl/middleware'
import { NextResponse, type NextRequest } from 'next/server'
import { isI18nEnabled } from '@/core/i18n/featureFlag'
import { routing } from '@/i18n/routing'
import { isAlwaysAllowed, singleLocaleLockTarget } from './proxy.helpers'

/**
 * Composed middleware:
 *
 * 1. Phase-1 single-locale lock (when `NEXT_PUBLIC_I18N_ENABLED=false`)
 *    — redirects every locale prefix other than the UI default to
 *    `/{UI_DEFAULT_LOCALE}/...`. Keeps the public site visibly single-
 *    locale until translations are seeded.
 *
 * 2. Otherwise, hand off to `next-intl`'s middleware which:
 *    - Auto-detects locale from `Accept-Language` on first visit
 *    - Redirects unprefixed URLs to `/{detected}/...`
 *    - Persists picker choices in the `NEXT_LOCALE` cookie
 *
 * Always-allowed paths skip the locale lock: `/admin`, `/api`, `/_next`,
 * `/favicon`, `/sitemap.xml`, `/robots.txt`, `/llms.txt`,
 * `/llms.{locale}.txt`.
 */

const intlMiddleware = createMiddleware(routing)

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. Always-allowed paths short-circuit the entire pipeline.
  if (isAlwaysAllowed(pathname)) return NextResponse.next()

  // 2. Phase-1 single-locale lock.
  const lockTarget = singleLocaleLockTarget(pathname, isI18nEnabled())
  if (lockTarget !== null) {
    const url = request.nextUrl.clone()
    url.pathname = lockTarget
    return NextResponse.redirect(url)
  }

  // 3. Locale resolution.
  return intlMiddleware(request)
}

export const config = {
  matcher: '/((?!_next/static|_next/image|favicon.ico).*)',
}
