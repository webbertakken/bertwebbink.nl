import type { Locale } from '@/core/i18n/locales'
import type { TranslationUnit } from '../types'
import { readPath, writePath } from './fields'

type AnyDoc = Record<string, unknown>

/**
 * v5+ shape produced by `sanity-plugin-internationalized-array`:
 *   `[{ _key: <uuid>, _type: '<typename>Value', language: 'nl', value: '...' }, ...]`
 *
 * We address entries by `language === locale`, NOT `_key`. Re-applying
 * an existing locale updates that entry; a new locale appends a new
 * entry with a fresh `_key` (a deterministic prefix is fine for tests).
 */
type I18nArrayEntry = {
  _key: string
  _type?: string
  language: Locale | string
  value: string
}

export type I18nArrayPathConfig = {
  /** Dotted path to the field (e.g. "blurb"). */
  path: string
  /** Plugin-generated `_type` for new entries (e.g. "internationalizedArrayStringValue"). */
  entryType: string
}

/** Find the entry for `locale`. Returns `undefined` if none. */
function findEntry(arr: I18nArrayEntry[] | undefined, locale: string): I18nArrayEntry | undefined {
  if (!arr) return undefined
  return arr.find((e) => e.language === locale)
}

/** Generate a stable-enough _key for new entries. */
function newKey(prefix: string, locale: string): string {
  return `${prefix}-${locale}-${Math.random().toString(36).slice(2, 8)}`
}

export function extractI18nArrayUnits(
  doc: AnyDoc,
  paths: I18nArrayPathConfig[],
  sourceLocale: Locale,
): TranslationUnit[] {
  const out: TranslationUnit[] = []
  for (const { path } of paths) {
    const arr = readPath(doc, path) as I18nArrayEntry[] | undefined
    const entry = findEntry(arr, sourceLocale)
    if (entry && typeof entry.value === 'string' && entry.value.trim()) {
      out.push({ id: path, sourceText: entry.value })
    }
  }
  return out
}

export function applyI18nArrayUnits(
  doc: AnyDoc,
  paths: I18nArrayPathConfig[],
  units: TranslationUnit[],
  targetLocale: Locale,
): AnyDoc {
  let result = doc
  const byId = new Map(units.map((u) => [u.id, u.sourceText]))
  for (const { path, entryType } of paths) {
    const translated = byId.get(path)
    if (translated == null) continue
    const arr = (readPath(result, path) as I18nArrayEntry[] | undefined) ?? []
    const existingIdx = arr.findIndex((e) => e.language === targetLocale)
    const nextArr = arr.slice()
    if (existingIdx >= 0) {
      nextArr[existingIdx] = { ...nextArr[existingIdx], value: translated }
    } else {
      nextArr.push({
        _key: newKey(path.replace(/[^a-z0-9]+/gi, ''), targetLocale),
        _type: entryType,
        language: targetLocale,
        value: translated,
      })
    }
    result = writePath(result, path, nextArr)
  }
  return result
}
