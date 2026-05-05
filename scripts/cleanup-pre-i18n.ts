/**
 * Pre-i18n dataset cleanup.
 *
 * Deletes three stale documents from the production dataset, identified by an
 * audit of the Apr 29 backup:
 *
 *   - drafts.siteSettings                    (older draft sibling, dead fields)
 *   - drafts.1b2o827S21abcdyBtUtha0          (post-typed ghost of Hoogeveen organ)
 *   - drafts.v2I8xbswIO3h0NWvyLCPIC          (blog-typed ghost of Vollenhove journal)
 *
 * Both ghosts are byte-identical to their published siblings except for `_system`
 * draft metadata; the published siblings keep the canonical content under the new
 * schema types (organ, journal). The settings draft is older than the published
 * and missing two fields the published has.
 *
 * Safety:
 *   - Pre-flight checks confirm each id exists with the expected dead-type shape
 *     and that the corresponding published canonical doc exists with the expected
 *     new type. If anything has shifted (e.g. someone promoted a draft to the new
 *     type), the script aborts with a clear message and writes nothing.
 *   - Dry-run by default. Pass --apply to actually delete.
 *   - All three deletes happen in a single client.transaction() so they're atomic.
 *
 * Usage:
 *   tsx scripts/cleanup-pre-i18n.ts --env ~/Repositories/wordpress-to-sanity-migrator/.env.local
 *   tsx scripts/cleanup-pre-i18n.ts --env <path> --apply
 */

import { createClient } from '@sanity/client'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Target {
  id: string
  expectedDraftType: 'settings' | 'post' | 'blog'
  publishedId?: string
  expectedPublishedType?: 'settings' | 'organ' | 'journal'
  rationale: string
}

const TARGETS: Target[] = [
  {
    id: 'drafts.siteSettings',
    expectedDraftType: 'settings',
    publishedId: 'siteSettings',
    expectedPublishedType: 'settings',
    rationale: 'Older draft sibling; missing scoresEditionLine + scoresNoticeBody.',
  },
  {
    id: 'drafts.1b2o827S21abcdyBtUtha0',
    expectedDraftType: 'post',
    publishedId: '1b2o827S21abcdyBtUtha0',
    expectedPublishedType: 'organ',
    rationale: 'Dead-type ghost of Hoogeveen De Opgang; 23/23 blocks identical to published organ.',
  },
  {
    id: 'drafts.v2I8xbswIO3h0NWvyLCPIC',
    expectedDraftType: 'blog',
    publishedId: 'v2I8xbswIO3h0NWvyLCPIC',
    expectedPublishedType: 'journal',
    rationale:
      'Dead-type ghost of Orgelpad Vollenhove; 15/15 blocks identical to published journal.',
  },
]

interface Args {
  env: string
  apply: boolean
}

function parseArgs(argv: string[]): Args {
  let env: string | undefined
  let apply = false
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--env') env = argv[++i]
    else if (a === '--apply') apply = true
    else if (a === '--dry-run') apply = false
    else if (a.startsWith('--')) throw new Error(`Unknown flag: ${a}`)
  }
  if (!env) {
    throw new Error('Missing --env <path-to-env-file>')
  }
  return { env: resolve(env), apply }
}

function parseEnvLine(line: string): [string, string] | null {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) return null
  const eq = trimmed.indexOf('=')
  if (eq === -1) return null
  const key = trimmed.slice(0, eq).trim()
  const raw = trimmed.slice(eq + 1).trimStart()
  let value: string
  if (raw.startsWith('"') || raw.startsWith("'")) {
    const quote = raw[0]
    const rest = raw.slice(1)
    const close = rest.indexOf(quote)
    value = close === -1 ? rest.trim() : rest.slice(0, close)
  } else {
    const hashIdx = raw.search(/\s#/)
    value = (hashIdx === -1 ? raw : raw.slice(0, hashIdx)).trim()
  }
  return [key, value]
}

function loadEnv(envPath: string): void {
  const content = readFileSync(envPath, 'utf8')
  for (const line of content.split('\n')) {
    const parsed = parseEnvLine(line)
    if (!parsed) continue
    const [key, value] = parsed
    if (!(key in process.env)) process.env[key] = value
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))
  loadEnv(args.env)

  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET
  const token = process.env.SANITY_API_WRITE_TOKEN
  if (!projectId || !dataset || !token) {
    throw new Error(
      'Required env vars missing: NEXT_PUBLIC_SANITY_PROJECT_ID, NEXT_PUBLIC_SANITY_DATASET, SANITY_API_WRITE_TOKEN',
    )
  }

  const client = createClient({
    projectId,
    dataset,
    token,
    apiVersion: '2024-01-01',
    useCdn: false,
  })

  console.log(
    `Project: ${projectId}    Dataset: ${dataset}    Mode: ${args.apply ? 'APPLY' : 'DRY-RUN'}`,
  )
  console.log('')

  const violations: string[] = []
  const planned: { id: string; type: string; rationale: string }[] = []

  for (const target of TARGETS) {
    const draft = await client.fetch<{ _id: string; _type: string } | null>(
      '*[_id == $id][0]{_id, _type}',
      { id: target.id },
    )

    if (!draft) {
      console.log(`  SKIP   ${target.id}  (already gone)`)
      continue
    }

    if (draft._type !== target.expectedDraftType) {
      violations.push(
        `  REFUSE ${target.id}: expected _type=${target.expectedDraftType!}, got ${draft._type!}`,
      )
      continue
    }

    if (target.publishedId) {
      const published = await client.fetch<{ _id: string; _type: string } | null>(
        '*[_id == $id][0]{_id, _type}',
        { id: target.publishedId },
      )
      if (!published) {
        violations.push(
          `  REFUSE ${target.id}: expected published canonical at ${target.publishedId}, not found`,
        )
        continue
      }
      if (published._type !== target.expectedPublishedType) {
        violations.push(
          `  REFUSE ${target.id}: published ${target.publishedId} has _type=${published._type!}, expected ${target.expectedPublishedType!}`,
        )
        continue
      }
    }

    console.log(
      `  ${args.apply ? 'DELETE' : 'PLAN  '} ${target.id}  (_type=${draft._type!})  -- ${target.rationale}`,
    )
    planned.push({ id: target.id, type: draft._type!, rationale: target.rationale })
  }

  if (violations.length > 0) {
    console.error('')
    console.error('Pre-flight safety violations:')
    for (const v of violations) console.error(v)
    console.error('')
    console.error('Aborting. No writes performed.')
    process.exit(1)
  }

  if (planned.length === 0) {
    console.log('')
    console.log('Nothing to do. All target docs already absent.')
    return
  }

  if (!args.apply) {
    console.log('')
    console.log(
      `Dry-run complete. ${planned.length} delete(s) would be performed. Pass --apply to execute.`,
    )
    return
  }

  console.log('')
  console.log('Committing transaction...')
  const tx = client.transaction()
  for (const p of planned) tx.delete(p.id)
  const result = await tx.commit()
  console.log(`Transaction committed: ${result.transactionId}`)
  console.log(`Documents removed: ${planned.length}`)
}

main().catch((err) => {
  console.error('Fatal:', err instanceof Error ? err.message : err)
  process.exit(1)
})
