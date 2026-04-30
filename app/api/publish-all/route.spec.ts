import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const revalidateTagMock = vi.fn()
vi.mock('next/cache', () => ({
  revalidateTag: (tag: string, profile?: unknown) => revalidateTagMock(tag, profile),
}))

const fetchMock = vi.fn()

type AnyDoc = Record<string, unknown>
type MockClient = {
  getDocument: ReturnType<typeof vi.fn>
  createOrReplace: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
}

let client: MockClient
type RunTranslationResult = {
  locale: string
  docId: string
  status: 'ok' | 'failed' | 'skipped'
}
let runTranslationResults: RunTranslationResult[] = []

vi.mock('@/sanity/lib/serverClient', () => ({
  getServerClient: () => client,
}))

vi.mock('@/core/translator/factory', () => ({
  getTranslator: () => ({}),
}))

vi.mock('@/core/translator/orchestrator', async () => {
  const actual = await vi.importActual<typeof import('@/core/translator/orchestrator')>(
    '@/core/translator/orchestrator',
  )
  return {
    ...actual,
    runTranslation: vi.fn(async () => runTranslationResults),
  }
})

beforeEach(() => {
  revalidateTagMock.mockReset()
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  // Auth always passes by default; individual tests can override.
  fetchMock.mockResolvedValue(new Response(JSON.stringify({ id: 'u' }), { status: 200 }))
  runTranslationResults = []

  client = {
    getDocument: vi.fn(async (id: string): Promise<AnyDoc | null> => {
      if (id === 'src-doc') return { _id: 'src-doc', _type: 'journal', language: 'nl' }
      if (id === 'drafts.src-doc')
        return { _id: 'drafts.src-doc', _type: 'journal', language: 'nl', _rev: 'r1' }
      if (id === 'settings-nl') return { _id: 'settings-nl', autoPublishTranslations: true }
      // sibling drafts
      if (id.startsWith('drafts.tr-')) return { _id: id, _rev: 'rs' }
      return null
    }),
    createOrReplace: vi.fn(async (doc: AnyDoc) => doc),
    delete: vi.fn(async () => undefined),
  }
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
})

async function callPublishAll(body: unknown, opts: { sse?: boolean } = {}) {
  const { POST } = await import('./route')
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: 'Bearer good-token',
  }
  if (opts.sse) headers.Accept = 'text/event-stream'
  const req = new Request('http://localhost/api/publish-all', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
  return POST(req)
}

async function drainSse(res: Response): Promise<void> {
  const reader = res.body!.getReader()
  while (true) {
    const { done } = await reader.read()
    if (done) break
  }
}

describe('POST /api/publish-all \u2014 revalidation', () => {
  it('revalidates the source tag exactly once after the source publishes successfully', async () => {
    runTranslationResults = []
    const res = await callPublishAll({ docId: 'src-doc' }, { sse: true })
    await drainSse(res)
    const sourceCalls = revalidateTagMock.mock.calls.filter(([tag]) => tag === 'sanity:src-doc')
    expect(sourceCalls).toHaveLength(1)
  })

  it('revalidates each successfully-published sibling tag exactly once', async () => {
    runTranslationResults = [
      { locale: 'en', docId: 'tr-en', status: 'ok' },
      { locale: 'de', docId: 'tr-de', status: 'ok' },
      { locale: 'fr', docId: 'tr-fr', status: 'ok' },
    ]
    const res = await callPublishAll({ docId: 'src-doc' }, { sse: true })
    await drainSse(res)

    const callsByTag = revalidateTagMock.mock.calls.map(([t]) => t)
    expect(callsByTag).toContain('sanity:tr-en')
    expect(callsByTag).toContain('sanity:tr-de')
    expect(callsByTag).toContain('sanity:tr-fr')
    expect(callsByTag.filter((t) => t === 'sanity:tr-en')).toHaveLength(1)
    expect(callsByTag.filter((t) => t === 'sanity:tr-de')).toHaveLength(1)
    expect(callsByTag.filter((t) => t === 'sanity:tr-fr')).toHaveLength(1)
  })

  it('does not revalidate failed or skipped sibling tags', async () => {
    runTranslationResults = [
      { locale: 'en', docId: 'tr-en', status: 'ok' },
      { locale: 'de', docId: 'tr-de', status: 'failed' },
      { locale: 'fr', docId: 'tr-fr', status: 'skipped' },
    ]
    const res = await callPublishAll({ docId: 'src-doc' }, { sse: true })
    await drainSse(res)

    const callsByTag = revalidateTagMock.mock.calls.map(([t]) => t)
    expect(callsByTag).toContain('sanity:tr-en')
    expect(callsByTag).not.toContain('sanity:tr-de')
    expect(callsByTag).not.toContain('sanity:tr-fr')
  })

  it('does not revalidate sibling tags when autoPublishTranslations is false', async () => {
    client.getDocument.mockImplementation(async (id: string): Promise<AnyDoc | null> => {
      if (id === 'src-doc') return { _id: 'src-doc', _type: 'journal', language: 'nl' }
      if (id === 'drafts.src-doc')
        return { _id: 'drafts.src-doc', _type: 'journal', language: 'nl' }
      if (id === 'settings-nl') return { _id: 'settings-nl', autoPublishTranslations: false }
      if (id.startsWith('drafts.tr-')) return { _id: id }
      return null
    })
    runTranslationResults = [
      { locale: 'en', docId: 'tr-en', status: 'ok' },
      { locale: 'de', docId: 'tr-de', status: 'ok' },
    ]
    const res = await callPublishAll({ docId: 'src-doc' }, { sse: true })
    await drainSse(res)

    const callsByTag = revalidateTagMock.mock.calls.map(([t]) => t)
    // Source still revalidated (it was published).
    expect(callsByTag).toContain('sanity:src-doc')
    // Siblings were kept as drafts \u2014 no revalidation.
    expect(callsByTag).not.toContain('sanity:tr-en')
    expect(callsByTag).not.toContain('sanity:tr-de')
  })

  it('does not revalidate the source tag when there is no draft to publish', async () => {
    client.getDocument.mockImplementation(async (id: string): Promise<AnyDoc | null> => {
      if (id === 'src-doc') return { _id: 'src-doc', _type: 'journal', language: 'nl' }
      if (id === 'drafts.src-doc') return null // already published, no draft
      if (id === 'settings-nl') return { _id: 'settings-nl', autoPublishTranslations: true }
      return null
    })
    runTranslationResults = []
    const res = await callPublishAll({ docId: 'src-doc' }, { sse: true })
    await drainSse(res)

    const callsByTag = revalidateTagMock.mock.calls.map(([t]) => t)
    expect(callsByTag).not.toContain('sanity:src-doc')
  })
})
