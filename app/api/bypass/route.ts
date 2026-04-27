import { NextResponse, type NextRequest } from 'next/server'

/**
 * Bypass-code form endpoint for the under-construction gate.
 *
 * Accepts a POST from the form on `/under-construction`. If the submitted
 * `code` matches the secret, set the same cookie the query-string bypass
 * sets (`bw_bypass`) and redirect to `/`. Otherwise redirect back to the
 * gate page with `?bad=1` so the page can show a tiny error state.
 *
 * Kept as a POST + redirect (PRG pattern) so the no-JS path works; no
 * client-side JS is required for the form to function.
 */

const BYPASS_COOKIE = 'bw_bypass'
const BYPASS_CODE = 'happy birthday'
const BYPASS_TTL_SECONDS = 60 * 60 * 24 * 30 // 30 days

export async function POST(request: NextRequest) {
  const form = await request.formData()
  const code = String(form.get('code') ?? '').trim()
  const origin = new URL(request.url).origin

  if (code !== BYPASS_CODE) {
    return NextResponse.redirect(new URL('/under-construction?bad=1', origin), { status: 303 })
  }

  const response = NextResponse.redirect(new URL('/', origin), { status: 303 })
  response.cookies.set(BYPASS_COOKIE, '1', {
    httpOnly: true,
    sameSite: 'lax',
    secure: request.nextUrl.protocol === 'https:',
    path: '/',
    maxAge: BYPASS_TTL_SECONDS,
  })
  return response
}
