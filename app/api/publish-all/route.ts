import { revalidateTag } from 'next/cache'
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
 * Implements the failure matrix in plans/translations.md A10.3:
 *   1. Validate source (skipped here \u2014 schema validators run in Studio)
 *   2. Publish source
 *   3. Translate (per-locale failure does not block other locales)
 *   4. Publish translated siblings (if `autoPublishTranslations !== false`)
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

  const sourceLocale = (sourceDoc as { language?: string }).language as Locale | undefined
  if (!sourceLocale) {
    return NextResponse.json(
      { error: 'Source doc has no language; run `yarn migrate:i18n` first' },
      { status: 409 },
    )
  }

  // Resolve `autoPublishTranslations` from the source-locale settings doc.
  const settingsDoc = await client.getDocument(`settings-${sourceLocale}`)
  const autoPublish =
    (settingsDoc as { autoPublishTranslations?: boolean })?.autoPublishTranslations ?? true

  const acceptsSse = (request.headers.get('accept') ?? '').includes('text/event-stream')
  const translator = getTranslator()

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

      // Step 2: publish source.
      try {
        const draftId = `drafts.${docId}`
        const draft = await client.getDocument(draftId)
        if (draft) {
          await commitDraft(client, draft as Record<string, unknown>, docId)
          revalidateTag(`sanity:${docId}`, 'default')
          send('source', { status: 'published' })
        } else {
          send('source', { status: 'already-published' })
        }
      } catch (err) {
        send('source', {
          status: 'failed',
          error: err instanceof Error ? err.message : String(err),
        })
        send('summary', { source: 'failed', translated: {} })
        controller.close()
        return
      }

      // Step 3: translate (writes published siblings directly).
      let results
      try {
        results = await runTranslation(client, translator, docId, {
          targetLocales: targetLocales.length > 0 ? targetLocales : undefined,
          onProgress,
        })
      } catch (err) {
        send('error', { message: err instanceof Error ? err.message : String(err) })
        send('summary', { source: 'published', translated: {} })
        controller.close()
        return
      }

      // Step 4: publish siblings.
      const publishedResults: Array<(typeof results)[number] & { publishStatus: string }> = []
      for (const r of results) {
        if (!autoPublish) {
          publishedResults.push({ ...r, publishStatus: 'kept-as-draft' })
          continue
        }
        if (r.status === 'failed' || r.status === 'skipped') {
          publishedResults.push({ ...r, publishStatus: 'not-published' })
          continue
        }
        try {
          const draftSiblingId = `drafts.${r.docId}`
          const draft = await client.getDocument(draftSiblingId)
          if (draft) {
            await commitDraft(client, draft as Record<string, unknown>, r.docId)
          }
          revalidateTag(`sanity:${r.docId}`, 'default')
          publishedResults.push({ ...r, publishStatus: 'published' })
        } catch (err) {
          publishedResults.push({
            ...r,
            publishStatus: 'translated_not_published',
            error: err instanceof Error ? err.message : String(err),
          })
        }
      }

      send('summary', {
        source: 'published',
        translated: Object.fromEntries(publishedResults.map((r) => [r.locale, r])),
        autoPublishTranslations: autoPublish,
      })
      controller.close()
    },
  })

  if (acceptsSse) {
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    })
  }

  // Drain the stream into a JSON response for non-SSE callers.
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let buffered = ''
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffered += decoder.decode(value, { stream: true })
  }
  const lastSummary = parseLastSummary(buffered)
  return NextResponse.json(lastSummary ?? { error: 'No summary emitted' })
}

async function commitDraft(
  client: ReturnType<typeof getServerClient>,
  draft: Record<string, unknown>,
  publishedId: string,
): Promise<void> {
  // createOrReplace semantics: copy draft body to published id, delete draft.
  const body = { ...draft }
  delete (body as { _id?: string })._id
  delete (body as { _rev?: string })._rev
  await client.createOrReplace({ ...body, _id: publishedId } as never)
  await client.delete(`drafts.${publishedId}`)
}

function parseLastSummary(buffered: string): unknown {
  const events = buffered.split('\n\n').filter((b) => b.startsWith('event: summary'))
  const last = events.pop()
  if (!last) return null
  const dataLine = last.split('\n').find((l) => l.startsWith('data: '))
  if (!dataLine) return null
  try {
    return JSON.parse(dataLine.slice('data: '.length))
  } catch {
    return null
  }
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
