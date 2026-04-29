import { TranslateIcon } from '@sanity/icons'
import { useState } from 'react'
import { useClient, type DocumentActionDescription, type DocumentActionProps } from 'sanity'

import {
  isTranslatableType,
} from '@/core/translator/orchestrator'
import { DEFAULT_LOCALE, LOCALES } from '@/core/i18n/locales'

/**
 * "Translate to all locales" \u2014 secondary action in the three-dot menu.
 *
 * Visible on every translatable doc type. For document-per-locale types,
 * only visible on the source-language document. For `score`, always visible.
 */
export function translateAllAction(
  props: DocumentActionProps,
): DocumentActionDescription | null {
  return useTranslateAllAction(props)
}

function useTranslateAllAction(
  props: DocumentActionProps,
): DocumentActionDescription | null {
  const { id, type, draft, published } = props
  const client = useClient({ apiVersion: '2024-10-28' })
  const [busy, setBusy] = useState(false)
  const [open, setOpen] = useState(false)
  const [output, setOutput] = useState<string>('')

  if (!isTranslatableType(type)) return null

  const doc = (draft ?? published) as { language?: string } | null
  const docLang = doc?.language ?? DEFAULT_LOCALE
  // Document-per-locale: only show on source-language doc.
  if (type !== 'score' && docLang !== DEFAULT_LOCALE) return null

  return {
    icon: TranslateIcon,
    label: busy ? 'Translating\u2026' : 'Translate to all locales',
    onHandle: () => {
      setOpen(true)
      runTranslation()
    },
    dialog: open && {
      type: 'dialog' as const,
      onClose: () => setOpen(false),
      header: 'Translate to all locales',
      content: (
        <pre style={{ fontSize: 12, lineHeight: 1.4, maxHeight: 360, overflow: 'auto' }}>
          {output || 'Starting\u2026'}
        </pre>
      ),
    },
    disabled: busy,
  }

  async function runTranslation() {
    setBusy(true)
    setOutput('Authenticating\u2026\n')
    try {
      const token = await getStudioToken(client)
      if (!token) throw new Error('Could not resolve Studio session token')
      setOutput((s) => s + 'POST /api/translate\u2026\n')
      const resp = await fetch('/api/translate', {
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
        for (const ev of events) appendEvent(ev)
      }
      setOutput((s) => s + 'Done.\n')
    } catch (err) {
      setOutput((s) => s + `\nERROR: ${err instanceof Error ? err.message : String(err)}\n`)
    } finally {
      setBusy(false)
    }
  }

  function appendEvent(ev: string) {
    const lines = ev.split('\n')
    const eventName = lines.find((l) => l.startsWith('event: '))?.slice('event: '.length)
    const dataRaw = lines.find((l) => l.startsWith('data: '))?.slice('data: '.length) ?? ''
    let data: unknown
    try {
      data = JSON.parse(dataRaw)
    } catch {
      data = dataRaw
    }
    setOutput((s) => `${s}[${eventName}] ${typeof data === 'string' ? data : JSON.stringify(data)}\n`)
  }
}

async function getStudioToken(client: ReturnType<typeof useClient>): Promise<string | null> {
  // Sanity Studio attaches the user's session token to the client config.
  const config = (client as unknown as { config?: () => { token?: string } }).config?.()
  return config?.token ?? null
}
