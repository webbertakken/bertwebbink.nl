import type { SanityClient } from '@sanity/client'

import { LOCALES, type Locale } from '@/core/i18n/locales'

import { combineTranslations, diffUnits } from './diff'
import { applyTranslatedSlug } from './slug'
import type { Translator } from './types'
import { applyAll, extractAll } from './walkers/registry'

const SINGLETON_TYPES = new Set([
  'about',
  'elsewhere',
  'journalPage',
  'organsPage',
  'privacy',
  'scoresPage',
  'settings',
])

const DOC_PER_LOCALE_TYPES = new Set([
  ...SINGLETON_TYPES,
  'journal',
  'organ',
])

/** Document-level types are translated as document-per-locale; `score` is field-level. */
export function translatableTypes(): string[] {
  return [...DOC_PER_LOCALE_TYPES, 'score']
}

export function isTranslatableType(type: string): boolean {
  return DOC_PER_LOCALE_TYPES.has(type) || type === 'score'
}

export type PerLocaleStatus =
  | 'created'
  | 'updated'
  | 'unchanged'
  | 'skipped'
  | 'failed'

export type PerLocaleResult = {
  locale: Locale
  docId: string
  status: PerLocaleStatus
  error?: string
}

export type TranslateOptions = {
  /** Override target locales; defaults to every locale except the source. */
  targetLocales?: Locale[]
  /** Optional glossary applied to every locale. */
  glossary?: Record<string, string>
  /** Per-step progress reporter (used by the SSE stream). */
  onProgress?: (event: ProgressEvent) => void
}

export type ProgressEvent =
  | { type: 'locale:start'; locale: Locale }
  | { type: 'locale:done'; result: PerLocaleResult }
  | { type: 'translator:usage'; locale: Locale; durationMs?: number; tokens?: number }

type SourceContext = {
  doc: Record<string, unknown>
  type: string
  sourceLocale: Locale
  /** For document-per-locale, the array of sibling docs by locale. */
  siblings?: Map<Locale, Record<string, unknown>>
}

/**
 * Translate `sourceDoc` into `targetLocales` using `translator`. Runs
 * diff-aware against any existing sibling docs found via the
 * `translation.metadata` linking document. For `score`, the same doc is
 * patched with internationalised-array entries per target locale.
 */
export async function runTranslation(
  client: SanityClient,
  translator: Translator,
  sourceDocId: string,
  options: TranslateOptions = {},
): Promise<PerLocaleResult[]> {
  const sourceDoc = await client.getDocument(sourceDocId)
  if (!sourceDoc) throw new Error(`Source document not found: ${sourceDocId}`)
  const sourceType = (sourceDoc as { _type: string })._type
  if (!isTranslatableType(sourceType)) {
    throw new Error(`Type "${sourceType}" is not translatable`)
  }

  const sourceLocale = (sourceDoc as { language?: Locale }).language ?? 'nl'
  const targets = (options.targetLocales ?? LOCALES.filter((l) => l !== sourceLocale)) as Locale[]

  const ctx: SourceContext = {
    doc: sourceDoc as Record<string, unknown>,
    type: sourceType,
    sourceLocale,
  }

  if (DOC_PER_LOCALE_TYPES.has(sourceType)) {
    ctx.siblings = await loadSiblings(client, sourceDocId)
  }

  const results: PerLocaleResult[] = []
  for (const target of targets) {
    options.onProgress?.({ type: 'locale:start', locale: target })
    let result: PerLocaleResult
    try {
      if (sourceType === 'score') {
        result = await translateScoreInPlace(client, translator, ctx, target, options)
      } else {
        result = await translateDocPerLocale(client, translator, ctx, target, options)
      }
    } catch (err) {
      result = {
        locale: target,
        docId: 'unknown',
        status: 'failed',
        /* v8 ignore next */
        error: err instanceof Error ? err.message : String(err),
      }
    }
    options.onProgress?.({ type: 'locale:done', result })
    results.push(result)
  }
  return results
}

/**
 * For document-per-locale: translate the source doc to each target
 * locale and write/update the sibling, linking via translation.metadata.
 */
