import { NextResponse, type NextRequest } from 'next/server'
import createMiddleware from 'next-intl/middleware'

import { routing } from '@/i18n/routing'
import { gateIsActive, isAlwaysAllowed } from './proxy.helpers'

/**
 * Composed middleware:
 *
 * 1. Site-wide "under construction" gate — when active, every public
 *    route is rewritten to `/under-construction` unless bypassed.
 *    The gate page is locale-agnostic English (Q2).
 *
 * 2. Otherwise, hand off to `next-intl`'s middleware which:
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

  // 2. Under-construction gate (if active).
  if (gateIsActive()) {
    // Bypass via secret query param.
    const provided = searchParams.get('bypass')
    if (provided !== null) {
      if (provided === BYPASS_CODE) {
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
    }
    // Bypass via cookie.
    if (request.cookies.get(BYPASS_COOKIE)?.value === '1') {
      return intlMiddleware(request)
    }
    // Bypass via Sanity draft mode.
    if (request.cookies.has('__prerender_bypass')) {
      return intlMiddleware(request)
    }
    return NextResponse.rewrite(new URL('/under-construction', request.url))
  }

  // 3. Locale resolution.
  return intlMiddleware(request)
}

export const config = {
  matcher: '/((?!_next/static|_next/image|favicon.ico).*)',
}
