#!/usr/bin/env tsx
/**
 * One-shot: regenerate slugs on every translated journal/organ
 * sibling using the current `slugify`.
 *
 * Why: pre-NFC slug data has combining marks stripped (Devanagari,
 * Arabic, Thai, Hangul jamo, etc.), turning slugs like
 * `वीनेंदाल-जूलियानाकेर्क` into `व-न-द-ल-ज-ल-य-न-क-र-क`. The slug code
 * was fixed (preserves `\p{M}` and emits NFC) but existing siblings
 * were stamped with the broken version.
 *
 * Behaviour:
 *   - Source-language (`nl`) docs are left alone; they carry editor-
 *     curated slugs.
 *   - For every non-source sibling (`journal`/`organ`, every locale
 *     except `nl`): compute `slugify(title)` and patch `slug.current`
 *     when it differs from the stored value.
 *
 * Usage:
 *   yarn tsx scripts/regenerate-slugs.ts            # apply
 *   yarn tsx scripts/regenerate-slugs.ts --dry-run  # preview
 */

import 'dotenv/config'
import { createClient } from '@sanity/client'
import { LOCALES, type Locale } from '../core/i18n/locales'
import { slugify } from '../core/translator/slug'

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

  type Row = { _id: string; _type: string; language: Locale; slug: string; title: string }
  const rows = await client.fetch<Row[]>(
    `*[_type in ["journal", "organ"] && language != "nl" && defined(slug.current) && defined(title) && !(_id in path("drafts.**"))]
     {_id, _type, language, "slug": slug.current, title}`,
  )
  console.log(`Loaded ${rows.length} translated journal/organ sibling(s)`)

  const knownLocales = new Set<string>(LOCALES)
  let unchanged = 0
  let patched = 0
  let skippedUnknown = 0
  const samples: Array<{ id: string; before: string; after: string; locale: Locale }> = []

  for (const row of rows) {
    if (!knownLocales.has(row.language)) {
      skippedUnknown++
      continue
    }
    const next = slugify(row.title) || row.slug
    if (next === row.slug) {
      unchanged++
      continue
    }
    if (samples.length < 12) {
      samples.push({ id: row._id, before: row.slug, after: next, locale: row.language })
    }
    patched++
    if (!dryRun) {
      await client
        .patch(row._id)
        .set({ slug: { _type: 'slug', current: next } })
        .commit()
    }
  }

  console.log('\nSamples (before -> after):')
  for (const s of samples) {
    console.log(`  ${s.locale}  ${s.id}`)
    console.log(`     ${s.before}`)
    console.log(`  -> ${s.after}`)
  }

  console.log(
    `\n${dryRun ? '[DRY-RUN] ' : ''}${patched} patched, ${unchanged} already correct, ${skippedUnknown} skipped.`,
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
