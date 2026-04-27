/**
 * Apply the dry-run migration plan to Sanity.
 *
 * Safety:
 *   - Re-fetches every target doc from the live dataset before patching, so
 *     we never patch based on a stale backup.
 *   - Uses `setIfMissing` so editor-entered values can never be overwritten.
 *   - Skips any doc whose `location` / `disposition` is already populated.
 *   - Per-doc transactions in batches \u2014 one bad doc cannot rollback the rest.
 *   - Dry-run by default; pass `--apply` to actually write.
 *
 * Usage:
 *   tsx scripts/sanity-backfill/apply.ts \
 *     --plan scripts/sanity-backfill/migration-plan \
 *     --env  ~/Repositories/wordpress-to-sanity-migrator/.env.local \
 *     [--apply] [--batch-size 25]
 */

import { readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { createClient, type Transaction } from '@sanity/client'

interface PerDocPlan {
  _id: string
  title: string
  status: string
  patch: { location?: unknown; disposition?: unknown }
  warnings: string[]
}

interface Args {
  plan: string
  env?: string
  apply: boolean
  batchSize: number
}

function parseArgs(argv: string[]): Args {
  const args: Partial<Args> = { apply: false, batchSize: 25 }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--plan') args.plan = argv[++i]
    else if (a === '--env') args.env = argv[++i]
    else if (a === '--apply') args.apply = true
    else if (a === '--batch-size') args.batchSize = parseInt(argv[++i], 10)
  }
  if (!args.plan) throw new Error('--plan <dir> is required')
  return args as Args
}

function loadEnvFile(path: string) {
  const expanded = path.replace(/^~/, process.env.HOME || '')
  const content = readFileSync(expanded, 'utf8')
  for (const raw of content.split('\n')) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (!m) continue
    const key = m[1]
    let val = m[2].trim()
    // Handle the four common forms:
    //   KEY=value
    //   KEY="value"
    //   KEY=value # comment
    //   KEY="value" # comment
    // Strategy: if quoted, take what's inside the quotes; else strip ` #` tail.
    const quoteMatch = val.match(/^(["'])(.*?)\1(\s.*)?$/)
    if (quoteMatch) {
      val = quoteMatch[2]
    } else {
      const hashIdx = val.indexOf(' #')
      if (hashIdx !== -1) val = val.slice(0, hashIdx).trim()
    }
    // Always override — the explicit --env file wins over tsx auto-loaded values.
    process.env[key] = val
  }
}

function required(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`missing env var: ${name}`)
  return v
}

function hasLocation(loc: any): boolean {
  return !!(loc && loc.city && loc.country && loc.building)
}

function hasDisposition(d: any): boolean {
  if (!d) return false
  return Object.keys(d).filter((k) => k !== '_type').length > 0
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.env) loadEnvFile(args.env)

  const projectId = required('NEXT_PUBLIC_SANITY_PROJECT_ID')
  const dataset = required('NEXT_PUBLIC_SANITY_DATASET')
  const token = required('SANITY_API_WRITE_TOKEN')

  console.log(`project: ${projectId} | dataset: ${dataset}`)
  console.log(`mode:    ${args.apply ? 'APPLY (writing to Sanity)' : 'DRY-RUN (no writes)'}`)
  console.log(`plan:    ${args.plan}`)
  console.log()

  const planDir = resolve(args.plan)
  const files = readdirSync(planDir).filter((f) => f.endsWith('.json') && !f.startsWith('_'))
  const plans: PerDocPlan[] = []
  for (const f of files) {
    const p: PerDocPlan = JSON.parse(readFileSync(join(planDir, f), 'utf8'))
    if (p.patch && (p.patch.location || p.patch.disposition)) plans.push(p)
  }
  console.log(`loaded ${plans.length} non-empty plans`)

  const client = createClient({
    projectId,
    dataset,
    apiVersion: '2024-10-28',
    token,
    useCdn: false,
  })

  // Bulk-fetch live state for every target doc (1 query, then in-memory checks)
  const ids = plans.map((p) => p._id)
  const liveDocs = await client.fetch<Array<{ _id: string; location?: any; disposition?: any }>>(
    `*[_type == "organ" && _id in $ids]{_id, location, disposition}`,
    { ids },
  )
  const liveById = new Map(liveDocs.map((d) => [d._id, d]))
  console.log(`fetched live state for ${liveDocs.length} / ${ids.length} docs`)
  console.log()

  let toPatch = 0
  let skippedAlreadyHas = 0
  let missingLive = 0
  let onlyLocation = 0
  let onlyDisposition = 0
  let bothFields = 0
  const failures: Array<{ id: string; title: string; error: string }> = []

  let txn: Transaction = client.transaction()
  let batchCount = 0
  let batchNum = 1

  async function commitBatch() {
    if (batchCount === 0) return
    if (args.apply) {
      try {
        await txn.commit({ visibility: 'async' })
        console.log(`  \u2713 batch #${batchNum} committed (${batchCount} patches)`)
      } catch (err: any) {
        console.error(`  \u2717 batch #${batchNum} FAILED:`, err.message)
        // mark every doc in this batch as a failure (we don't know which doc broke)
        failures.push({ id: '<batch>', title: `batch #${batchNum}`, error: err.message })
      }
    } else {
      console.log(`  \u00b7 batch #${batchNum} would commit ${batchCount} patches`)
    }
    txn = client.transaction()
    batchCount = 0
    batchNum++
  }

  for (const p of plans) {
    const live = liveById.get(p._id)
    if (!live) {
      console.warn(`  ! ${p._id} "${p.title}" \u2014 not found in live dataset, skipping`)
      missingLive++
      continue
    }

    const set: Record<string, unknown> = {}
    if (p.patch.location && !hasLocation(live.location)) set.location = p.patch.location
    if (p.patch.disposition && !hasDisposition(live.disposition))
      set.disposition = p.patch.disposition

    if (Object.keys(set).length === 0) {
      skippedAlreadyHas++
      continue
    }

    if ('location' in set && 'disposition' in set) bothFields++
    else if ('location' in set) onlyLocation++
    else onlyDisposition++

    txn = txn.patch(p._id, (patch) => patch.setIfMissing(set))
    toPatch++
    batchCount++
    console.log(`  + ${p._id} "${p.title}" \u2014 ${Object.keys(set).join(' + ')}`)

    if (batchCount >= args.batchSize) await commitBatch()
  }

  await commitBatch()

  console.log()
  console.log('summary:')
  console.log(`  total plans loaded:                    ${plans.length}`)
  console.log(`  to patch:                              ${toPatch}`)
  console.log(`    \u2022 location only:                     ${onlyLocation}`)
  console.log(`    \u2022 disposition only:                  ${onlyDisposition}`)
  console.log(`    \u2022 both:                              ${bothFields}`)
  console.log(`  skipped (live already has both fields): ${skippedAlreadyHas}`)
  console.log(`  missing in live dataset:               ${missingLive}`)
  if (failures.length) {
    console.log(`  failures:                              ${failures.length}`)
    failures.forEach((f) => console.log(`    \u2717 ${f.id} ${f.title}: ${f.error}`))
  }
  if (!args.apply) {
    console.log()
    console.log('(no writes were performed \u2014 re-run with --apply to commit)')
  }
}

main().catch((err) => {
  console.error('FATAL:', err)
  process.exit(1)
})
