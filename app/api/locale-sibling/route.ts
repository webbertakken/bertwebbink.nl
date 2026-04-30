import { NextResponse } from 'next/server'

import { isLocale } from '@/core/i18n/locales'
import { findSiblingSlug, isSluggedLocalisedType } from '@/core/i18n/sibling-slug'
import { client } from '@/sanity/lib/client'

/**
 * GET /api/locale-sibling?type=journal|organ&from=<locale>&slug=<slug>&to=<locale>
 *
 * Returns `{ slug: string | null }` — the slug of the target-locale
 * sibling for a document-per-locale entry. Used by the `LanguagePicker`
 * to translate `[slug]` segments when switching locales so we don't
 * land on a 404. No auth: read-only public data.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const type = url.searchParams.get('type')
  const from = url.searchParams.get('from')
  const to = url.searchParams.get('to')
  const slug = url.searchParams.get('slug')

  if (!isSluggedLocalisedType(type)) {
    return NextResponse.json({ error: 'Invalid or missing "type"' }, { status: 400 })
  }
  if (!isLocale(from)) {
    return NextResponse.json({ error: 'Invalid or missing "from"' }, { status: 400 })
  }
  if (!isLocale(to)) {
    return NextResponse.json({ error: 'Invalid or missing "to"' }, { status: 400 })
  }
  if (!slug) {
    return NextResponse.json({ error: 'Missing "slug"' }, { status: 400 })
  }

  const sibling = await findSiblingSlug(client, {
    type,
    sourceLocale: from,
    sourceSlug: slug,
    targetLocale: to,
  })

  return NextResponse.json(
    { slug: sibling },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
