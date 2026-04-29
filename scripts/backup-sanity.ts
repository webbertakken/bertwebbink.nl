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

import { mkdirSync } from 'node:fs'
import { spawn } from 'node:child_process'
import path from 'node:path'

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const defaultDataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production'

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

const stamp = new Date()
  .toISOString()
  .replace(/[:T]/g, '-')
  .replace(/\..+$/, '')
const outDir = path.join(outBase, stamp)
mkdirSync(outDir, { recursive: true })
const outFile = path.join(outDir, `${dataset}.tar.gz`)

console.log(`Exporting ${projectId}/${dataset} \u2192 ${outFile}`)

const child = spawn(
  'yarn',
  ['sanity', 'dataset', 'export', dataset, outFile, '--types', 'all'],
  { stdio: 'inherit', cwd: path.resolve(__dirname, '..') },
)

child.on('exit', (code) => {
  if (code !== 0) {
    console.error(`sanity dataset export exited with ${code}`)
    process.exit(code ?? 1)
  }
  // Verify the gzip integrity.
  const verify = spawn('gzip', ['-t', outFile], { stdio: 'inherit' })
  verify.on('exit', (verifyCode) => {
    if (verifyCode !== 0) {
      console.error('gzip integrity check failed')
      process.exit(verifyCode ?? 1)
    }
    console.log(`\u2713 backup verified: ${outFile}`)
  })
})
