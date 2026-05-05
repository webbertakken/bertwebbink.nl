#!/usr/bin/env tsx
/**
 * Adds the `language: 'nl'` field to every translatable document, renames
 * legacy singleton ids (`siteAbout`, `siteSettings`, etc.) to the new
 * symmetric `{type}-nl` pattern, and converts the four `score` fields
 * (`forInstrument`, `edition`, `blurb`) from flat strings/text to v5+
 * internationalised arrays with one `nl` entry.
 *
 * Idempotent: re-runs are safe.
 *
 * Usage:
 *   yarn migrate:i18n --dry-run     # preview only
 *   yarn migrate:i18n               # apply
 *
 * Requires `SANITY_API_WRITE_TOKEN` and the standard Sanity project env
 * vars (NEXT_PUBLIC_SANITY_PROJECT_ID, NEXT_PUBLIC_SANITY_DATASET,
 * NEXT_PUBLIC_SANITY_API_VERSION).
 */

import 'dotenv/config'
import { createClient, type SanityClient, type Transaction } from '@sanity/client'
import { randomUUID } from 'node:crypto'

const projectId = required('NEXT_PUBLIC_SANITY_PROJECT_ID')
const dataset = required('NEXT_PUBLIC_SANITY_DATASET')
const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2024-10-28'
const writeToken = required('SANITY_API_WRITE_TOKEN')

const dryRun = process.argv.includes('--dry-run')

/** Singleton legacy-id -> target-locale-id map. */
const SINGLETON_RENAMES: Record<string, { type: string; newId: string }> = {
  siteAbout: { type: 'about', newId: 'about-nl' },
  siteElsewhere: { type: 'elsewhere', newId: 'elsewhere-nl' },
  siteJournalPage: { type: 'journalPage', newId: 'journalPage-nl' },
  siteOrgansPage: { type: 'organsPage', newId: 'organsPage-nl' },
  sitePrivacy: { type: 'privacy', newId: 'privacy-nl' },
  siteScoresPage: { type: 'scoresPage', newId: 'scoresPage-nl' },
  siteSettings: { type: 'settings', newId: 'settings-nl' },
}

const DOC_PER_LOCALE_TYPES = [
  'journal',
  'organ',
  'about',
  'elsewhere',
  'journalPage',
  'organsPage',
  'privacy',
  'scoresPage',
  'settings',
]

const SCORE_I18N_FIELDS: Array<{
  path: string
  entryType: 'internationalizedArrayStringValue' | 'internationalizedArrayTextValue'
}> = [
  { path: 'forInstrument', entryType: 'internationalizedArrayStringValue' },
  { path: 'edition', entryType: 'internationalizedArrayStringValue' },
  { path: 'blurb', entryType: 'internationalizedArrayTextValue' },
]

function required(name: string): string {
  const value = process.env[name]
  if (!value) {
    console.error(`Missing required env var: ${name}`)
    process.exit(1)
  }
  return value
}

function log(...args: unknown[]) {
  console.log(`[${dryRun ? 'DRY-RUN' : 'APPLY'}]`, ...args)
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

  log(`Connected to ${projectId}/${dataset}`)

  await renameSingletons(client)
  await addLanguageField(client)
  await convertScoreFields(client)

  log('Done.')
}

/**
 * Rename legacy singleton ids `site*` to `{type}-nl`, including any
 * `drafts.*` siblings, and patch references that point at the old id.
 */
