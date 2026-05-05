import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { withRevalidatePublish } from './withRevalidate'

const useClientMock = vi.fn()
vi.mock('sanity', () => ({
  useClient: (opts: unknown) => useClientMock(opts),
}))

const fetchMock = vi.fn()
const consoleWarnMock = vi.fn()

beforeEach(() => {
  useClientMock.mockReset()
  fetchMock.mockReset()
  consoleWarnMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  vi.stubGlobal('console', { ...console, warn: consoleWarnMock })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

type AnyProps = Record<string, unknown>

function makeClient(opts: { token?: string; revs: (string | null)[] }) {
  const queue = [...opts.revs]
  const fetchFn = vi.fn(async () => queue.shift() ?? null)
  return {
    config: () => ({ token: opts.token }),
    fetch: fetchFn,
  }
}

describe('withRevalidatePublish', () => {
  it('returns null when the wrapped action returns null', () => {
    const inner = vi.fn(() => null)
    const wrapped = withRevalidatePublish(inner as never)
    useClientMock.mockReturnValue(makeClient({ token: 't', revs: [] }))
    const result = wrapped({ id: 'doc-1' } as never)
    expect(result).toBeNull()
  })

  it('preserves the inner action `action` identifier', () => {
    const inner = Object.assign(
      vi.fn(() => ({ label: 'Publish', onHandle: vi.fn() })),
      {
        action: 'publish',
      },
    )
    const wrapped = withRevalidatePublish(inner as never)
    expect((wrapped as unknown as { action: string }).action).toBe('publish')
  })

  it('passes through label/title/icon from the inner description', () => {
    const inner = vi.fn(() => ({
      label: 'Publish',
      title: 'Hint',
      icon: 'I',
      onHandle: vi.fn(),
    }))
    const wrapped = withRevalidatePublish(inner as never)
    useClientMock.mockReturnValue(makeClient({ token: 't', revs: [] }))
    const desc = wrapped({ id: 'doc-1' } as never) as unknown as AnyProps
    expect(desc.label).toBe('Publish')
    expect(desc.title).toBe('Hint')
    expect(desc.icon).toBe('I')
  })

  it('calls inner onHandle, then POSTs /api/revalidate with bearer token after _rev changes', async () => {
    const innerOnHandle = vi.fn(async () => undefined)
    const inner = vi.fn(() => ({ label: 'Publish', onHandle: innerOnHandle }))
    const wrapped = withRevalidatePublish(inner as never)
    const client = makeClient({ token: 'studio-token', revs: ['rev-2'] })
    useClientMock.mockReturnValue(client)
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }))

    const desc = wrapped({
      id: 'doc-abc',
      published: { _id: 'doc-abc', _rev: 'rev-1' },
    } as never) as unknown as { onHandle: () => Promise<void> }

    await desc.onHandle()

    expect(innerOnHandle).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/revalidate')
    expect((init as RequestInit).method).toBe('POST')
    const headers = (init as RequestInit).headers as Record<string, string>
    expect(headers.Authorization).toBe('Bearer studio-token')
    expect(headers['Content-Type']).toBe('application/json')
    const body = JSON.parse((init as RequestInit).body as string)
    expect(body).toEqual({ docIds: ['doc-abc'] })
  }, 7000)

  it('logs a warning and skips the fetch when no Studio token is available', async () => {
    const innerOnHandle = vi.fn(async () => undefined)
    const inner = vi.fn(() => ({ label: 'Publish', onHandle: innerOnHandle }))
    const wrapped = withRevalidatePublish(inner as never)
    const client = makeClient({ token: undefined, revs: ['rev-2'] })
    useClientMock.mockReturnValue(client)

    const desc = wrapped({
      id: 'doc-abc',
      published: { _id: 'doc-abc', _rev: 'rev-1' },
    } as never) as unknown as { onHandle: () => Promise<void> }
    await desc.onHandle()

    expect(innerOnHandle).toHaveBeenCalledTimes(1)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(consoleWarnMock).toHaveBeenCalled()
  }, 7000)

  it('logs and skips fetch when _rev never changes within the timeout', async () => {
    const innerOnHandle = vi.fn(async () => undefined)
    const inner = vi.fn(() => ({ label: 'Publish', onHandle: innerOnHandle }))
    const wrapped = withRevalidatePublish(inner as never, {
      timeoutMs: 50,
      pollIntervalMs: 10,
    })
    const client = makeClient({ token: 'studio-token', revs: [] })
    useClientMock.mockReturnValue(client)

    const desc = wrapped({
      id: 'doc-abc',
      published: { _id: 'doc-abc', _rev: 'rev-1' },
    } as never) as unknown as { onHandle: () => Promise<void> }
    await desc.onHandle()

    expect(innerOnHandle).toHaveBeenCalledTimes(1)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(consoleWarnMock).toHaveBeenCalled()
  }, 7000)

  it('does not throw when /api/revalidate fetch rejects', async () => {
    const innerOnHandle = vi.fn(async () => undefined)
    const inner = vi.fn(() => ({ label: 'Publish', onHandle: innerOnHandle }))
    const wrapped = withRevalidatePublish(inner as never)
    const client = makeClient({ token: 'studio-token', revs: ['rev-2'] })
    useClientMock.mockReturnValue(client)
    fetchMock.mockRejectedValue(new Error('network'))

    const desc = wrapped({
      id: 'doc-abc',
      published: { _id: 'doc-abc', _rev: 'rev-1' },
    } as never) as unknown as { onHandle: () => Promise<void> }
    await expect(desc.onHandle()).resolves.toBeUndefined()
    expect(consoleWarnMock).toHaveBeenCalled()
  })
})
