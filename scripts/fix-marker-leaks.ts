#!/usr/bin/env tsx
/**
 * One-shot: rewrite leaked `<mN>...</mN>` markers back to the
 * site's brace-italic syntax `{{...}}` in stored translation docs.
 *
 * Background: a previous translator-prompt iteration told the LLM
 * that "inline formatting markers look like <m1>...</m1>". When the
 * source string used the brace-italic convention (`{{Bach}}`), the
 * LLM helpfully converted it to `<m1>Bach</m1>` thinking that was
 * the canonical syntax. The brace form is what the renderer parses
 * (see `renderEmphasised.tsx`); the numbered-tag form leaks through
 * to the rendered text because there's nothing post-translate that
 * decodes them in plain string fields.
 *
 * Scope: every translatable doc-per-locale type, every translatable
 * string field. Intentionally NOT walking Portable Text (`letter`,
 * `content`) because those fields legitimately use `<mN>` markers
 * during the translation round-trip and are decoded back to marks
 * by the PT walker.
 *
 * Usage:
 *   yarn tsx scripts/fix-marker-leaks.ts            # apply
 *   yarn tsx scripts/fix-marker-leaks.ts --dry-run  # preview
 */

import 'dotenv/config'
import { createClient } from '@sanity/client'

const projectId = required('NEXT_PUBLIC_SANITY_PROJECT_ID')
const dataset = required('NEXT_PUBLIC_SANITY_DATASET')
const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2024-10-28'
const writeToken = required('SANITY_API_WRITE_TOKEN')

function required(name: string): string {
  const value = process.env[name]
  if (!value) {
    console.error(`Missing required env var: ${name}`)
    process.exit(1)
  }
  return value
}

/**
 * Replace every `<m\d+>...</m\d+>` pair with `{{...}}`. Tolerates
 * mismatched numbers and nested markers (the regex is non-greedy and
 * walks left to right). Returns the string verbatim if no markers
 * are present so the caller can detect a no-op.
 */
function convertMarkers(value: string): string {
  return value.replace(/<m\d+>([\s\S]*?)<\/m\d+>/g, '{{$1}}')
}

/**
 * Recursively walk a doc, replacing every string leaf via `convertMarkers`.
 * Returns a new value when any string changed, else the input verbatim.
 * Skips Portable Text-shaped fields (`content`, `letter`) because those
 * contain block-level structures whose `<mN>` markers are managed by
 * the PT walker, not leaked into rendered text.
 */
const PT_FIELDS = new Set(['content', 'letter'])

function walk(value: unknown): { value: unknown; changed: boolean } {
  if (value == null) return { value, changed: false }
  if (typeof value === 'string') {
    if (!value.includes('<m')) return { value, changed: false }
    const next = convertMarkers(value)
    return next === value ? { value, changed: false } : { value: next, changed: true }
  }
  if (Array.isArray(value)) {
    let changed = false
    const out: unknown[] = []
    for (const item of value) {
      const { value: nextItem, changed: itemChanged } = walk(item)
      out.push(nextItem)
      if (itemChanged) changed = true
    }
    return changed ? { value: out, changed: true } : { value, changed: false }
  }
  if (typeof value === 'object') {
    let changed = false
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (PT_FIELDS.has(k)) {
        out[k] = v
        continue
      }
      const { value: nextV, changed: vChanged } = walk(v)
      out[k] = nextV
      if (vChanged) changed = true
    }
    return changed ? { value: out, changed: true } : { value, changed: false }
  }
  return { value, changed: false }
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const client = createClient({
    projectId,
    dataset,
    apiVersion,
    token: writeToken,
    useCdn: false,
    perspective: 'raw',
  })

  type Doc = Record<string, unknown> & { _id: string; _type: string; language?: string }
  const docs = await client.fetch<Doc[]>(
    `*[_type in ["organ","journal","about","elsewhere","privacy","scoresPage","organsPage","journalPage","settings","score"] && language != "nl" && !(_id in path("drafts.**"))]`,
  )
  console.log(`Loaded ${docs.length} non-source translation doc(s)`)

  let patched = 0
  for (const doc of docs) {
    const { value: nextDoc, changed } = walk(doc) as { value: Doc; changed: boolean }
    if (!changed) continue
    patched++
    console.log(`  ${doc._id} (${doc._type}, ${doc.language})`)
    if (!dryRun) {
      // Strip system fields before re-writing so createOrReplace
      // doesn't fight Sanity's own bookkeeping.
      const stripped: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(nextDoc)) {
        if (k === '_rev' || k === '_createdAt' || k === '_updatedAt') continue
        stripped[k] = v
      }
      await client.createOrReplace(stripped as never)
    }
  }
  console.log(`\n${dryRun ? '[DRY-RUN] ' : ''}rewrote markers in ${patched} doc(s)`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