async function translateDocPerLocale(
  client: SanityClient,
  translator: Translator,
  ctx: SourceContext,
  target: Locale,
  options: TranslateOptions,
): Promise<PerLocaleResult> {
  const sourceDoc = ctx.doc
  const sourceType = ctx.type
  const sourceLocale = ctx.sourceLocale
  // translateDocPerLocale is only invoked for doc-per-locale types, which
  // always have a populated `siblings` map (see runTranslation).
  const siblings = ctx.siblings as Map<Locale, Record<string, unknown>>
  const previousSibling = siblings.get(target)
  const previousSiblingId = previousSibling?._id as string | undefined
  const sourceRev = sourceDoc._rev as string
  const sourceUpdatedAt = (sourceDoc._updatedAt as string | undefined) ?? ''

  // No-op when the previous sibling is already up-to-date.
  if (
    previousSibling &&
    previousSiblingId &&
    previousSibling._translationSourceRev != null &&
    previousSibling._translationSourceRev === sourceRev
  ) {
    return { locale: target, docId: previousSiblingId, status: 'unchanged' }
  }

  const { units } = extractAll(sourceDoc, sourceType, sourceLocale)
  const previousSourceUnits = previousSibling
    ? extractAll(
        // The sibling's "previous source" is captured via _translationSourceUnits if we ever set it,
        // but to keep things simple we re-extract from the previous sibling's *own* fields.
        // For document-per-locale, each sibling stores its own value of every field, so we
        // diff our current source against the previously-translated text \u2014 simpler and good enough.
        previousSibling,
        sourceType,
        sourceLocale,
      ).units
    : undefined
  // The "previous translation" in the registry-output sense is what's already
  // sitting in the sibling doc's fields.
  const previousTranslation = previousSibling
    ? extractAll(previousSibling, sourceType, target).units
    : undefined

  const { changed, reuseTranslated } = diffUnits(units, previousSourceUnits, previousTranslation)

  let translatedFromLLM: import('./types').TranslationUnit[] = []
  if (changed.length > 0) {
    const result = await translator.translate({
      sourceLocale,
      targetLocale: target,
      units: changed,
      previousUnits: previousSourceUnits,
      previousTranslation,
      glossary: options.glossary,
      documentContext: {
        type: sourceType,
        title: sourceDoc.title as string | undefined,
        shape: 'mixed',
      },
    })
    translatedFromLLM = result.units
    options.onProgress?.({
      type: 'translator:usage',
      locale: target,
      durationMs: result.usage?.durationMs,
      tokens: result.usage?.totalTokens,
    })
  }
  const finalUnits = combineTranslations(units, translatedFromLLM, reuseTranslated)

  const targetId = SINGLETON_TYPES.has(sourceType)
    ? `${sourceType}-${target}`
    : (previousSiblingId ?? `${sourceType}-${target}-${cryptoRandomShort()}`)

  // Build the target doc body: start from a deep clone of the source,
  // apply translations, swap language + id + provenance, derive slug.
  const baseDoc = applyAll(sourceDoc, sourceType, finalUnits, target) as Record<string, unknown>
  const slugged =
    sourceType === 'journal' || sourceType === 'organ'
      ? applyTranslatedSlug(baseDoc, previousSibling, finalUnits)
      : baseDoc
  const targetDoc: Record<string, unknown> = stripSystemFields(slugged)
  targetDoc._id = targetId
  targetDoc._type = sourceType
  targetDoc.language = target
  targetDoc._translationSourceRev = sourceRev
  targetDoc._translationSourceUpdatedAt = sourceUpdatedAt

  // Use createOrReplace so re-runs are idempotent and predictable.
  await client.createOrReplace(targetDoc as never)

  // Update the translation.metadata document linking source + sibling.
  await ensureTranslationMetadata(client, listSiblingIds(siblings), {
    sourceId: sourceDoc._id as string,
    sourceLocale,
    siblingId: targetId,
    siblingLocale: target,
    schemaType: sourceType,
  })

  return {
    locale: target,
    docId: targetId,
    status: previousSiblingId ? 'updated' : 'created',
  }
}

/**
 * For `score`: patch the single doc with internationalised-array entries
 * for the target locale.
 */
async function translateScoreInPlace(
  client: SanityClient,
  translator: Translator,
  ctx: SourceContext,
  target: Locale,
  options: TranslateOptions,
): Promise<PerLocaleResult> {
  const { units } = extractAll(ctx.doc, ctx.type, ctx.sourceLocale)
  if (units.length === 0) {
    return { locale: target, docId: ctx.doc._id as string, status: 'skipped' }
  }
  const provenanceMap =
    (ctx.doc._translationProvenance as Record<string, { sourceRev?: string }>) ?? {}
  const previousProvenance = provenanceMap[target]
  const sourceRev = ctx.doc._rev as string

  if (previousProvenance?.sourceRev === sourceRev) {
    return { locale: target, docId: ctx.doc._id as string, status: 'unchanged' }
  }

  const result = await translator.translate({
    sourceLocale: ctx.sourceLocale,
    targetLocale: target,
    units,
    glossary: options.glossary,
    documentContext: { type: ctx.type, shape: 'field-level' },
  })
  options.onProgress?.({
    type: 'translator:usage',
    locale: target,
    durationMs: result.usage?.durationMs,
    tokens: result.usage?.totalTokens,
  })

  const next = applyAll(ctx.doc, ctx.type, result.units, target) as Record<string, unknown>
  const provenance =
    (ctx.doc._translationProvenance as Record<string, unknown> | undefined) ?? {}
  next._translationProvenance = {
    ...provenance,
    [target]: {
      sourceRev,
      updatedAt: ctx.doc._updatedAt ?? new Date().toISOString(),
    },
  }
  await client.createOrReplace({ ...next, _id: ctx.doc._id as string } as never)
  return {
    locale: target,
    docId: ctx.doc._id as string,
    status: previousProvenance ? 'updated' : 'created',
  }
}

