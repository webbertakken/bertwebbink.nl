#!/usr/bin/env tsx
/**
 * One-off: rewrite every `slug.current` in `journal` / `organ` docs so
 * its bytes are in canonical NFC form (composed Hangul, single-codepoint
 * accented Latin, etc.).
 *
 * Why: an earlier `slugify()` emitted NFD (decomposed) bytes for non-
 * Latin scripts (Korean was the canary). Browsers normalise URL paths
 * to NFC, so the stored NFD slug never matched the incoming NFC URL,
 * 404'ing every translation. The current `slugify()` emits NFC; this
 * script repairs the docs that were created before the fix.
 *
 * Idempotent: a doc whose slug is already NFC is left alone.
 *
 * Usage:
 *   yarn tsx scripts/normalise-slugs-nfc.ts --dry-run
 *   yarn tsx scripts/normalise-slugs-nfc.ts
 */

import 'dotenv/config'
import { createClient } from '@sanity/client'

const projectId = required('NEXT_PUBLIC_SANITY_PROJECT_ID')
const dataset = required('NEXT_PUBLIC_SANITY_DATASET')
const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2024-10-28'
const writeToken = required('SANITY_API_WRITE_TOKEN')

const dryRun = process.argv.includes('--dry-run')

function required(name: string): string {
  const value = process.env[name]
  if (!value) {
    console.error(`Missing required env var: ${name}`)
    process.exit(1)
  }
  return value
}

async function main() {
  const client = createClient({
    projectId,
    dataset,
    apiVersion,
    token: writeToken,
    useCdn: false,
    perspective: 'raw',
  })

  type Row = { _id: string; slug: string; language: string | null }
  const rows = await client.fetch<Row[]>(
    `*[_type in ["journal", "organ"] && defined(slug.current)] {
      _id, "slug": slug.current, language
    }`,
  )

  let touched = 0
  let skipped = 0
  let tx = client.transaction()
  let inFlight = 0
  for (const row of rows) {
    const nfc = row.slug.normalize('NFC')
    if (nfc === row.slug) {
      skipped++
      continue
    }
    touched++
    console.log(
      `${dryRun ? '[DRY-RUN]' : '[APPLY]'}  ${row._id}  lang=${row.language ?? '-'}` +
        `  bytes ${row.slug.length} -> ${nfc.length}`,
    )
    if (!dryRun) {
      tx = tx.patch(row._id, { set: { 'slug.current': nfc } })
      inFlight++
      if (inFlight >= 50) {
        await tx.commit({ visibility: 'sync' })
        tx = client.transaction()
        inFlight = 0
      }
    }
  }
  if (!dryRun && inFlight > 0) await tx.commit({ visibility: 'sync' })
  console.log(`\nDone. ${touched} patched, ${skipped} already NFC.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
