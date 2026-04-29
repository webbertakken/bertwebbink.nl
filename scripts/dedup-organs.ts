#!/usr/bin/env tsx
/**
 * One-shot: detect and delete orphan translation siblings (translated
 * docs that no `translation.metadata` doc references). These get
 * created when two `runTranslation` calls hit the same source
 * concurrently, both miss the not-yet-written sibling, and both mint
 * a fresh sibling id; only one ends up linked from the metadata doc,
 * the other is dead weight.
 *
 * NB: this script does NOT touch siblings whose slug collides with
 * another sibling that came from a DIFFERENT nl source. Those are
 * legitimate distinct docs that happen to translate to the same
 * slug (e.g. "Daarle Hervormde kerk" and "Daarle Gereformeerde
 * kerk" both -> "Daarle Reformed Church"). Resolving those needs
 * unique-slug logic on the orchestrator side, not deletion.
 *
 * Source-language (nl) documents are never deleted.
 *
 * Usage:
 *   yarn tsx scripts/dedup-organs.ts            # apply
 *   yarn tsx scripts/dedup-organs.ts --dry-run  # preview
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

  type Sibling = {
    _id: string
    _type: 'organ' | 'journal'
    language: string
    slug: string
    _createdAt: string
  }
  const siblings = await client.fetch<Sibling[]>(
    `*[_type in ["organ","journal"] && language != "nl" && defined(slug.current) && !(_id in path("drafts.**"))]
     {_id, _type, language, "slug": slug.current, _createdAt}`,
  )
  console.log(`Loaded ${siblings.length} non-source siblings`)

  // Collect every id referenced by any translation.metadata doc.
  const metaRefs = await client.fetch<string[]>(
    `array::unique(*[_type == "translation.metadata"].translations[].value._ref)`,
  )
  const linkedIds = new Set(metaRefs)
  console.log(`${linkedIds.size} sibling ids referenced by translation.metadata`)

  const orphans = siblings.filter((s) => !linkedIds.has(s._id))
  console.log(`${orphans.length} orphan sibling(s) (no metadata pointer)`)

  let deleted = 0
  for (const o of orphans) {
    console.log(`  delete: ${o._id}  ${o.language}/${o.slug}  (created ${o._createdAt})`)
    if (!dryRun) await client.delete(o._id)
    deleted++
  }

  console.log(`\n${dryRun ? '[DRY-RUN] ' : ''}deleted ${deleted} orphan sibling(s)`)

  // Surface remaining slug collisions as a separate diagnostic so
  // the user sees them but the script doesn't touch them.
  const groups = new Map<string, Sibling[]>()
  const live = siblings.filter((s) => linkedIds.has(s._id))
  for (const s of live) {
    const k = `${s._type}:${s.language}:${s.slug}`
    if (!groups.has(k)) groups.set(k, [])
    groups.get(k)!.push(s)
  }
  const collisions = [...groups.entries()].filter(([, ds]) => ds.length > 1)
  if (collisions.length > 0) {
    console.log(`\n${collisions.length} legitimate slug collision(s) remain (distinct nl sources translating to the same slug):`)
    for (const [k, docs] of collisions.slice(0, 10)) {
      console.log(`  ${k}`)
      for (const d of docs) console.log(`    ${d._id}`)
    }
    if (collisions.length > 10) console.log(`  ... (${collisions.length - 10} more)`)
    console.log('Fix: per-locale unique-slug logic in the translator orchestrator (TODO).')
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
