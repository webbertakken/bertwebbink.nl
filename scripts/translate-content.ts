#!/usr/bin/env tsx
/**
 * Batch-run the translation orchestrator from the CLI.
 *
 * Usage:
 *   yarn translate:content --id <docId>                   # one doc (debug)
 *   yarn translate:content --type journal                  # all NL journal docs
 *   yarn translate:content --type organ                    # all NL organ docs
 *   yarn translate:content --type singletons               # all 7 NL singletons
 *   yarn translate:content --all                           # everything translatable
 *   yarn translate:content --type journal --dry-run        # preview list, no calls
 *
 * Honours the same env as `/api/translate`:
 *   GOOGLE_AI_API_KEY, SANITY_API_WRITE_TOKEN, GEMINI_MODEL, TRANSLATOR_PROVIDER.
 *
 * Behaviour matches the Studio's "Publish (auto-translated)" button:
 * runs `runTranslation` against each source doc, which writes published
 * siblings (or patches `score` in place). Honours diff-aware reuse, so
 * re-running is cheap.
 */

import 'dotenv/config'

import { createClient } from '@sanity/client'

import { LOCALES, type Locale } from '../core/i18n/locales'
import { getTranslator } from '../core/translator/factory'
import { runTranslation } from '../core/translator/orchestrator'

const projectId = required('NEXT_PUBLIC_SANITY_PROJECT_ID')
const dataset = required('NEXT_PUBLIC_SANITY_DATASET')
const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2024-10-28'
const writeToken = required('SANITY_API_WRITE_TOKEN')

const SINGLETON_TYPES = [
  'about',
  'elsewhere',
  'journalPage',
  'organsPage',
  'privacy',
  'scoresPage',
  'settings',
] as const

type Mode =
  | { kind: 'id'; id: string }
  | { kind: 'type'; type: string }
  | { kind: 'all' }

function required(name: string): string {
  const value = process.env[name]
  if (!value) {
    console.error(`Missing required env var: ${name}`)
    process.exit(1)
  }
  return value
}

function parseArgs(): { mode: Mode; dryRun: boolean; targetLocales: Locale[] | undefined } {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const localesArg = pluck(args, '--locales')
  const targetLocales = localesArg
    ? (localesArg.split(',').filter((l): l is Locale =>
        (LOCALES as readonly string[]).includes(l),
      ) as Locale[])
    : undefined
  if (args.includes('--all')) return { mode: { kind: 'all' }, dryRun, targetLocales }
  const id = pluck(args, '--id')
  if (id) return { mode: { kind: 'id', id }, dryRun, targetLocales }
  const type = pluck(args, '--type')
  if (type) return { mode: { kind: 'type', type }, dryRun, targetLocales }
  console.error(
    'Usage: yarn translate:content [--id <docId> | --type <type> | --all] [--locales fr,de] [--dry-run]',
  )
  process.exit(1)
}

function pluck(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag)
  if (idx === -1) return undefined
  return args[idx + 1]
}

async function main() {
  const { mode, dryRun, targetLocales } = parseArgs()
  const client = createClient({
    projectId,
    dataset,
    apiVersion,
    token: writeToken,
    useCdn: false,
    perspective: 'raw',
  })

  const ids = await resolveDocIds(client, mode)
  console.log(`[${dryRun ? 'DRY-RUN' : 'APPLY'}] ${ids.length} document(s) to translate`)
  for (const id of ids) console.log(`  ${id}`)
  if (dryRun) return

  const translator = getTranslator()
  console.log(`Using translator: ${translator.name} / ${translator.model}`)

  const startedAt = Date.now()
  let totalTokens = 0
  let processed = 0
  for (const id of ids) {
    processed++
    process.stdout.write(`\n[${processed}/${ids.length}] ${id} ... `)
    try {
      const results = await runTranslation(client, translator, id, {
        targetLocales,
        onProgress: (event) => {
          if (event.type === 'translator:usage' && event.tokens) totalTokens += event.tokens
        },
      })
      const summary = results
        .map((r) => `${r.locale}=${r.status}${r.error ? `(${r.error})` : ''}`)
        .join(' ')
      console.log(summary)
    } catch (err) {
      console.log(`FAILED \u2014 ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const durationS = Math.round((Date.now() - startedAt) / 1000)
  console.log(
    `\nDone. ${processed} docs in ${durationS}s. Total tokens (translator-reported): ~${totalTokens}.`,
  )
}

async function resolveDocIds(
  client: ReturnType<typeof createClient>,
  mode: Mode,
): Promise<string[]> {
  if (mode.kind === 'id') return [mode.id]

  if (mode.kind === 'type') {
    if (mode.type === 'singletons') {
      return SINGLETON_TYPES.map((t) => `${t}-nl`)
    }
    if (mode.type === 'score') {
      // Field-level: every published score doc is its own translation target.
      return await client.fetch<string[]>(
        `*[_type == "score" && !(_id in path("drafts.**"))]._id`,
      )
    }
    // Doc-per-locale: only translate the published source-language (NL) docs.
    return await client.fetch<string[]>(
      `*[_type == $type && language == "nl" && !(_id in path("drafts.**"))]._id`,
      { type: mode.type },
    )
  }

  // --all: every translatable source doc.
  const ids: string[] = []
  ids.push(...SINGLETON_TYPES.map((t) => `${t}-nl`))
  ids.push(
    ...(await client.fetch<string[]>(
      `*[_type in ["journal", "organ"] && language == "nl" && !(_id in path("drafts.**"))]._id`,
    )),
  )
  ids.push(
    ...(await client.fetch<string[]>(
      `*[_type == "score" && !(_id in path("drafts.**"))]._id`,
    )),
  )
  return ids
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