async function renameSingletons(client: SanityClient) {
  log('Step 1/3: rename legacy singleton ids...')
  for (const [legacyId, { type, newId }] of Object.entries(SINGLETON_RENAMES)) {
    const existingPublished = await client.getDocument(legacyId)
    const existingDraft = await client.getDocument(`drafts.${legacyId}`)
    if (!existingPublished && !existingDraft) {
      log(`  ${legacyId}: nothing to rename`)
      continue
    }
    // If the new id is already there, just delete the legacy.
    const newPublished = await client.getDocument(newId)
    const newDraft = await client.getDocument(`drafts.${newId}`)
    if (newPublished || newDraft) {
      log(
        `  ${legacyId}: already migrated (found ${newPublished ? newId : ''}${newDraft ? ` drafts.${newId}` : ''}); deleting legacy`,
      )
      if (!dryRun) {
        const tx = client.transaction()
        if (existingPublished) tx.delete(legacyId)
        if (existingDraft) tx.delete(`drafts.${legacyId}`)
        await tx.commit({ visibility: 'sync' })
      }
      continue
    }
    log(`  ${legacyId} -> ${newId}`)
    if (dryRun) continue
    const tx = client.transaction()
    if (existingPublished) {
      tx.create({
        ...stripSystemFields(existingPublished),
        _id: newId,
        _type: type,
        language: 'nl',
      })
      tx.delete(legacyId)
    }
    if (existingDraft) {
      tx.create({
        ...stripSystemFields(existingDraft),
        _id: `drafts.${newId}`,
        _type: type,
        language: 'nl',
      })
      tx.delete(`drafts.${legacyId}`)
    }
    await tx.commit({ visibility: 'sync' })
  }
}

/**
 * Set `language: 'nl'` on every document-per-locale doc that's missing
 * it. Skips docs that already have a `language` field set.
 */
async function addLanguageField(client: SanityClient) {
  log('Step 2/3: add `language: nl` to document-per-locale docs...')
  for (const type of DOC_PER_LOCALE_TYPES) {
    const docs = await client.fetch<Array<{ _id: string; language: string | null }>>(
      `*[_type == $type]{ _id, language }`,
      { type },
    )
    let touched = 0
    let skipped = 0
    let tx: Transaction | null = null
    for (const doc of docs) {
      if (doc.language) {
        skipped++
        continue
      }
      touched++
      log(`  patch ${doc._id} { language: 'nl' }`)
      if (!dryRun) {
        if (!tx) tx = client.transaction()
        tx.patch(doc._id, { set: { language: 'nl' } })
      }
    }
    if (!dryRun && tx) await tx.commit({ visibility: 'sync' })
    log(`  ${type}: patched ${touched}, already-set ${skipped}`)
  }
}

/**
 * Convert flat `score.forInstrument` / `score.edition` / `score.blurb`
 * fields into v5+ internationalised arrays with one `nl` entry.
 */
async function convertScoreFields(client: SanityClient) {
  log('Step 3/3: convert score fields to internationalised arrays...')
  const scores = await client.fetch<Array<Record<string, unknown>>>(`*[_type == "score"]`)
  let touched = 0
  let skipped = 0
  let tx: Transaction | null = null
  for (const doc of scores) {
    const set: Record<string, unknown> = {}
    let needs = false
    for (const { path, entryType } of SCORE_I18N_FIELDS) {
      const current = doc[path]
      if (Array.isArray(current)) continue // already an i18n array
      if (current == null || current === '') continue
      if (typeof current !== 'string') continue
      set[path] = [
        {
          _key: randomUUID().slice(0, 8),
          _type: entryType,
          language: 'nl',
          value: current,
        },
      ]
      needs = true
    }
    if (!needs) {
      skipped++
      continue
    }
    touched++
    log(`  patch score ${doc._id} fields=${Object.keys(set).join(',')}`)
    if (!dryRun) {
      if (!tx) tx = client.transaction()
      tx.patch(doc._id as string, { set })
    }
  }
  if (!dryRun && tx) await tx.commit({ visibility: 'sync' })
  log(`  scores: converted ${touched}, already-converted ${skipped}`)
}

function stripSystemFields(doc: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(doc)) {
    if (k === '_id' || k === '_rev' || k === '_createdAt' || k === '_updatedAt') continue
    out[k] = v
  }
  return out
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
