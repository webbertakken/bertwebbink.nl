import { revalidateTag } from 'next/cache'
import { NextResponse } from 'next/server'

/**
 * On-demand cache invalidation for `next-sanity/live`'s `sanity:<docId>` tags.
 *
 * Called from the Studio "Publish (with cache refresh)" document action and
 * optionally from migration scripts. The auth pattern matches `/api/publish-all`:
 * the editor's Sanity bearer token is verified by hitting Sanity's
 * `/v1/users/me`, so any logged-in Studio user can trigger a revalidation,
 * but anonymous traffic cannot.
 *
 * Body: `{ docIds: string[] }`. For each id, calls
 * `revalidateTag(\`sanity:${id}\`)` \u2014 which busts every Vercel ISR cache
 * entry whose underlying `sanityFetch` carried a matching tag.
 */
export async function POST(request: Request): Promise<Response> {
  const { authorized, error: authError } = await authorize(request)
  if (!authorized) {
    return NextResponse.json({ error: authError ?? 'Unauthorized' }, { status: 401 })
  }

  let body: { docIds?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (
    !Array.isArray(body.docIds) ||
    body.docIds.length === 0 ||
    !body.docIds.every((id): id is string => typeof id === 'string' && id.length > 0)
  ) {
    return NextResponse.json(
      { error: 'Body must include a non-empty `docIds` string array' },
      { status: 400 },
    )
  }

  const tags = body.docIds.map((id) => `sanity:${id}`)
  // Next 16 requires a cache profile arg; 'default' is the built-in profile.
  for (const tag of tags) revalidateTag(tag, 'default')

  return NextResponse.json({ revalidated: tags })
}

async function authorize(request: Request) {
  const auth = request.headers.get('authorization') ?? ''
  if (!auth.startsWith('Bearer '))
    return { authorized: false, error: 'Missing Authorization header' }
  const token = auth.slice('Bearer '.length).trim()
  if (!token) return { authorized: false, error: 'Empty bearer token' }
  try {
    const resp = await fetch('https://api.sanity.io/v1/users/me', {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    if (!resp.ok) return { authorized: false, error: `Sanity user check failed (${resp.status})` }
    return { authorized: true }
  } catch (err) {
    return {
      authorized: false,
      error: err instanceof Error ? err.message : 'Sanity user check threw',
    }
  }
}
