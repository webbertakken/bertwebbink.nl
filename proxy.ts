import { NextResponse, type NextRequest } from 'next/server'
import createMiddleware from 'next-intl/middleware'

import { routing } from '@/i18n/routing'
import { isI18nEnabled } from '@/core/i18n/featureFlag'
import {
  gateIsActive,
  isAlwaysAllowed,
  singleLocaleLockTarget,
} from './proxy.helpers'

/**
 * Composed middleware:
 *
 * 1. Site-wide "under construction" gate — when active, every public
 *    route is rewritten to `/under-construction` unless bypassed.
 *    The gate page is locale-agnostic English (Q2).
 *
 * 2. Phase-1 single-locale lock (when `NEXT_PUBLIC_I18N_ENABLED=false`)
 *    — redirects every locale prefix other than the UI default to
 *    `/{UI_DEFAULT_LOCALE}/...`. Keeps the public site visibly single-
 *    locale until translations are seeded.
 *
 * 3. Otherwise, hand off to `next-intl`'s middleware which:
 *    - Auto-detects locale from `Accept-Language` on first visit
 *    - Redirects unprefixed URLs to `/{detected}/...`
 *    - Persists picker choices in the `NEXT_LOCALE` cookie
 *
 * Always-allowed paths skip both layers: `/admin`, `/api`, `/_next`,
 * `/favicon`, `/sitemap.xml`, `/robots.txt`, `/under-construction`,
 * `/llms.txt`, `/llms.{locale}.txt`.
 */

const BYPASS_COOKIE = 'bw_bypass'
const BYPASS_CODE = 'happy birthday'
const BYPASS_TTL_SECONDS = 60 * 60 * 24 * 30 // 30 days

const intlMiddleware = createMiddleware(routing)

export function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl

  // 1. Always-allowed paths short-circuit the entire pipeline.
  if (isAlwaysAllowed(pathname)) return NextResponse.next()

  // 2. Under-construction gate (if active and not bypassed).
  if (gateIsActive()) {
    // Bypass via secret query param.
    const provided = searchParams.get('bypass')
    if (provided !== null && provided === BYPASS_CODE) {
      const url = request.nextUrl.clone()
      url.searchParams.delete('bypass')
      const response = NextResponse.redirect(url)
      response.cookies.set(BYPASS_COOKIE, '1', {
        httpOnly: true,
        sameSite: 'lax',
        secure: request.nextUrl.protocol === 'https:',
        path: '/',
        maxAge: BYPASS_TTL_SECONDS,
      })
      return response
    }
    const bypassed =
      request.cookies.get(BYPASS_COOKIE)?.value === '1' ||
      request.cookies.has('__prerender_bypass')
    if (!bypassed) {
      return NextResponse.rewrite(new URL('/under-construction', request.url))
    }
  }

  // 3. Phase-1 single-locale lock (also applies during gate bypass).
  const lockTarget = singleLocaleLockTarget(pathname, isI18nEnabled())
  if (lockTarget !== null) {
    const url = request.nextUrl.clone()
    url.pathname = lockTarget
    return NextResponse.redirect(url)
  }

  // 4. Locale resolution.
  return intlMiddleware(request)
}

export const config = {
  matcher: '/((?!_next/static|_next/image|favicon.ico).*)',
}
