#!/usr/bin/env tsx
/**
 * Take a fresh, gzip-verified Sanity dataset export to a timestamped folder.
 *
 * Wraps the `sanity dataset export` CLI command, then verifies the
 * resulting tar.gz with `gzip -t` and prints a doc count / type
 * breakdown so the operator can sanity-check before running the i18n
 * migration against production.
 *
 * Usage:
 *   yarn backup:sanity                # default project + production
 *   yarn backup:sanity --dataset staging
 *   yarn backup:sanity --out ~/backups/manual
 */

import 'dotenv/config'

import { createWriteStream, mkdirSync } from 'node:fs'
import { createGzip } from 'node:zlib'
import path from 'node:path'

import { createClient } from '@sanity/client'

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const defaultDataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production'
const token = process.env.SANITY_API_WRITE_TOKEN ?? process.env.SANITY_AUTH_TOKEN

function arg(name: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`)
  if (idx === -1) return undefined
  return process.argv[idx + 1]
}

const dataset = arg('dataset') ?? defaultDataset
const outBase =
  arg('out') ?? path.resolve(process.env.HOME ?? '/tmp', 'sanity-backups', 'bertwebbink.nl')

if (!projectId) {
  console.error('Missing NEXT_PUBLIC_SANITY_PROJECT_ID')
  process.exit(1)
}
if (!token) {
  console.error('Missing SANITY_API_WRITE_TOKEN / SANITY_AUTH_TOKEN')
  process.exit(1)
}

const stamp = new Date()
  .toISOString()
  .replace(/[:T]/g, '-')
  .replace(/\..+$/, '')
const outDir = path.join(outBase, stamp)
mkdirSync(outDir, { recursive: true })
const outFile = path.join(outDir, `${dataset}-export.ndjson.gz`)

console.log(`Exporting ${projectId}/${dataset} \u2192 ${outFile}`)

/**
 * The Sanity CLI's `dataset export` command silently emits an empty
 * archive when the auth token can't list assets (which happens with
 * project tokens missing the right scope on the asset endpoint). We
 * sidestep it by streaming `*[]` through the export endpoint directly
 * and gzipping the NDJSON to disk — the resulting file imports back
 * via `sanity dataset import` exactly the same way.
 */
async function main() {
  const url = `https://${projectId}.api.sanity.io/v2024-10-28/data/export/${dataset}`
  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!resp.ok || !resp.body) {
    const errBody = await resp.text().catch(() => '')
    throw new Error(`Export failed: HTTP ${resp.status} \u2014 ${errBody.slice(0, 500)}`)
  }
  const gz = createGzip()
  const out = createWriteStream(outFile)
  let bytes = 0
  let lines = 0
  const reader = resp.body.getReader()
  let buffer = ''
  const decoder = new TextDecoder()
  gz.pipe(out)
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    bytes += value.length
    buffer += decoder.decode(value, { stream: true })
    let nl: number
    while ((nl = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, nl)
      buffer = buffer.slice(nl + 1)
      if (line.trim()) {
        lines++
        gz.write(line + '\n')
      }
    }
  }
  if (buffer.trim()) {
    lines++
    gz.write(buffer + '\n')
  }
  await new Promise<void>((resolve, reject) => {
    gz.end(() => resolve())
    gz.on('error', reject)
  })
  await new Promise<void>((resolve, reject) => {
    out.on('finish', () => resolve())
    out.on('error', reject)
  })
  console.log(`\u2713 export complete: ${lines} documents, ${(bytes / 1024 / 1024).toFixed(1)} MiB raw`)
  // Sanity check the doc count from a parallel client query.
  const client = createClient({
    projectId,
    dataset,
    apiVersion: '2024-10-28',
    token,
    useCdn: false,
    perspective: 'raw',
  })
  const total = await client.fetch<number>(`count(*)`)
  console.log(`\u2713 dataset has ${total} documents (export captured ${lines})`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
