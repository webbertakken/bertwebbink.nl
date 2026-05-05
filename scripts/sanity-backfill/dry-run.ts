/**
 * Dry-run: read the local Sanity backup, run parsers over every organ doc
 * that's missing location / disposition, and write a per-doc patch plan plus
 * a summary report.  No Sanity writes happen here — see `apply.ts` for that.
 *
 * Usage:
 *   tsx scripts/sanity-backfill/dry-run.ts \
 *     --backup ~/sanity-backups/bertwebbink.nl/<TS>/organs.json \
 *     --out scripts/sanity-backfill/migration-plan
 */

import { randomBytes } from 'node:crypto'
import { readFileSync, mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs'
import { join, resolve } from 'node:path'
import {
  parseLocation,
  parseDispositionFromContent,
  type ParsedDisposition,
  type Warning,
} from './parsers'
import { parseDispositionFromWpHtml } from './wp-html'

function newKey(): string {
  return randomBytes(6).toString('hex')
}

// Add `_type` + `_key` to every array-of-objects member, matching the schema.
function sanityifyDisposition(d: ParsedDisposition): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  if (d.manuals !== undefined) out.manuals = d.manuals
  if (d.stops !== undefined) out.stops = d.stops
  out.registers = d.registers.map((kb) => ({
    _type: 'register',
    _key: newKey(),
    name: kb.name,
    ...(kb.range ? { range: kb.range } : {}),
    stops: kb.stops.map((s) => ({
      _type: 'stop',
      _key: newKey(),
      name: s.name,
      ...(s.pitch ? { pitch: s.pitch } : {}),
      ...(s.note ? { note: s.note } : {}),
    })),
  }))
  out.couplings = d.couplings.map((c) => ({
    _type: 'coupling',
    _key: newKey(),
    name: c.name,
    ...(c.note ? { note: c.note } : {}),
  }))
  out.accessories = d.accessories.map((a) => ({
    _type: 'accessory',
    _key: newKey(),
    name: a.name,
    ...(a.note ? { note: a.note } : {}),
  }))
  return out
}

interface Args {
  backup: string
  out: string
  wpSource?: string
}

interface WpEntry {
  original?: { post_title?: string; post_content?: string }
}

function parseArgs(argv: string[]): Args {
  const args: Partial<Args> = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--backup') args.backup = argv[++i]
    else if (a === '--out') args.out = argv[++i]
    else if (a === '--wp-source') args.wpSource = argv[++i]
  }
  if (!args.backup) throw new Error('--backup <path/to/organs.json> is required')
  if (!args.out) throw new Error('--out <dir> is required')
  return args as Args
}

interface OrganDoc {
  _id: string
  _type: string
  title: string
  date?: string
  content?: any[]
  location?: any
  disposition?: any
  coverImage?: any
  builder?: string
  year?: number
}

interface PerDocPlan {
  _id: string
  title: string
  date?: string
  alreadyHas: { location: boolean; disposition: boolean }
  patch: Record<string, unknown>
  warnings: Warning[]
  status: 'skipped-already-done' | 'planned' | 'planned-with-warnings' | 'no-changes' | 'failed'
}

function hasDisposition(d: OrganDoc): boolean {
  if (!d.disposition) return false
  const keys = Object.keys(d.disposition).filter((k) => k !== '_type')
  return keys.length > 0
}

