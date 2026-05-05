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

const DOC_PER_LOCALE_TYPES = new Set([...SINGLETON_TYPES, 'journal', 'organ'])

/** Document-level types are translated as document-per-locale; `score` is field-level. */
export function translatableTypes(): string[] {
  return [...DOC_PER_LOCALE_TYPES, 'score']
}

export function isTranslatableType(type: string): boolean {
  return DOC_PER_LOCALE_TYPES.has(type) || type === 'score'
}

export type PerLocaleStatus = 'created' | 'updated' | 'skipped' | 'failed'

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

  // Score docs are patched in place — parallel writes would race on the
  // same `_translationProvenance` map and i18n arrays, so we keep them
  // sequential. Doc-per-locale types each write to their own sibling id,
  // so we fan them out in parallel and serialise only the shared
  // `translation.metadata` write step that comes after.
  if (sourceType === 'score') {
    const results: PerLocaleResult[] = []
    for (const target of targets) {
      options.onProgress?.({ type: 'locale:start', locale: target })
      let result: PerLocaleResult
      try {
        result = await translateScoreInPlace(client, translator, ctx, target, options)
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

  const tasks = targets.map(async (target) => {
    options.onProgress?.({ type: 'locale:start', locale: target })
    let result: PerLocaleResult
    try {
      result = await translateDocPerLocale(client, translator, ctx, target, options)
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
    return result
  })
  const results = await Promise.all(tasks)

  // Sequential metadata updates so concurrent patches don't lose entries.
  // ctx.siblings is always set for the doc-per-locale path (assigned in
  // the `if (DOC_PER_LOCALE_TYPES.has(sourceType))` block above).
  const siblingIds = listSiblingIds(ctx.siblings as Map<Locale, Record<string, unknown>>)
  for (const result of results) {
    if (result.status === 'failed' || result.status === 'skipped') continue
    await ensureTranslationMetadata(client, siblingIds, {
      sourceId: sourceDoc._id as string,
      sourceLocale,
      siblingId: result.docId,
      siblingLocale: result.locale,
      schemaType: sourceType,
    })
  }
  return results
}

/**
 * Translate **only** the disposition surface of an organ doc and
 * patch each existing sibling. Title/excerpt/content stay exactly
 * as they already are on the sibling, so this is the cheap rerun
 * path you want after expanding the walker to cover disposition.
 *
 * Cost-shape: ~15% of a full re-translation, because disposition is
 * roughly 15% of the token volume of a typical organ post.
 *
 * Behaviour notes:
 *   - Skips locales that don't have a sibling yet — you need a full
 *     `runTranslation` first to seed those.
 *   - Replaces the sibling's `disposition` object with a fresh deep
 *     clone of the source's `disposition` (so any new editor changes
 *     in the structure are picked up), then applies translations on
 *     top.
 *   - Doesn't touch `translation.metadata` because every targeted
 *     sibling already exists and is already linked.
 */
export async function runDispositionOnlyTranslation(
  client: SanityClient,
  translator: Translator,
  organDocId: string,
  options: TranslateOptions = {},
): Promise<PerLocaleResult[]> {
  const sourceDoc = await client.getDocument(organDocId)
  if (!sourceDoc) throw new Error(`Source document not found: ${organDocId}`)
  const sourceType = (sourceDoc as { _type: string })._type
  if (sourceType !== 'organ') {
    throw new Error(`Disposition-only mode is for organ docs; got "${sourceType}"`)
  }
  const sourceLocale = (sourceDoc as { language?: Locale }).language ?? 'nl'
  const targets = (options.targetLocales ?? LOCALES.filter((l) => l !== sourceLocale)) as Locale[]

  const sourceDisposition = (sourceDoc as { disposition?: unknown }).disposition
  if (!sourceDisposition) {
    return targets.map((locale) => ({ locale, docId: 'unknown', status: 'skipped' as const }))
  }

  const allUnits = extractAll(sourceDoc as Record<string, unknown>, 'organ', sourceLocale).units
  const dispositionUnits = allUnits.filter((u) => u.id.startsWith('disposition.'))
  if (dispositionUnits.length === 0) {
    return targets.map((locale) => ({ locale, docId: 'unknown', status: 'skipped' as const }))
  }

  const siblings = await loadSiblings(client, organDocId)

  const tasks = targets.map(async (target) => {
    options.onProgress?.({ type: 'locale:start', locale: target })
    const sibling = siblings.get(target)
    if (!sibling) {
      const result: PerLocaleResult = {
        locale: target,
        docId: 'unknown',
        status: 'skipped',
        error: 'No sibling for this locale; run a full translation first.',
      }
      options.onProgress?.({ type: 'locale:done', result })
      return result
    }
    const siblingId = sibling._id as string
    let translatedUnits: import('./types').TranslationUnit[] = []
    try {
      const result = await translator.translate({
        sourceLocale,
        targetLocale: target,
        units: dispositionUnits,
        glossary: options.glossary,
        documentContext: {
          type: 'organ',
          title: sourceDoc.title as string | undefined,
          shape: 'mixed',
        },
      })
      translatedUnits = result.units
      options.onProgress?.({
        type: 'translator:usage',
        locale: target,
        durationMs: result.usage?.durationMs,
        tokens: result.usage?.totalTokens,
      })
    } catch (err) {
      const errored: PerLocaleResult = {
        locale: target,
        docId: siblingId,
        status: 'failed',
        /* v8 ignore next */
        error: err instanceof Error ? err.message : String(err),
      }
      options.onProgress?.({ type: 'locale:done', result: errored })
      return errored
    }
    // Start from the existing sibling, refresh `disposition` from
    // source, then apply the translations. Title/excerpt/content stay
    // exactly as the sibling already had them.
    const next = JSON.parse(JSON.stringify(sibling)) as Record<string, unknown>
    next.disposition = JSON.parse(JSON.stringify(sourceDisposition))
    const final = applyAll(next, 'organ', translatedUnits, target) as Record<string, unknown>
    final._id = siblingId
    await client.createOrReplace(final as never)
    const ok: PerLocaleResult = { locale: target, docId: siblingId, status: 'updated' }
    options.onProgress?.({ type: 'locale:done', result: ok })
    return ok
  })

  return Promise.all(tasks)
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

  // For journal/organ, gather every other sibling's slug in this
  // (type, locale) bucket so the slug derivation can dodge
  // collisions (e.g. two distinct nl sources translating to the
  // same English title).
  let siblingSlugs: Set<string> | undefined
  if (sourceType === 'journal' || sourceType === 'organ') {
    siblingSlugs = await loadSiblingSlugsForLocale(client, sourceType, target, targetId)
  }

  // Build the target doc body: start from a deep clone of the source,
  // apply translations, swap language + id + provenance, derive slug.
  const baseDoc = applyAll(sourceDoc, sourceType, finalUnits, target) as Record<string, unknown>
  const slugged =
    sourceType === 'journal' || sourceType === 'organ'
      ? applyTranslatedSlug(baseDoc, previousSibling, finalUnits, siblingSlugs)
      : baseDoc
  const targetDoc: Record<string, unknown> = stripSystemFields(slugged)
  targetDoc._id = targetId
  targetDoc._type = sourceType
  targetDoc.language = target
  targetDoc._translationSourceRev = sourceRev
  targetDoc._translationSourceUpdatedAt = sourceUpdatedAt

  // Use createOrReplace so re-runs are idempotent and predictable.
  await client.createOrReplace(targetDoc as never)

  // Note: metadata update is hoisted to `runTranslation` so concurrent
  // sibling writes don't race on the shared `translation.metadata` doc.
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
  // Re-fetch the score on every iteration so the apply step stacks
  // each locale's i18n-array entry on top of the previous run's
  // writes. Without this, every iteration restarts from the original
  // `ctx.doc` snapshot and overwrites earlier locales' entries
  // (last-locale-wins, the bug that left scores nl+ko-only).
  const docId = ctx.doc._id as string
  const latest = (await client.getDocument(docId)) as Record<string, unknown> | undefined
  /* v8 ignore next */
  const baseDoc = latest ?? ctx.doc
  const { units } = extractAll(baseDoc, ctx.type, ctx.sourceLocale)
  if (units.length === 0) {
    return { locale: target, docId, status: 'skipped' }
  }
  const sourceRev = baseDoc._rev as string
  const provenanceMap =
    (baseDoc._translationProvenance as Record<string, { sourceRev?: string }>) ?? {}
  const previousProvenance = provenanceMap[target]
  // We used to early-exit here when `previousProvenance.sourceRev`
  // matched `sourceRev`, but that short-circuit hides walker-spec
  // expansions from existing translations: newly-translatable fields
  // would never get translated because the rev appeared "up to date".
  // Score is field-level with only three short translatable fields,
  // so the cost of re-sending everything every run is negligible.

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

  const next = applyAll(baseDoc, ctx.type, result.units, target) as Record<string, unknown>
  const provenance = (baseDoc._translationProvenance as Record<string, unknown> | undefined) ?? {}
  next._translationProvenance = {
    ...provenance,
    [target]: {
      sourceRev,
      updatedAt: baseDoc._updatedAt ?? new Date().toISOString(),
    },
  }
  await client.createOrReplace({ ...next, _id: docId } as never)
  return {
    locale: target,
    docId,
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
    const lang = (source as { language?: Locale }).language ?? ('nl' as Locale)
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
 * Fetch every slug currently in use by other (type, locale) siblings
 * so a fresh translation can dodge collisions. Excludes the sibling
 * we're about to write so the slug-collision check doesn't fight
 * against this doc's own existing slug.
 */
async function loadSiblingSlugsForLocale(
  client: SanityClient,
  type: string,
  locale: Locale,
  excludeId: string,
): Promise<Set<string>> {
  const slugs = await client.fetch<string[]>(
    `*[_type == $type && language == $lang && _id != $exclId && defined(slug.current) && !(_id in path("drafts.**"))].slug.current`,
    { type, lang: locale, exclId: excludeId },
  )
  return new Set(slugs)
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
    const existingIdx = existing.translations.findIndex((t) => t.language === args.siblingLocale)
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
