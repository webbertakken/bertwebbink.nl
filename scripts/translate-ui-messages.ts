#!/usr/bin/env tsx
/**
 * Re-translate `messages/{locale}.json` from `messages/en.json` for every
 * non-English locale, diff-aware: untouched keys are preserved verbatim,
 * keys that changed since the last sync are sent to the translator.
 *
 * Manual edits to a locale file are detected by comparing the current EN
 * value against the sidecar `messages/.last-seen-en.json` snapshot \u2014
 * if EN hasn't changed for a key but the locale's value differs from
 * what the script would produce, treat it as manual and skip.
 *
 * Usage:
 *   yarn translate:ui            # all non-English locales
 *   yarn translate:ui --locales fr,de
 */

import 'dotenv/config'

import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import {
  LOCALES,
  UI_DEFAULT_LOCALE,
  type Locale,
} from '@/core/i18n/locales'
import { getTranslator } from '@/core/translator/factory'
import type { TranslationUnit } from '@/core/translator/types'

const ROOT = path.resolve(__dirname, '..')
const MESSAGES_DIR = path.join(ROOT, 'messages')
const SIDECAR = path.join(MESSAGES_DIR, '.last-seen-en.json')

type Json = string | number | boolean | null | { [k: string]: Json } | Json[]

function flatten(obj: Json, prefix = ''): Map<string, string> {
  const out = new Map<string, string>()
  if (obj == null || typeof obj !== 'object' || Array.isArray(obj)) return out
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (typeof v === 'string') out.set(key, v)
    else if (v && typeof v === 'object' && !Array.isArray(v)) {
      for (const [nk, nv] of flatten(v, key)) out.set(nk, nv)
    }
  }
  return out
}

function unflatten(map: Map<string, string>): Json {
  const out: Record<string, Json> = {}
  for (const [keyPath, value] of map) {
    const parts = keyPath.split('.')
    let cursor: Record<string, Json> = out
    for (let i = 0; i < parts.length - 1; i++) {
      const segment = parts[i]
      const next = cursor[segment]
      if (next && typeof next === 'object' && !Array.isArray(next)) {
        cursor = next as Record<string, Json>
      } else {
        const nested: Record<string, Json> = {}
        cursor[segment] = nested
        cursor = nested
      }
    }
    cursor[parts[parts.length - 1]] = value
  }
  return out
}

async function loadMessages(locale: Locale): Promise<Map<string, string>> {
  const filePath = path.join(MESSAGES_DIR, `${locale}.json`)
  try {
    const raw = await readFile(filePath, 'utf8')
    return flatten(JSON.parse(raw))
  } catch {
    return new Map()
  }
}

async function loadSidecar(): Promise<Map<string, string>> {
  try {
    const raw = await readFile(SIDECAR, 'utf8')
    return flatten(JSON.parse(raw))
  } catch {
    return new Map()
  }
}

async function saveMessages(locale: Locale, messages: Map<string, string>) {
  const json = unflatten(messages)
  const filePath = path.join(MESSAGES_DIR, `${locale}.json`)
  await writeFile(filePath, JSON.stringify(json, null, 2) + '\n', 'utf8')
}

async function main() {
  const args = process.argv.slice(2)
  const localesArg = (() => {
    const idx = args.indexOf('--locales')
    if (idx === -1) return null
    return args[idx + 1]
  })()
  const requestedLocales = localesArg
    ? (localesArg.split(',').filter((l) => LOCALES.includes(l as Locale)) as Locale[])
    : (LOCALES.filter((l) => l !== UI_DEFAULT_LOCALE) as Locale[])

  const en = await loadMessages(UI_DEFAULT_LOCALE)
  if (en.size === 0) {
    console.error('messages/en.json is empty or missing')
    process.exit(1)
  }
  const lastSeen = await loadSidecar()
  const translator = getTranslator()

  for (const locale of requestedLocales) {
    if (locale === UI_DEFAULT_LOCALE) continue
    console.log(`\n== ${locale} ==`)
    const existing = await loadMessages(locale)
    const out = new Map(existing)
    const changedKeys: string[] = []
    const newKeys: string[] = []
    for (const [key, currentEn] of en) {
      const previousEn = lastSeen.get(key)
      const localeValue = existing.get(key)
      if (!localeValue) {
        newKeys.push(key)
        continue
      }
      if (previousEn == null) {
        // No record \u2014 first run; treat as new.
        newKeys.push(key)
        continue
      }
      if (previousEn === currentEn) {
        // English hasn't changed; keep whatever's there (could be manual).
        continue
      }
      // English changed; send for retranslation.
      changedKeys.push(key)
    }
    const toTranslate = [...newKeys, ...changedKeys]
    if (toTranslate.length === 0) {
      console.log('  up-to-date, nothing to do')
      continue
    }
    console.log(`  ${newKeys.length} new + ${changedKeys.length} changed key(s)`)
    const units: TranslationUnit[] = toTranslate.map((id) => ({
      id,
      sourceText: en.get(id)!,
    }))
    const result = await translator.translate({
      sourceLocale: UI_DEFAULT_LOCALE,
      targetLocale: locale,
      units,
      documentContext: { type: 'ui-strings', shape: 'field-level' },
    })
    for (const unit of result.units) {
      out.set(unit.id, unit.sourceText)
    }
    await saveMessages(locale, out)
    console.log(`  wrote messages/${locale}.json`)
  }

  // Snapshot the current en.json as the new "last seen" baseline.
  await writeFile(SIDECAR, JSON.stringify(unflatten(en), null, 2) + '\n', 'utf8')
  console.log('\nSidecar messages/.last-seen-en.json updated.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