/**
 * Find every sibling translation linked to the source document via the
 * `translation.metadata` documents.
 */
async function loadSiblings(
  client: SanityClient,
  sourceDocId: string,
): Promise<Map<Locale, Record<string, unknown>>> {
  type MetadataRow = {
    translations: Array<{ _key: string; language: Locale; value: { _ref: string } }>
  }
  const rows = await client.fetch<MetadataRow[]>(
    `*[_type == "translation.metadata" && references($id)]`,
    { id: sourceDocId },
  )
  const out = new Map<Locale, Record<string, unknown>>()
  for (const row of rows) {
    for (const t of row.translations) {
      const ref = t.value?._ref
      if (!ref) continue
      const sibling = await client.getDocument(ref)
      if (sibling) out.set(t.language, sibling as Record<string, unknown>)
    }
  }
  // Also include the source doc itself.
  const source = await client.getDocument(sourceDocId)
  if (source) {
    const lang =
      (source as { language?: Locale }).language ?? ('nl' as Locale)
    out.set(lang, source as Record<string, unknown>)
  }
  return out
}

function listSiblingIds(siblings: Map<Locale, Record<string, unknown>>): string[] {
  const ids: string[] = []
  for (const sibling of siblings.values()) {
    const id = sibling._id as string | undefined
    if (id) ids.push(id)
  }
  return ids
}

/**
 * Ensure a `translation.metadata` doc exists linking source + sibling.
 * Idempotent: re-runs leave it unchanged.
 */
async function ensureTranslationMetadata(
  client: SanityClient,
  knownIds: string[],
  args: {
    sourceId: string
    sourceLocale: Locale
    siblingId: string
    siblingLocale: Locale
    schemaType: string
  },
): Promise<void> {
  // Fetch (or build) the metadata doc.
  type MetadataDoc = {
    _id: string
    _type: 'translation.metadata'
    schemaTypes?: string[]
    translations: Array<{
      _key: string
      _type: 'internationalizedArrayReferenceValue'
      language: Locale
      value: { _ref: string; _type: 'reference' }
    }>
  }
  const existing = await client.fetch<MetadataDoc | null>(
    `*[_type == "translation.metadata" && references($id)][0]`,
    { id: args.sourceId },
  )
  if (existing) {
    const existingIdx = existing.translations.findIndex(
      (t) => t.language === args.siblingLocale,
    )
    if (existingIdx >= 0 && existing.translations[existingIdx].value._ref === args.siblingId) {
      return // already correct
    }
    const translations = existing.translations.slice()
    if (existingIdx >= 0) {
      translations[existingIdx] = {
        ...translations[existingIdx],
        value: { _ref: args.siblingId, _type: 'reference' },
      }
    } else {
      translations.push({
        _key: cryptoRandomShort(),
        _type: 'internationalizedArrayReferenceValue',
        language: args.siblingLocale,
        value: { _ref: args.siblingId, _type: 'reference' },
      })
    }
    await client.patch(existing._id).set({ translations }).commit()
    return
  }
  // Build a fresh metadata doc with both source and sibling translations.
  const doc: MetadataDoc = {
    _id: `translation.metadata.${cryptoRandomShort()}`,
    _type: 'translation.metadata',
    schemaTypes: [args.schemaType],
    translations: [
      {
        _key: cryptoRandomShort(),
        _type: 'internationalizedArrayReferenceValue',
        language: args.sourceLocale,
        value: { _ref: args.sourceId, _type: 'reference' },
      },
      {
        _key: cryptoRandomShort(),
        _type: 'internationalizedArrayReferenceValue',
        language: args.siblingLocale,
        value: { _ref: args.siblingId, _type: 'reference' },
      },
    ],
  }
  // We don't need knownIds at create time; the metadata doc references siblings
  // via `value._ref`, and Sanity's `references()` traversal picks them up.
  void knownIds
  await client.create(doc as never)
}

function stripSystemFields(doc: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(doc)) {
    if (k === '_id' || k === '_rev' || k === '_createdAt' || k === '_updatedAt') continue
    out[k] = v
  }
  return out
}

function cryptoRandomShort(): string {
  // Uniform short id; not cryptographically meaningful.
  return Math.random().toString(36).slice(2, 10)
}


