#!/usr/bin/env tsx
/**
 * One-shot: translate the 7 main route segments via Gemini and write
 * the result to `i18n/pathnames.json`.
 *
 * Specialized prompt (NOT the generic translator): we ask the LLM for
 * a SHORT URL slug given a brief semantic description, not a literal
 * sentence translation. This keeps `/de/orgeln`-shaped paths instead
 * of `/de/pfeifenorgeln-das-musikinstrument`.
 *
 * Re-runs are diff-aware: pre-existing JSON is read, only segments
 * whose source changed (or are missing for a locale) are re-translated.
 *
 * IMPORTANT: after running this, update `i18n/routing.ts` to mirror
 * the JSON literal. next-intl's typed `Link`/`Router` infer their
 * pathname union from a literal `as const` object — reading the
 * JSON at runtime would lose that. The JSON is here so the script
 * has a diff-aware source of truth across runs; routing.ts is the
 * shape next-intl actually consumes.
 *
 * Usage:
 *   yarn tsx scripts/translate-pathnames.ts
 */

import 'dotenv/config'

import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import {
  LOCALES,
  LOCALE_LABELS_EN,
  UI_DEFAULT_LOCALE,
  type Locale,
} from '@/core/i18n/locales'
import { slugify } from '@/core/translator/slug'

/**
 * Source segments. KEY is the canonical English code path; VALUE is a
 * short semantic description used to disambiguate the LLM. The LLM is
 * asked to produce a 1-2 word URL slug in each target locale, not a
 * literal translation of the description.
 */
const SOURCE_SEGMENTS: Record<string, { source: string; description: string }> = {
  organs: {
    source: 'Organs',
    description: 'Pipe organs (the musical instrument), not body organs.',
  },
  about: {
    source: 'About me',
    description: "The site author's biography page.",
  },
  elsewhere: {
    source: 'Elsewhere',
    description: 'A curated index of outbound links.',
  },
  scores: {
    source: 'Scores',
    description: 'Sheet music / printed music notation, the kind organists play from.',
  },
  privacy: {
    source: 'Privacy',
    description: 'Site privacy policy.',
  },
  journal: {
    source: 'Journal',
    description: 'A blog or diary of essays.',
  },
}

const OUT_PATH = path.resolve(__dirname, '..', 'i18n', 'pathnames.json')

type Pathnames = Record<string, Record<Locale, string>>

const apiKey = required('GOOGLE_AI_API_KEY')
const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash'

function required(name: string): string {
  const value = process.env[name]
  if (!value) {
    console.error(`Missing required env var: ${name}`)
    process.exit(1)
  }
  return value
}

/**
 * Ask Gemini for a short 1-3 word URL slug in the target language for a
 * given semantic concept. Returns the LLM's response text (we slugify
 * it afterwards).
 */
async function askForSlug(
  targetLocale: Locale,
  source: string,
  description: string,
): Promise<string> {
  const targetName = LOCALE_LABELS_EN[targetLocale]
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`
  const systemPrompt = [
    `You produce short URL slugs in ${targetName} (${targetLocale}) for a multilingual website.`,
    'Given an English label and a brief description of what the page is about, output ONE short URL slug (1-3 words) in the target language that a native speaker would expect to see in the URL.',
    'Return ONLY the slug text. No quotes, no explanation, no punctuation, no parentheses.',
    'Do not transliterate to ASCII for non-Latin scripts; use the natural script.',
    'Prefer the shortest natural form. Examples (English -> German): "Organs (pipe organs)" -> "orgeln", "About me" -> "ueber-mich", "Privacy" -> "datenschutz".',
  ].join('\n')
  const body = {
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: JSON.stringify({
              english: source,
              description,
              targetLanguage: targetName,
            }),
          },
        ],
      },
    ],
    systemInstruction: { parts: [{ text: systemPrompt }] },
    generationConfig: { temperature: 0 },
  }
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!resp.ok) {
    const text = await resp.text().catch(() => '')
    throw new Error(`Gemini HTTP ${resp.status}: ${text.slice(0, 300)}`)
  }
  const json = (await resp.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  }
  return (json.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim()
}

async function main() {
  const existing: Pathnames = await readExisting()
  console.log(`Using model: ${model}`)
  const result: Pathnames = {}

  for (const [key, { source, description }] of Object.entries(SOURCE_SEGMENTS)) {
    result[key] = (existing[key] ?? {}) as Record<Locale, string>
    // English (UI default) always uses the canonical code segment.
    result[key][UI_DEFAULT_LOCALE] = key
    const targets: Locale[] = LOCALES.filter((l) => l !== UI_DEFAULT_LOCALE) as Locale[]
    const missing = targets.filter((loc) => !result[key][loc])
    if (missing.length === 0) {
      console.log(`  ${key}: up-to-date`)
      continue
    }
    console.log(`  ${key}: translating ${missing.length} locale(s)`)
    for (const target of missing) {
      const raw = await askForSlug(target, source, description)
      const slug = slugify(raw) || key
      result[key][target] = slug
    }
  }

  await writeFile(OUT_PATH, JSON.stringify(result, null, 2) + '\n', 'utf8')
  console.log(`\nWrote ${OUT_PATH}\n`)
  for (const [key, perLocale] of Object.entries(result)) {
    console.log(`  ${key}:`)
    for (const [loc, val] of Object.entries(perLocale)) {
      console.log(`    ${loc.padEnd(3)}  /${val}`)
    }
  }
}

async function readExisting(): Promise<Pathnames> {
  try {
    const raw = await readFile(OUT_PATH, 'utf8')
    return JSON.parse(raw) as Pathnames
  } catch {
    return {}
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
