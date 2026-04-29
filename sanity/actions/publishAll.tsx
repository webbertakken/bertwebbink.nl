import { PublishIcon } from '@sanity/icons'
import { useState } from 'react'
import { useClient, type DocumentActionDescription, type DocumentActionProps } from 'sanity'

import { LOCALES } from '@/core/i18n/locales'
import { shouldShowTranslateAction } from './visibility'

/**
 * Primary "Publish" action for translatable doc types.
 *
 * Validates the source, publishes it, translates every other locale,
 * and publishes each translated sibling. Per the failure matrix,
 * per-locale failures don't block other locales. The built-in single-
 * locale Publish action stays in the overflow menu as a fallback for
 * when an editor wants to ship just one locale.
 *
 * To keep translations as drafts only, flip
 * `Site Settings › Auto-publish translated siblings` to off.
 */
export function publishAllLocalesAction(
  props: DocumentActionProps,
): DocumentActionDescription | null {
  return usePublishAllLocalesAction(props)
}

function usePublishAllLocalesAction(
  props: DocumentActionProps,
): DocumentActionDescription | null {
  const { id, type, draft, published } = props
  const client = useClient({ apiVersion: '2024-10-28' })
  const [busy, setBusy] = useState(false)
  const [open, setOpen] = useState(false)
  const [output, setOutput] = useState<string>('')

  const doc = (draft ?? published) as { language?: string } | null
  if (!shouldShowTranslateAction({ type, language: doc?.language ?? null })) return null
  const docLang = doc?.language ?? 'nl'

  return {
    icon: PublishIcon,
    label: busy ? 'Publishing\u2026' : 'Publish (auto-translated)',
    onHandle: () => {
      setOpen(true)
      run()
    },
    dialog: open && {
      type: 'dialog' as const,
      onClose: () => setOpen(false),
      header: 'Publish to all locales',
      content: (
        <>
          <p style={{ fontSize: 13, lineHeight: 1.5, margin: '0 0 12px' }}>
            Publishes this document, then translates and publishes every
            other locale. Set \u201cAuto-publish translated siblings\u201d
            to off in Site Settings to keep them as drafts instead.
          </p>
          <pre style={{ fontSize: 12, lineHeight: 1.4, maxHeight: 360, overflow: 'auto' }}>
            {output || 'Starting\u2026'}
          </pre>
        </>
      ),
    },
    disabled: busy,
  }

  async function run() {
    setBusy(true)
    setOutput('Authenticating\u2026\n')
    try {
      const token = (client as unknown as { config?: () => { token?: string } }).config?.()
        ?.token
      if (!token) throw new Error('Could not resolve Studio session token')
      setOutput((s) => s + 'POST /api/publish-all\u2026\n')
      const resp = await fetch('/api/publish-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          Accept: 'text/event-stream',
        },
        body: JSON.stringify({
          docId: id,
          targetLocales: LOCALES.filter((l) => l !== docLang),
        }),
      })
      if (!resp.ok || !resp.body) {
        const text = await resp.text().catch(() => '')
        throw new Error(`HTTP ${resp.status}: ${text || resp.statusText}`)
      }
      const reader = resp.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const events = buffer.split('\n\n')
        buffer = events.pop() ?? ''
        for (const ev of events) {
          const lines = ev.split('\n')
          const eventName = lines.find((l) => l.startsWith('event: '))?.slice('event: '.length)
          const dataRaw = lines.find((l) => l.startsWith('data: '))?.slice('data: '.length) ?? ''
          let data: unknown
          try {
            data = JSON.parse(dataRaw)
          } catch {
            data = dataRaw
          }
          setOutput(
            (s) => `${s}[${eventName}] ${typeof data === 'string' ? data : JSON.stringify(data)}\n`,
          )
        }
      }
      setOutput((s) => s + 'Done.\n')
    } catch (err) {
      setOutput((s) => s + `\nERROR: ${err instanceof Error ? err.message : String(err)}\n`)
    } finally {
      setBusy(false)
    }
  }
}
