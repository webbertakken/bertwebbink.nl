import { NextResponse, type NextRequest } from 'next/server'

import { LAUNCH_AT_MS } from '@/core/launch'

/**
 * Site-wide "under construction" gate.
 *
 * The gate is active when EITHER:
 *   - `UNDER_CONSTRUCTION === 'true'` (manual override), OR
 *   - the hardcoded `LAUNCH_AT_MS` is still in the future (auto-lift gate
 *     that disables itself once the moment arrives — no redeploy needed).
 *
 * `UNDER_CONSTRUCTION` is server-only (not `NEXT_PUBLIC_`) so the public
 * site doesn't reveal whether the gate is manually flipped on. The launch
 * timestamp is hardcoded in `core/launch.ts` and shared with the
 * `/under-construction` page, which intentionally surfaces the countdown.
 *
 * When active, every public route is rewritten to /under-construction
 * unless the visitor has the bypass cookie or arrives with the secret
 * query parameter.
 *
 * Bypass options:
 *   - Visit any URL with `?bypass=happy birthday` once. Middleware sets
 *     a 30-day cookie and redirects back to the same URL minus the query
 *     string.
 *   - Submit the same code via the form on `/under-construction` (POST
 *     to `/api/bypass`).
 *
 * Always allowed regardless of the gate:
 *   - /under-construction  (the gate page itself; otherwise infinite rewrite)
 *   - /admin/**            (Sanity Studio — editors must keep working)
 *   - /api/**              (draft-mode toggle, bypass form, etc.)
 *   - /_next/**            (Next.js assets and HMR)
 *   - /favicon.ico, /sitemap.xml, /robots.txt
 *
 * Sanity draft mode also bypasses (via the `__prerender_bypass` cookie
 * Next.js sets when /api/draft-mode/enable runs) so the Presentation
 * tool's preview iframe sees the real site, not the gate.
 */

const BYPASS_COOKIE = 'bw_bypass'
const BYPASS_CODE = 'happy birthday'
const BYPASS_TTL_SECONDS = 60 * 60 * 24 * 30 // 30 days

const ALWAYS_ALLOW = [
  '/under-construction',
  '/admin',
  '/api',
  '/_next',
  '/favicon',
  '/sitemap.xml',
  '/robots.txt',
]

function gateIsActive(): boolean {
  if (process.env.UNDER_CONSTRUCTION === 'true') return true
  if (Number.isFinite(LAUNCH_AT_MS) && Date.now() < LAUNCH_AT_MS) return true
  return false
}

export function proxy(request: NextRequest) {
  if (!gateIsActive()) return NextResponse.next()

  const { pathname, searchParams } = request.nextUrl

  if (ALWAYS_ALLOW.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next()
  }

  // Bypass via secret query param — set cookie + redirect to clean URL.
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
    // Wrong code → fall through to the gate. We don't signal whether the
    // code was right or wrong; the gate page itself stays the same.
  }

  // Existing valid bypass cookie?
  if (request.cookies.get(BYPASS_COOKIE)?.value === '1') {
    return NextResponse.next()
  }

  // Sanity draft mode (Presentation tool, editors). Next.js sets this
  // cookie when /api/draft-mode/enable runs.
  if (request.cookies.has('__prerender_bypass')) {
    return NextResponse.next()
  }

  // Rewrite (not redirect) so the URL bar keeps the requested path.
  // The visitor sees /under-construction's content but stays on /scores
  // (or wherever they were trying to go).
  return NextResponse.rewrite(new URL('/under-construction', request.url))
}

export const config = {
  // Match everything except static assets handled directly by Next.js.
  matcher: '/((?!_next/static|_next/image|favicon.ico).*)',
}
