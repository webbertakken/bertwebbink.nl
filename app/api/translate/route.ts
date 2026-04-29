import { NextResponse } from 'next/server'

import { isLocale, type Locale } from '@/core/i18n/locales'
import { getTranslator } from '@/core/translator/factory'
import {
  isTranslatableType,
  runTranslation,
  type ProgressEvent,
} from '@/core/translator/orchestrator'
import { getServerClient } from '@/sanity/lib/serverClient'

/**
 * POST { docId: string, targetLocales?: Locale[] }
 * \u2192 streams Server-Sent Events with per-locale progress, or returns a
 *   plain JSON response when the caller doesn't accept text/event-stream.
 */
export async function POST(request: Request) {
  const { authorized, error: authError } = await authorize(request)
  if (!authorized) {
    return NextResponse.json({ error: authError ?? 'Unauthorized' }, { status: 401 })
  }

  let body: { docId?: string; targetLocales?: string[] }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const docId = body.docId
  if (!docId || typeof docId !== 'string') {
    return NextResponse.json({ error: 'Missing docId' }, { status: 400 })
  }
  const targetLocales = (body.targetLocales ?? []).filter(isLocale) as Locale[]

  const client = getServerClient()
  const sourceDoc = await client.getDocument(docId)
  if (!sourceDoc) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }
  const type = (sourceDoc as { _type?: string })._type ?? ''
  if (!isTranslatableType(type)) {
    return NextResponse.json({ error: `Type "${type}" is not translatable` }, { status: 400 })
  }

  const translator = getTranslator()
  const acceptsSse = (request.headers.get('accept') ?? '').includes('text/event-stream')
  if (!acceptsSse) {
    const results = await runTranslation(client, translator, docId, {
      targetLocales: targetLocales.length > 0 ? targetLocales : undefined,
    })
    return NextResponse.json({
      translated: Object.fromEntries(results.map((r) => [r.locale, r])),
    })
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder()
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
      }
      const onProgress = (e: ProgressEvent) => {
        if (e.type === 'locale:start') send('locale-start', { locale: e.locale })
        else if (e.type === 'locale:done') send('locale-done', e.result)
        else if (e.type === 'translator:usage') send('usage', e)
      }
      try {
        const results = await runTranslation(client, translator, docId, {
          targetLocales: targetLocales.length > 0 ? targetLocales : undefined,
          onProgress,
        })
        send('summary', {
          translated: Object.fromEntries(results.map((r) => [r.locale, r])),
        })
      } catch (err) {
        send('error', { message: err instanceof Error ? err.message : String(err) })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}

/**
 * Verify the caller is an authenticated Sanity user. The Studio sends
 * its session token as `Authorization: Bearer <token>`.
 */
async function authorize(
  request: Request,
): Promise<{ authorized: boolean; error?: string }> {
  const auth = request.headers.get('authorization') ?? ''
  if (!auth.startsWith('Bearer ')) {
    return { authorized: false, error: 'Missing Authorization header' }
  }
  const token = auth.slice('Bearer '.length).trim()
  if (!token) return { authorized: false, error: 'Empty bearer token' }
  try {
    const resp = await fetch('https://api.sanity.io/v1/users/me', {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    if (!resp.ok) {
      return { authorized: false, error: `Sanity user check failed (${resp.status})` }
    }
    return { authorized: true }
  } catch (err) {
    return {
      authorized: false,
      error: err instanceof Error ? err.message : 'Sanity user check threw',
    }
  }
}
