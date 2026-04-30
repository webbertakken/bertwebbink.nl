import {
  useClient,
  type DocumentActionComponent,
  type DocumentActionDescription,
  type DocumentActionProps,
} from 'sanity'

/**
 * Wrap any document action (typically the built-in `publish`) so that, after
 * the inner action's `onHandle` completes and Sanity confirms the publish has
 * landed (`published._rev` changes), the wrapper POSTs the document id to
 * `/api/revalidate`. This busts the `sanity:<docId>` Vercel ISR cache tag so
 * the next public visitor sees the updated content immediately instead of
 * waiting up to 1 h for the time-window safety net.
 *
 * Failures are silent \u2014 a warning is logged but neither the editor nor the
 * publish flow is interrupted. If revalidation fails, the page stays cached
 * for at most the ISR window.
 *
 * Auth: the editor's Studio session token (read from `client.config().token`)
 * is forwarded as a Bearer header. `/api/revalidate` validates against
 * Sanity's `/v1/users/me`, so anonymous traffic can never trigger it.
 */
export type WithRevalidateOptions = {
  /** Total time to wait for `_rev` to change before giving up. Default 10 s. */
  timeoutMs?: number
  /** How often to poll `_rev`. Default 300 ms. */
  pollIntervalMs?: number
}

export function withRevalidatePublish(
  original: DocumentActionComponent,
  options: WithRevalidateOptions = {},
): DocumentActionComponent {
  const timeoutMs = options.timeoutMs ?? 10_000
  const pollIntervalMs = options.pollIntervalMs ?? 300

  const wrapped = (props: DocumentActionProps): DocumentActionDescription | null => {
    const inner = original(props)
    // Hook order must be stable. Always call useClient even if `inner` is
    // null \u2014 Sanity treats action descriptors as hook-respecting functions.
    const client = useClient({ apiVersion: '2024-10-28' })
    if (!inner) return null

    const startRev = (props.published as { _rev?: string } | null | undefined)?._rev ?? null
    const docId = props.id

    return {
      ...inner,
      onHandle: async () => {
        const innerHandle = inner.onHandle?.()
        if (innerHandle && typeof (innerHandle as Promise<unknown>).then === 'function') {
          await innerHandle
        }
        const newRev = await waitForRevChange(client, docId, startRev, timeoutMs, pollIntervalMs)
        if (!newRev) {
          console.warn(
            `[withRevalidatePublish] _rev did not change for ${docId} within ${timeoutMs}ms; skipping revalidate`,
          )
          return
        }
        const token = (client as unknown as { config: () => { token?: string } }).config().token
        if (!token) {
          console.warn('[withRevalidatePublish] no Studio session token; skipping revalidate')
          return
        }
        try {
          await fetch('/api/revalidate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ docIds: [docId] }),
          })
        } catch (err) {
          console.warn('[withRevalidatePublish] revalidate POST failed', err)
        }
      },
    }
  }
  ;(wrapped as { action?: string }).action = (original as { action?: string }).action
  ;(wrapped as { displayName?: string }).displayName = 'PublishWithRevalidate'
  return wrapped as DocumentActionComponent
}

async function waitForRevChange(
  client: { fetch: (query: string, params: Record<string, unknown>) => Promise<unknown> },
  docId: string,
  startRev: string | null,
  timeoutMs: number,
  pollIntervalMs: number,
): Promise<string | null> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const rev = (await client.fetch('*[_id == $id][0]._rev', { id: docId })) as
        | string
        | null
        | undefined
      if (rev && rev !== startRev) return rev
    } catch {
      // ignore transient fetch errors; keep polling until timeout
    }
    await new Promise((r) => setTimeout(r, pollIntervalMs))
  }
  return null
}
