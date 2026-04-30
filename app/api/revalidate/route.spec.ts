import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const revalidateTagMock = vi.fn()
vi.mock('next/cache', () => ({
  revalidateTag: (tag: string, profile?: unknown) => revalidateTagMock(tag, profile),
}))

const fetchMock = vi.fn()

beforeEach(() => {
  revalidateTagMock.mockReset()
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

async function callPOST(init: { headers?: Record<string, string>; body?: unknown }) {
  const { POST } = await import('./route')
  const req = new Request('http://localhost/api/revalidate', {
    method: 'POST',
    headers: init.headers ?? {},
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  })
  return POST(req)
}

function mockSanityUserOk() {
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ id: 'user-1' }), { status: 200 }))
}

describe('POST /api/revalidate', () => {
  it('returns 401 when Authorization header is missing', async () => {
    const res = await callPOST({ body: { docIds: ['abc'] } })
    expect(res.status).toBe(401)
    expect(revalidateTagMock).not.toHaveBeenCalled()
  })

  it('returns 401 when bearer token is empty', async () => {
    const res = await callPOST({
      headers: { Authorization: 'Bearer ' },
      body: { docIds: ['abc'] },
    })
    expect(res.status).toBe(401)
    expect(revalidateTagMock).not.toHaveBeenCalled()
  })

  it('returns 401 when Sanity user check fails', async () => {
    fetchMock.mockResolvedValueOnce(new Response('forbidden', { status: 403 }))
    const res = await callPOST({
      headers: { Authorization: 'Bearer bad-token' },
      body: { docIds: ['abc'] },
    })
    expect(res.status).toBe(401)
    expect(revalidateTagMock).not.toHaveBeenCalled()
  })

  it('returns 400 when body is not valid JSON', async () => {
    const { POST } = await import('./route')
    const req = new Request('http://localhost/api/revalidate', {
      method: 'POST',
      headers: { Authorization: 'Bearer good-token' },
      body: 'not-json',
    })
    mockSanityUserOk()
    const res = await POST(req)
    expect(res.status).toBe(400)
    expect(revalidateTagMock).not.toHaveBeenCalled()
  })

  it('returns 400 when docIds is missing or empty', async () => {
    mockSanityUserOk()
    const res1 = await callPOST({
      headers: { Authorization: 'Bearer good-token' },
      body: {},
    })
    expect(res1.status).toBe(400)

    mockSanityUserOk()
    const res2 = await callPOST({
      headers: { Authorization: 'Bearer good-token' },
      body: { docIds: [] },
    })
    expect(res2.status).toBe(400)
    expect(revalidateTagMock).not.toHaveBeenCalled()
  })

  it('returns 200 and calls revalidateTag once per docId on success', async () => {
    mockSanityUserOk()
    const res = await callPOST({
      headers: { Authorization: 'Bearer good-token' },
      body: { docIds: ['doc-1', 'doc-2', 'doc-3'] },
    })
    expect(res.status).toBe(200)
    const json = (await res.json()) as { revalidated: string[] }
    expect(json.revalidated).toEqual(['sanity:doc-1', 'sanity:doc-2', 'sanity:doc-3'])
    expect(revalidateTagMock).toHaveBeenCalledTimes(3)
    expect(revalidateTagMock.mock.calls.map(([t]) => t)).toEqual([
      'sanity:doc-1',
      'sanity:doc-2',
      'sanity:doc-3',
    ])
  })

  it('passes the bearer token to the Sanity user-check call', async () => {
    mockSanityUserOk()
    await callPOST({
      headers: { Authorization: 'Bearer the-token' },
      body: { docIds: ['x'] },
    })
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.sanity.io/v1/users/me',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer the-token' }),
      }),
    )
  })
})