function hasLocation(d: OrganDoc): boolean {
  return !!(d.location && d.location.city && d.location.country && d.location.building)
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  const { backup, out } = args
  const backupPath = resolve(backup.replace(/^~/, process.env.HOME || ''))
  const outDir = resolve(out)

  if (!existsSync(backupPath)) {
    throw new Error(`backup file not found: ${backupPath}`)
  }
  if (existsSync(outDir)) rmSync(outDir, { recursive: true, force: true })
  mkdirSync(outDir, { recursive: true })

  const organs: OrganDoc[] = JSON.parse(readFileSync(backupPath, 'utf8'))
  console.log(`loaded ${organs.length} organ docs from ${backupPath}`)

  let wpByTitle: Map<string, WpEntry> | null = null
  if (args.wpSource) {
    const wpPath = resolve(args.wpSource.replace(/^~/, process.env.HOME || ''))
    if (!existsSync(wpPath)) throw new Error(`wp-source file not found: ${wpPath}`)
    const wp: WpEntry[] = JSON.parse(readFileSync(wpPath, 'utf8'))
    wpByTitle = new Map()
    for (const e of wp) {
      const t = e.original?.post_title
      if (t) wpByTitle.set(t, e)
    }
    console.log(`loaded ${wp.length} WP entries from ${wpPath}`)
  }

  const plans: PerDocPlan[] = []
  let parsedClean = 0
  let parsedWithWarnings = 0
  let failed = 0
  let skipped = 0

  for (const doc of organs) {
    const alreadyHas = { location: hasLocation(doc), disposition: hasDisposition(doc) }
    const warnings: Warning[] = []
    const patch: Record<string, unknown> = {}

    if (alreadyHas.location && alreadyHas.disposition) {
      plans.push({
        _id: doc._id,
        title: doc.title,
        date: doc.date,
        alreadyHas,
        patch,
        warnings,
        status: 'skipped-already-done',
      })
      skipped++
      continue
    }

    if (!alreadyHas.location) {
      const { value, warnings: w } = parseLocation(doc.title)
      warnings.push(...w.map((x) => `[location] ${x}`))
      if (value) patch.location = value
    }

    if (!alreadyHas.disposition) {
      const { value, warnings: w } = parseDispositionFromContent(doc.content)
      warnings.push(...w.map((x) => `[disposition] ${x}`))
      if (value) {
        patch.disposition = sanityifyDisposition(value)
      } else if (wpByTitle) {
        // Fallback: try the original WordPress HTML — some posts had a <table>
        // disposition that the WP→Sanity conversion dropped.
        const wpEntry = wpByTitle.get(doc.title)
        if (wpEntry?.original?.post_content) {
          const { value: wpValue, warnings: ww } = parseDispositionFromWpHtml(
            wpEntry.original.post_content,
          )
          if (wpValue) {
            warnings.push('[disposition] recovered from WP <table> source')
            ww.forEach((x) => warnings.push(`[disposition][wp] ${x}`))
            patch.disposition = sanityifyDisposition(wpValue)
          }
        }
      }
    }

    let status: PerDocPlan['status']
    if (Object.keys(patch).length === 0) {
      status = 'failed'
      failed++
    } else if (warnings.length > 0) {
      status = 'planned-with-warnings'
      parsedWithWarnings++
    } else {
      status = 'planned'
      parsedClean++
    }

    plans.push({
      _id: doc._id,
      title: doc.title,
      date: doc.date,
      alreadyHas,
      patch,
      warnings,
      status,
    })
  }

  // Per-doc files (only for ones with planned changes or failures)
  for (const plan of plans) {
    if (plan.status === 'skipped-already-done') continue
    const safeId = plan._id.replace(/[^a-zA-Z0-9_-]/g, '_')
    writeFileSync(join(outDir, `${safeId}.json`), JSON.stringify(plan, null, 2))
  }

  // Summary
  const summaryLines: string[] = []
  summaryLines.push('# Sanity organ backfill — dry-run summary', '')
  summaryLines.push(`Backup: \`${backupPath}\``)
  summaryLines.push(`Total organ docs: **${organs.length}**`)
  summaryLines.push('')
  summaryLines.push('| Status | Count |')
  summaryLines.push('|---|---|')
  summaryLines.push(`| Skipped (already has location + disposition) | ${skipped} |`)
  summaryLines.push(`| Planned, clean | ${parsedClean} |`)
  summaryLines.push(`| Planned, with warnings | ${parsedWithWarnings} |`)
  summaryLines.push(`| Failed (no patch produced) | ${failed} |`)
  summaryLines.push('')

  const failedPlans = plans.filter((p) => p.status === 'failed')
  if (failedPlans.length) {
    summaryLines.push('## Failed', '')
    for (const p of failedPlans) {
      summaryLines.push(`- \`${p._id}\` — ${p.title}`)
      for (const w of p.warnings) summaryLines.push(`    - ${w}`)
    }
    summaryLines.push('')
  }

  const warnPlans = plans.filter((p) => p.status === 'planned-with-warnings')
  if (warnPlans.length) {
    summaryLines.push('## Planned with warnings', '')
    for (const p of warnPlans) {
      summaryLines.push(`- \`${p._id}\` — ${p.title}`)
      for (const w of p.warnings) summaryLines.push(`    - ${w}`)
    }
    summaryLines.push('')
  }

  const cleanPlans = plans.filter((p) => p.status === 'planned')
  if (cleanPlans.length) {
    summaryLines.push('## Planned, clean', '')
    for (const p of cleanPlans) summaryLines.push(`- \`${p._id}\` — ${p.title}`)
    summaryLines.push('')
  }

  writeFileSync(join(outDir, '_summary.md'), summaryLines.join('\n'))

  console.log(`\nresults:`)
  console.log(`  skipped (already done):       ${skipped}`)
  console.log(`  planned, clean:               ${parsedClean}`)
  console.log(`  planned, with warnings:       ${parsedWithWarnings}`)
  console.log(`  failed (no patch produced):   ${failed}`)
  console.log(`\nwrote ${plans.length - skipped} per-doc plan files + _summary.md to ${outDir}`)
}

main()
