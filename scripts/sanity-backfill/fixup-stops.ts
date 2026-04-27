/**
 * Targeted cleanup for the 4 docs with phantom / mis-parsed stops.
 *
 * Each fix is keyed against an existing _key in the live document so it's a
 * pure surgical patch \u2014 no risk of accidental drift if the doc has changed
 * shape since the audit.
 *
 * Dry-run by default; pass --apply to actually write.
 *
 * Usage:
 *   tsx scripts/sanity-backfill/fixup-stops.ts \
 *     --env ~/Repositories/wordpress-to-sanity-migrator/.env.local \
 *     [--apply]
 */

import { readFileSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import { createClient, type SanityClient } from '@sanity/client'

interface Args {
  env?: string
  apply: boolean
}

function parseArgs(argv: string[]): Args {
  const args: Partial<Args> = { apply: false }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--env') args.env = argv[++i]
    else if (a === '--apply') args.apply = true
  }
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
    const quoteMatch = val.match(/^(["'])(.*?)\1(\s.*)?$/)
    if (quoteMatch) val = quoteMatch[2]
    else {
      const hashIdx = val.indexOf(' #')
      if (hashIdx !== -1) val = val.slice(0, hashIdx).trim()
    }
    process.env[key] = val
  }
}

function required(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`missing env var: ${name}`)
  return v
}

const newKey = () => randomBytes(6).toString('hex')

interface Fix {
  id: string
  title: string
  description: string
  build: (client: SanityClient) => Promise<void>
}

const fixes: Fix[] = [
  // -------------------------------------------------------------------------
  // 1. Dalfsen Geref. kerk vrijg. \u2014 Nevenwerk lost 5 stops to a mid-list line break
  // -------------------------------------------------------------------------
  {
    id: 'pn7GvmYaTH5iJ6kzuqXrPJ',
    title: 'Dalfsen Geref. kerk vrijg.',
    description: 'replace Nevenwerk stops with the correct 8 (was 3 stops, source listed 8)',
    build: async (client) => {
      // The Nevenwerk register's _key on the live doc \u2014 fetched fresh.
      const doc = await client.fetch<{ disposition: any }>('*[_id == $id][0]{disposition}', {
        id: 'pn7GvmYaTH5iJ6kzuqXrPJ',
      })
      const neven = doc.disposition.registers.find((r: any) => r.name === 'Nevenwerk')
      if (!neven?._key) throw new Error('Nevenwerk register not found in Dalfsen')
      const newStops = [
        { _type: 'stop', _key: newKey(), name: 'Holpijp', pitch: "8'" },
        { _type: 'stop', _key: newKey(), name: 'Viola di Gamba', pitch: "8'" },
        { _type: 'stop', _key: newKey(), name: 'Salicet', pitch: "4'" },
        { _type: 'stop', _key: newKey(), name: 'Roerfluit', pitch: "4'" },
        { _type: 'stop', _key: newKey(), name: 'Nasart', pitch: "3'" },
        { _type: 'stop', _key: newKey(), name: 'Woudfluit', pitch: "2'" },
        { _type: 'stop', _key: newKey(), name: 'Hobo', pitch: "8'" },
        { _type: 'stop', _key: newKey(), name: 'Tremulant' },
      ]
      await client
        .patch('pn7GvmYaTH5iJ6kzuqXrPJ')
        .set({ [`disposition.registers[_key=="${neven._key}"].stops`]: newStops })
        .commit({ visibility: 'async' })
    },
  },
  // -------------------------------------------------------------------------
  // 2. Assen Jozefkerk \u2014 \"deels 1983\" is a continuation note for Voix Celeste
  // -------------------------------------------------------------------------
  {
    id: '1b2o827S21abcdyBtUwwOy',
    title: 'Assen Jozefkerk',
    description: 'merge "deels 1983" into Voix Celeste\'s note + delete phantom stop',
    build: async (client) => {
      const doc = await client.fetch<{ disposition: any }>('*[_id == $id][0]{disposition}', {
        id: '1b2o827S21abcdyBtUwwOy',
      })
      const boven = doc.disposition.registers.find((r: any) => r.name === 'Bovenwerk')
      const voix = boven.stops.find((s: any) => s.name === 'Voix Celeste')
      const phantom = boven.stops.find((s: any) => s.name === 'deels 1983')
      if (!boven?._key || !voix?._key || !phantom?._key) {
        throw new Error('expected stops not found in Assen Bovenwerk')
      }
      const newNote = (voix.note ? voix.note + ', ' : '') + 'deels 1983'
      await client
        .patch('1b2o827S21abcdyBtUwwOy')
        .set({
          [`disposition.registers[_key=="${boven._key}"].stops[_key=="${voix._key}"].note`]:
            newNote,
        })
        .unset([`disposition.registers[_key=="${boven._key}"].stops[_key=="${phantom._key}"]`])
        .commit({ visibility: 'async' })
    },
  },
  // -------------------------------------------------------------------------
  // 3. Heemse Kandelaarkerk \u2014 \"De Orgelvriend\u2026\" footnote got parsed as a stop
  // -------------------------------------------------------------------------
  {
    id: '1b2o827S21abcdyBtV4j7M',
    title: 'Heemse Kandelaarkerk',
    description: 'delete the "De Orgelvriend vermeldt..." footnote stop in Bovenwerk',
    build: async (client) => {
      const doc = await client.fetch<{ disposition: any }>('*[_id == $id][0]{disposition}', {
        id: '1b2o827S21abcdyBtV4j7M',
      })
      const boven = doc.disposition.registers.find((r: any) => r.name === 'Bovenwerk')
      const phantom = boven.stops.find((s: any) => s.name?.startsWith('De Orgelvriend'))
      if (!boven?._key || !phantom?._key) {
        throw new Error('expected phantom stop not found in Heemse Bovenwerk')
      }
      await client
        .patch('1b2o827S21abcdyBtV4j7M')
        .unset([`disposition.registers[_key=="${boven._key}"].stops[_key=="${phantom._key}"]`])
        .commit({ visibility: 'async' })
    },
  },
  // -------------------------------------------------------------------------
  // 4. Franeker Martinikerk \u2014 \"front 1842\" is a continuation of Prestant 8\u2032
  // -------------------------------------------------------------------------
  {
    id: 'v2I8xbswIO3h0NWvyL9rKC',
    title: 'Franeker Martinikerk',
    description: 'merge "front 1842" into Prestant 8\u2032 note + delete phantom',
    build: async (client) => {
      const doc = await client.fetch<{ disposition: any }>('*[_id == $id][0]{disposition}', {
        id: 'v2I8xbswIO3h0NWvyL9rKC',
      })
      const boven = doc.disposition.registers.find((r: any) => r.name === 'Bovenwerk')
      const prestant = boven.stops.find((s: any) => s.name === 'Prestant' && s.pitch === "8'")
      const phantom = boven.stops.find((s: any) => s.name === 'front 1842')
      if (!boven?._key || !prestant?._key || !phantom?._key) {
        throw new Error('expected stops not found in Franeker Bovenwerk')
      }
      const newNote = (prestant.note ? prestant.note + ', ' : '') + 'front 1842'
      await client
        .patch('v2I8xbswIO3h0NWvyL9rKC')
        .set({
          [`disposition.registers[_key=="${boven._key}"].stops[_key=="${prestant._key}"].note`]:
            newNote,
        })
        .unset([`disposition.registers[_key=="${boven._key}"].stops[_key=="${phantom._key}"]`])
        .commit({ visibility: 'async' })
    },
  },
]

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.env) loadEnvFile(args.env)

  const projectId = required('NEXT_PUBLIC_SANITY_PROJECT_ID')
  const dataset = required('NEXT_PUBLIC_SANITY_DATASET')
  const token = required('SANITY_API_WRITE_TOKEN')

  console.log(`project: ${projectId} | dataset: ${dataset}`)
  console.log(`mode:    ${args.apply ? 'APPLY (writing to Sanity)' : 'DRY-RUN (no writes)'}\n`)

  const client = createClient({
    projectId,
    dataset,
    apiVersion: '2024-10-28',
    token,
    useCdn: false,
  })

  for (const f of fixes) {
    console.log(`\u2022 ${f.id} "${f.title}"`)
    console.log(`  ${f.description}`)
    if (!args.apply) continue
    try {
      await f.build(client)
      console.log(`  \u2713 applied`)
    } catch (err: any) {
      console.error(`  \u2717 FAILED: ${err.message}`)
    }
  }

  if (!args.apply) {
    console.log('\n(no writes were performed \u2014 re-run with --apply to commit)')
  }
}

main().catch((err) => {
  console.error('FATAL:', err)
  process.exit(1)
})
