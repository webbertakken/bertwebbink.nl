import { describe, expect, it } from 'vitest'

import { EchoTranslator } from './echo'
import {
  isTranslatableType,
  runDispositionOnlyTranslation,
  runTranslation,
  translatableTypes,
} from './orchestrator'
import type { TranslateRequest, Translator } from './types'

type AnyDoc = Record<string, unknown>

/**
 * Minimal in-memory Sanity client stub. Implements just the methods the
 * orchestrator actually calls, with deterministic behaviour for tests.
 */
function makeClient(initial: AnyDoc[] = []) {
  const store = new Map<string, AnyDoc>()
  for (const doc of initial) {
    if (doc._id) store.set(doc._id as string, { ...doc })
  }
  const client = {
    async getDocument(id: string) {
      return store.get(id) ?? null
    },
    async fetch<T>(query: string, params?: Record<string, unknown>): Promise<T> {
      // Match `*[_type == "translation.metadata" && references($id)][0]` and
      // its array variant. We only ever query for metadata docs in the
      // orchestrator; nothing else.
      const refId = (params?.id as string | undefined) ?? null
      if (!refId) return [] as unknown as T
      const matches: AnyDoc[] = []
      for (const doc of store.values()) {
        if (doc._type !== 'translation.metadata') continue
        const translations = (doc.translations as Array<{ value?: { _ref?: string } }>) ?? []
        if (translations.some((t) => t.value?._ref === refId)) matches.push(doc)
      }
      if (query.includes('[0]')) return (matches[0] ?? null) as unknown as T
      return matches as unknown as T
    },
    async createOrReplace(doc: AnyDoc) {
      const id = doc._id as string
      store.set(id, { ...doc })
      return doc
    },
    async create(doc: AnyDoc) {
      const id = (doc._id as string) ?? `auto-${Math.random().toString(36).slice(2)}`
      store.set(id, { ...doc, _id: id })
      return store.get(id)!
    },
    async delete(id: string) {
      store.delete(id)
    },
    patch(id: string) {
      return {
        set(set: AnyDoc) {
          const existing = store.get(id) ?? { _id: id }
          store.set(id, { ...existing, ...set })
          return {
            async commit() {
              return store.get(id)!
            },
          }
        },
      }
    },
    /** Test-only accessor. */
    __store: store,
  }
  return client
}

function adapt(client: ReturnType<typeof makeClient>): Parameters<typeof runTranslation>[0] {
  return client as unknown as Parameters<typeof runTranslation>[0]
}

describe('translatable type registry', () => {
  it('lists every doc-per-locale and field-level type', () => {
    const types = translatableTypes()
    expect(types).toContain('journal')
    expect(types).toContain('organ')
    expect(types).toContain('about')
    expect(types).toContain('settings')
    expect(types).toContain('score')
  })

  it('rejects unknown types', () => {
    expect(isTranslatableType('journal')).toBe(true)
    expect(isTranslatableType('score')).toBe(true)
    expect(isTranslatableType('asset')).toBe(false)
  })
})

describe('runTranslation \u2014 input validation', () => {
  it('throws when the source document does not exist', async () => {
    const client = makeClient([])
    await expect(
      runTranslation(adapt(client), new EchoTranslator(), 'missing'),
    ).rejects.toThrow(/not found/)
  })

  it('throws when the source type is not translatable', async () => {
    const client = makeClient([
      { _id: 'asset-1', _type: 'sanity.imageAsset' },
    ])
    await expect(
      runTranslation(adapt(client), new EchoTranslator(), 'asset-1'),
    ).rejects.toThrow(/is not translatable/)
  })
})

describe('runTranslation \u2014 document-per-locale', () => {
  it('creates a sibling for each target locale on first run', async () => {
    const client = makeClient([
      {
        _id: 'about-nl',
        _rev: 'rev-1',
        _type: 'about',
        language: 'nl',
        eyebrow: 'Een klein woord',
        title: 'Over mij',
      },
    ])
    const results = await runTranslation(adapt(client), new EchoTranslator(), 'about-nl', {
      targetLocales: ['en', 'de'],
    })
    expect(results).toHaveLength(2)
    expect(results.every((r) => r.status === 'created')).toBe(true)
    expect(client.__store.get('about-en')).toMatchObject({
      _id: 'about-en',
      _type: 'about',
      language: 'en',
      eyebrow: '[en] Een klein woord',
      title: '[en] Over mij',
      _translationSourceRev: 'rev-1',
    })
    expect(client.__store.get('about-de')).toMatchObject({
      language: 'de',
      eyebrow: '[de] Een klein woord',
    })
  })

  it('creates a translation.metadata doc linking siblings on first run', async () => {
    const client = makeClient([
      {
        _id: 'about-nl',
        _rev: 'rev-1',
        _type: 'about',
        language: 'nl',
        title: 'A',
      },
    ])
    await runTranslation(adapt(client), new EchoTranslator(), 'about-nl', {
      targetLocales: ['en'],
    })
    const metadataDocs = [...client.__store.values()].filter(
      (d) => d._type === 'translation.metadata',
    )
    expect(metadataDocs).toHaveLength(1)
    const translations = metadataDocs[0].translations as Array<{ language: string }>
    const langs = translations.map((t) => t.language).sort()
    expect(langs).toEqual(['en', 'nl'])
  })

  it('always runs the diff-aware path so walker-spec expansions are picked up', async () => {
    // Even when the source rev matches the sibling's stored
    // `_translationSourceRev`, we still run extraction + diff. The
    // diff classifies units against `previousSource` (extracted from
    // the sibling itself); since the sibling holds the translated
    // values, current-source units don't match — every unit goes to
    // the LLM. That's the price of not having a separate previous-
    // source snapshot, and it's why "force" is the default behaviour
    // for doc-per-locale types.
    const client = makeClient([
      {
        _id: 'about-nl',
        _rev: 'rev-1',
        _type: 'about',
        language: 'nl',
        title: 'A',
      },
      {
        _id: 'about-en',
        _rev: 'rev-en-1',
        _type: 'about',
        language: 'en',
        title: '[en] A',
        _translationSourceRev: 'rev-1',
      },
      {
        _id: 'meta-1',
        _type: 'translation.metadata',
        translations: [
          { _key: 'k1', language: 'nl', value: { _ref: 'about-nl', _type: 'reference' } },
          { _key: 'k2', language: 'en', value: { _ref: 'about-en', _type: 'reference' } },
        ],
      },
    ])
    const results = await runTranslation(
      adapt(client),
      new EchoTranslator(),
      'about-nl',
      { targetLocales: ['en'] },
    )
    expect(results[0].status).toBe('updated')
    // The sibling now reflects a fresh re-translation off the source.
    expect((client.__store.get('about-en') as { title: string }).title).toBe('[en] A')
  })

  it('re-translates a stale sibling whose stored value matches the un-translated source (deep-clone case)', async () => {
    // A common case after a walker expansion: the sibling has a
    // field that was deep-cloned from the source and never
    // translated. The new diff path detects "prev translation ===
    // prev source" and re-translates instead of reusing the
    // un-translated value forever.
    const client = makeClient([
      {
        _id: 'about-nl',
        _rev: 'rev-1',
        _type: 'about',
        language: 'nl',
        title: 'A',
      },
      {
        _id: 'about-en',
        _rev: 'rev-en-1',
        _type: 'about',
        language: 'en',
        // Sibling's stored value matches the source verbatim — a
        // tell-tale sign that this field was deep-cloned, never
        // translated by the LLM.
        title: 'A',
        _translationSourceRev: 'rev-1',
      },
      {
        _id: 'meta-1',
        _type: 'translation.metadata',
        translations: [
          { _key: 'k1', language: 'nl', value: { _ref: 'about-nl', _type: 'reference' } },
          { _key: 'k2', language: 'en', value: { _ref: 'about-en', _type: 'reference' } },
        ],
      },
    ])
    const results = await runTranslation(
      adapt(client),
      new EchoTranslator(),
      'about-nl',
      { targetLocales: ['en'] },
    )
    expect(results[0].status).toBe('updated')
    expect((client.__store.get('about-en') as { title: string }).title).toBe('[en] A')
  })

  it('updates an existing sibling when source rev changed', async () => {
    const client = makeClient([
      {
        _id: 'about-nl',
        _rev: 'rev-2',
        _type: 'about',
        language: 'nl',
        title: 'B',
      },
      {
        _id: 'about-en',
        _type: 'about',
        language: 'en',
        title: 'A-old',
        _translationSourceRev: 'rev-1',
      },
      {
        _id: 'meta-1',
        _type: 'translation.metadata',
        translations: [
          { _key: 'k1', language: 'nl', value: { _ref: 'about-nl', _type: 'reference' } },
          { _key: 'k2', language: 'en', value: { _ref: 'about-en', _type: 'reference' } },
        ],
      },
    ])
    const results = await runTranslation(adapt(client), new EchoTranslator(), 'about-nl', {
      targetLocales: ['en'],
    })
    expect(results[0].status).toBe('updated')
    expect(client.__store.get('about-en')).toMatchObject({
      title: '[en] B',
      _translationSourceRev: 'rev-2',
    })
  })

  it('captures and isolates per-locale failures', async () => {
    class FailingTranslator implements Translator {
      readonly name = 'failing'
      readonly model = 'fail'
      async translate(req: TranslateRequest) {
        if (req.targetLocale === 'fr') throw new Error('upstream 503')
        return {
          units: req.units.map((u) => ({ id: u.id, sourceText: `[${req.targetLocale}] ${u.sourceText}` })),
        }
      }
    }
    const client = makeClient([
      { _id: 'about-nl', _rev: 'r', _type: 'about', language: 'nl', title: 'A' },
    ])
    const results = await runTranslation(adapt(client), new FailingTranslator(), 'about-nl', {
      targetLocales: ['en', 'fr', 'de'],
    })
    const byLocale = Object.fromEntries(results.map((r) => [r.locale, r]))
    expect(byLocale.fr.status).toBe('failed')
    expect(byLocale.fr.error).toMatch(/upstream 503/)
    expect(byLocale.en.status).toBe('created')
    expect(byLocale.de.status).toBe('created')
  })

  it('emits progress events for each locale', async () => {
    const client = makeClient([
      { _id: 'about-nl', _rev: 'r', _type: 'about', language: 'nl', title: 'A' },
    ])
    const events: string[] = []
    await runTranslation(adapt(client), new EchoTranslator(), 'about-nl', {
      targetLocales: ['en', 'de'],
      onProgress: (e) => events.push(e.type),
    })
    const starts = events.filter((e) => e === 'locale:start').length
    const dones = events.filter((e) => e === 'locale:done').length
    expect(starts).toBe(2)
    expect(dones).toBe(2)
  })

  it('defaults to all locales except the source when none are specified', async () => {
    const client = makeClient([
      { _id: 'about-nl', _rev: 'r', _type: 'about', language: 'nl', title: 'A' },
    ])
    const results = await runTranslation(adapt(client), new EchoTranslator(), 'about-nl')
    const targetLocales = results.map((r) => r.locale)
    expect(targetLocales).toContain('en')
    expect(targetLocales).toContain('de')
    expect(targetLocales).toContain('ja')
    expect(targetLocales).not.toContain('nl')
  })
})

describe('runTranslation — non-singleton documents (organ/journal)', () => {
  it('creates a new sibling with a fresh id when no previous translation exists', async () => {
    const client = makeClient([
      {
        _id: 'organ-source-1',
        _rev: 'r',
        _type: 'organ',
        language: 'nl',
        title: 'Een orgel',
      },
    ])
    const results = await runTranslation(adapt(client), new EchoTranslator(), 'organ-source-1', {
      targetLocales: ['en'],
    })
    expect(results[0].status).toBe('created')
    expect(results[0].docId).toMatch(/^organ-en-/)
    const sibling = client.__store.get(results[0].docId)!
    expect(sibling).toMatchObject({ _type: 'organ', language: 'en', title: '[en] Een orgel' })
  })

  it('translates organ disposition fields, keeping stop names canonical and writing the gloss to `translation`', async () => {
    const client = makeClient([
      {
        _id: 'organ-source-disp',
        _rev: 'r',
        _type: 'organ',
        language: 'nl',
        title: 'Een orgel',
        disposition: {
          registers: [
            {
              _key: 'r1',
              name: 'Hoofdwerk',
              stops: [
                { _key: 's1', name: 'Bordun', pitch: "16'" },
                { _key: 's2', name: 'Principal', pitch: "8'", note: 'discant' },
              ],
            },
          ],
          couplings: [{ _key: 'c1', name: 'Hoofdwerk – Bovenwerk' }],
          accessories: [{ _key: 'a1', name: 'Tremulant' }],
        },
      },
    ])
    const results = await runTranslation(
      adapt(client),
      new EchoTranslator(),
      'organ-source-disp',
      { targetLocales: ['ja'] },
    )
    expect(results[0].status).toBe('created')
    const sibling = client.__store.get(results[0].docId) as {
      disposition: {
        registers: Array<{
          name: string
          stops: Array<{ name: string; note?: string; translation?: string; pitch?: string }>
        }>
        couplings: Array<{ name: string }>
        accessories: Array<{ name: string }>
      }
    }
    // Headings get translated in place.
    expect(sibling.disposition.registers[0].name).toBe('[ja] Hoofdwerk')
    expect(sibling.disposition.couplings[0].name).toBe('[ja] Hoofdwerk – Bovenwerk')
    expect(sibling.disposition.accessories[0].name).toBe('[ja] Tremulant')
    // Stop name stays canonical.
    expect(sibling.disposition.registers[0].stops[0].name).toBe('Bordun')
    expect(sibling.disposition.registers[0].stops[1].name).toBe('Principal')
    // Stop gloss lands on the dedicated `translation` field.
    expect(sibling.disposition.registers[0].stops[0].translation).toBe('[ja] Bordun')
    expect(sibling.disposition.registers[0].stops[1].translation).toBe('[ja] Principal')
    // Stop note translated in place; pitch (mathematical) untouched.
    expect(sibling.disposition.registers[0].stops[1].note).toBe('[ja] discant')
    expect(sibling.disposition.registers[0].stops[0].pitch).toBe("16'")
  })

  it('updates an existing metadata doc by patching translations array', async () => {
    const client = makeClient([
      { _id: 'about-nl', _rev: 'r2', _type: 'about', language: 'nl', title: 'NL' },
      { _id: 'about-en', _type: 'about', language: 'en', title: 'EN', _translationSourceRev: 'r1' },
      {
        _id: 'meta-1',
        _type: 'translation.metadata',
        translations: [
          { _key: 'k1', language: 'nl', value: { _ref: 'about-nl', _type: 'reference' } },
          { _key: 'k2', language: 'en', value: { _ref: 'about-en', _type: 'reference' } },
        ],
      },
    ])
    await runTranslation(adapt(client), new EchoTranslator(), 'about-nl', {
      targetLocales: ['de'],
    })
    const meta = client.__store.get('meta-1') as { translations: Array<{ language: string }> }
    expect(meta.translations.map((t) => t.language).sort()).toEqual(['de', 'en', 'nl'])
  })

  it('rewrites an existing metadata translation that points at a stale ref', async () => {
    const client = makeClient([
      { _id: 'about-nl', _rev: 'r2', _type: 'about', language: 'nl', title: 'NL' },
      {
        _id: 'about-en',
        _type: 'about',
        language: 'en',
        title: 'EN',
        _translationSourceRev: 'r1',
      },
      {
        _id: 'meta-1',
        _type: 'translation.metadata',
        translations: [
          { _key: 'k1', language: 'nl', value: { _ref: 'about-nl', _type: 'reference' } },
          { _key: 'k2', language: 'en', value: { _ref: 'stale-en-id', _type: 'reference' } },
        ],
      },
    ])
    await runTranslation(adapt(client), new EchoTranslator(), 'about-nl', {
      targetLocales: ['en'],
    })
    const meta = client.__store.get('meta-1') as {
      translations: Array<{ language: string; value: { _ref: string } }>
    }
    const enTranslation = meta.translations.find((t) => t.language === 'en')!
    expect(enTranslation.value._ref).toBe('about-en')
  })

  it('leaves metadata untouched when the existing entry already matches', async () => {
    const client = makeClient([
      { _id: 'about-nl', _rev: 'r2', _type: 'about', language: 'nl', title: 'NL' },
      {
        _id: 'about-en',
        _type: 'about',
        language: 'en',
        title: 'EN',
        _translationSourceRev: 'r1',
      },
      {
        _id: 'meta-1',
        _type: 'translation.metadata',
        translations: [
          { _key: 'k1', language: 'nl', value: { _ref: 'about-nl', _type: 'reference' } },
          { _key: 'k2', language: 'en', value: { _ref: 'about-en', _type: 'reference' } },
        ],
      },
    ])
    const before = JSON.stringify(client.__store.get('meta-1'))
    await runTranslation(adapt(client), new EchoTranslator(), 'about-nl', {
      targetLocales: ['en'],
    })
    const after = JSON.stringify(client.__store.get('meta-1'))
    expect(after).toBe(before)
  })
})

describe('runTranslation \u2014 score (field-level)', () => {
  it('appends translated entries to internationalised arrays without touching unrelated fields', async () => {
    const client = makeClient([
      {
        _id: 'score-1',
        _rev: 'rev-s-1',
        _type: 'score',
        composer: 'Buxtehude',
        year: 1689,
        forInstrument: [
          { _key: 'k1', _type: 'internationalizedArrayStringValue', language: 'nl', value: 'Voor orgel' },
        ],
        edition: [
          { _key: 'k2', _type: 'internationalizedArrayStringValue', language: 'nl', value: '1e editie' },
        ],
        blurb: [
          { _key: 'k3', _type: 'internationalizedArrayTextValue', language: 'nl', value: 'Een werk in g.' },
        ],
      },
    ])
    const results = await runTranslation(adapt(client), new EchoTranslator(), 'score-1', {
      targetLocales: ['en'],
    })
    expect(results[0]).toEqual({ locale: 'en', docId: 'score-1', status: 'created' })
    const stored = client.__store.get('score-1')!
    expect(stored.composer).toBe('Buxtehude')
    expect(stored.year).toBe(1689)
    const blurb = stored.blurb as Array<{ language: string; value: string }>
    expect(blurb.find((e) => e.language === 'en')?.value).toBe('[en] Een werk in g.')
    expect(blurb.find((e) => e.language === 'nl')?.value).toBe('Een werk in g.')
    const provenance = stored._translationProvenance as Record<string, { sourceRev: string }>
    expect(provenance.en.sourceRev).toBe('rev-s-1')
  })

  it('stacks i18n-array entries from every target locale rather than last-locale-wins', async () => {
    // Regression: `translateScoreInPlace` used to call applyAll on a
    // frozen `ctx.doc` snapshot, so each iteration overwrote the doc
    // with original arrays + just one locale's new entry. Result:
    // only the final locale (plus the source) survived. Now we
    // re-fetch the doc each iteration, so entries accumulate.
    const client = makeClient([
      {
        _id: 'score-stack',
        _rev: 'rev-1',
        _type: 'score',
        composer: 'Buxtehude',
        forInstrument: [
          {
            _key: 'k-nl',
            _type: 'internationalizedArrayStringValue',
            language: 'nl',
            value: 'Voor orgel',
          },
        ],
      },
    ])
    const results = await runTranslation(
      adapt(client),
      new EchoTranslator(),
      'score-stack',
      { targetLocales: ['en', 'de', 'fr'] },
    )
    expect(results.map((r) => r.status)).toEqual(['created', 'created', 'created'])
    const stored = client.__store.get('score-stack')!
    const inst = stored.forInstrument as Array<{ language: string; value: string }>
    const langs = inst.map((e) => e.language).sort()
    // All three target locales survive AND the source.
    expect(langs).toEqual(['de', 'en', 'fr', 'nl'])
    expect(inst.find((e) => e.language === 'en')?.value).toBe('[en] Voor orgel')
    expect(inst.find((e) => e.language === 'de')?.value).toBe('[de] Voor orgel')
    expect(inst.find((e) => e.language === 'fr')?.value).toBe('[fr] Voor orgel')
  })

  it('always re-translates a score even when provenance.sourceRev matches', async () => {
    // The early-exit on `_translationProvenance[target].sourceRev`
    // was removed because it hid walker-spec expansions — score
    // re-runs are cheap (3 short field-level strings) so we always
    // re-extract and re-apply.
    const client = makeClient([
      {
        _id: 'score-1',
        _rev: 'rev-s-1',
        _type: 'score',
        composer: 'Buxtehude',
        forInstrument: [
          { _key: 'k1', _type: 'internationalizedArrayStringValue', language: 'nl', value: 'Voor orgel' },
        ],
        _translationProvenance: { en: { sourceRev: 'rev-s-1', updatedAt: 'now' } },
      },
    ])
    const results = await runTranslation(adapt(client), new EchoTranslator(), 'score-1', {
      targetLocales: ['en'],
    })
    expect(results[0].status).toBe('updated')
  })

  it('updates an existing target locale entry on a second run', async () => {
    const client = makeClient([
      {
        _id: 'score-1',
        _rev: 'r',
        _type: 'score',
        composer: 'C',
        forInstrument: [
          { _key: 'k1', _type: 'internationalizedArrayStringValue', language: 'nl', value: 'NL' },
          { _key: 'k2', _type: 'internationalizedArrayStringValue', language: 'en', value: 'old EN' },
        ],
        _translationProvenance: { en: { sourceRev: 'old-rev', updatedAt: 't1' } },
      },
    ])
    const results = await runTranslation(adapt(client), new EchoTranslator(), 'score-1', {
      targetLocales: ['en'],
    })
    expect(results[0].status).toBe('updated')
    const stored = client.__store.get('score-1')!
    const arr = stored.forInstrument as Array<{ language: string; value: string }>
    expect(arr.find((e) => e.language === 'en')?.value).toBe('[en] NL')
  })

  it('returns "skipped" for a score with no translatable units', async () => {
    const client = makeClient([
      { _id: 'score-empty', _rev: 'r', _type: 'score', composer: 'A' },
    ])
    const results = await runTranslation(adapt(client), new EchoTranslator(), 'score-empty', {
      targetLocales: ['en'],
    })
    expect(results[0].status).toBe('skipped')
  })

  it('defaults source language to nl when the source doc has no language field', async () => {
    // Score docs are field-level; no `language` field on the doc itself.
    const client = makeClient([
      {
        _id: 'score-no-lang',
        _rev: 'r',
        _type: 'score',
        composer: 'X',
        forInstrument: [
          { _key: 'k', _type: 'internationalizedArrayStringValue', language: 'nl', value: 'Voor orgel' },
        ],
      },
    ])
    const results = await runTranslation(adapt(client), new EchoTranslator(), 'score-no-lang', {
      targetLocales: ['en'],
    })
    expect(results[0].status).toBe('created')
  })

  it('defaults loadSiblings source language to nl for a doc-per-locale doc with no language', async () => {
    const client = makeClient([
      // Doc-per-locale source with no `language` field at all.
      { _id: 'about-noland', _rev: 'r', _type: 'about', title: 'A' },
    ])
    const results = await runTranslation(adapt(client), new EchoTranslator(), 'about-noland', {
      targetLocales: ['en'],
    })
    expect(results[0].status).toBe('created')
  })

  it('tolerates a metadata translation row with a missing _ref', async () => {
    const client = makeClient([
      { _id: 'about-nl', _rev: 'r', _type: 'about', language: 'nl', title: 'A' },
      {
        _id: 'meta-1',
        _type: 'translation.metadata',
        translations: [
          { _key: 'k1', language: 'nl', value: { _ref: 'about-nl', _type: 'reference' } },
          { _key: 'k2', language: 'fr', value: {} },
        ],
      },
    ])
    const results = await runTranslation(adapt(client), new EchoTranslator(), 'about-nl', {
      targetLocales: ['en'],
    })
    expect(results[0].status).toBe('created')
  })



  it('captures and isolates per-locale failures on score docs (sequential path)', async () => {
    class FailingTranslator implements Translator {
      readonly name = 'failing'
      readonly model = 'fail'
      async translate(req: TranslateRequest) {
        if (req.targetLocale === 'fr') throw new Error('upstream 503')
        return {
          units: req.units.map((u) => ({
            id: u.id,
            sourceText: `[${req.targetLocale}] ${u.sourceText}`,
          })),
        }
      }
    }
    const client = makeClient([
      {
        _id: 'score-1',
        _rev: 'r',
        _type: 'score',
        composer: 'C',
        forInstrument: [
          { _key: 'k', _type: 'internationalizedArrayStringValue', language: 'nl', value: 'Voor orgel' },
        ],
      },
    ])
    const results = await runTranslation(adapt(client), new FailingTranslator(), 'score-1', {
      targetLocales: ['en', 'fr', 'de'],
    })
    const byLocale = Object.fromEntries(results.map((r) => [r.locale, r]))
    expect(byLocale.fr.status).toBe('failed')
    expect(byLocale.fr.error).toMatch(/upstream 503/)
    expect(byLocale.en.status).toBe('created')
    expect(byLocale.de.status).toBe('created')
  })

  it('emits translator:usage events when the LLM reports timing/tokens', async () => {
    class TimedTranslator implements Translator {
      readonly name = 'timed'
      readonly model = 'timed-1'
      async translate(req: TranslateRequest) {
        return {
          units: req.units.map((u) => ({
            id: u.id,
            sourceText: `[${req.targetLocale}] ${u.sourceText}`,
          })),
          usage: { durationMs: 150, totalTokens: 42 },
        }
      }
    }
    const client = makeClient([
      {
        _id: 'score-1',
        _rev: 'r',
        _type: 'score',
        composer: 'C',
        forInstrument: [
          { _key: 'k1', _type: 'internationalizedArrayStringValue', language: 'nl', value: 'Voor orgel' },
        ],
      },
    ])
    const events: Array<{ type: string; tokens?: number; durationMs?: number }> = []
    await runTranslation(adapt(client), new TimedTranslator(), 'score-1', {
      targetLocales: ['en'],
      onProgress: (e) => events.push(e as never),
    })
    const usage = events.find((e) => e.type === 'translator:usage')!
    expect(usage.tokens).toBe(42)
    expect(usage.durationMs).toBe(150)
  })
})

describe('runDispositionOnlyTranslation', () => {
  const sourceOrgan = {
    _id: 'organ-source-disp',
    _rev: 'r',
    _type: 'organ',
    language: 'nl',
    title: 'Een orgel',
    excerpt: 'Een korte aanloop',
    disposition: {
      registers: [
        {
          _key: 'r1',
          name: 'Hoofdwerk',
          stops: [
            { _key: 's1', name: 'Bordun', pitch: "16'" },
            { _key: 's2', name: 'Principal', pitch: "8'" },
          ],
        },
      ],
      couplings: [{ _key: 'c1', name: 'Hoofdwerk – Bovenwerk' }],
      accessories: [{ _key: 'a1', name: 'Tremulant' }],
    },
  }

  it('patches each existing sibling with translated disposition only, leaving title/excerpt untouched', async () => {
    const client = makeClient([
      sourceOrgan,
      {
        _id: 'organ-en',
        _type: 'organ',
        language: 'en',
        // Pre-existing translations on the sibling that must NOT be
        // overwritten by the disposition-only run.
        title: 'An organ',
        excerpt: 'A short approach',
        disposition: {
          registers: [
            {
              _key: 'r1',
              name: 'Hoofdwerk',
              stops: [
                { _key: 's1', name: 'Bordun', pitch: "16'" },
                { _key: 's2', name: 'Principal', pitch: "8'" },
              ],
            },
          ],
          couplings: [{ _key: 'c1', name: 'Hoofdwerk – Bovenwerk' }],
          accessories: [{ _key: 'a1', name: 'Tremulant' }],
        },
      },
      {
        _id: 'meta-1',
        _type: 'translation.metadata',
        translations: [
          { _key: 'k1', language: 'nl', value: { _ref: 'organ-source-disp', _type: 'reference' } },
          { _key: 'k2', language: 'en', value: { _ref: 'organ-en', _type: 'reference' } },
        ],
      },
    ])
    const results = await runDispositionOnlyTranslation(
      adapt(client),
      new EchoTranslator(),
      'organ-source-disp',
      { targetLocales: ['en'] },
    )
    expect(results[0]).toMatchObject({ locale: 'en', docId: 'organ-en', status: 'updated' })

    const updated = client.__store.get('organ-en') as {
      title: string
      excerpt: string
      disposition: {
        registers: Array<{
          name: string
          stops: Array<{ name: string; translation?: string }>
        }>
        couplings: Array<{ name: string }>
        accessories: Array<{ name: string }>
      }
    }
    // Title + excerpt preserved verbatim from the previous sibling.
    expect(updated.title).toBe('An organ')
    expect(updated.excerpt).toBe('A short approach')
    // Disposition headings translated in place.
    expect(updated.disposition.registers[0].name).toBe('[en] Hoofdwerk')
    expect(updated.disposition.couplings[0].name).toBe('[en] Hoofdwerk – Bovenwerk')
    expect(updated.disposition.accessories[0].name).toBe('[en] Tremulant')
    // Stop names stay canonical, gloss lands on `translation`.
    expect(updated.disposition.registers[0].stops[0].name).toBe('Bordun')
    expect(updated.disposition.registers[0].stops[0].translation).toBe('[en] Bordun')
    expect(updated.disposition.registers[0].stops[1].name).toBe('Principal')
    expect(updated.disposition.registers[0].stops[1].translation).toBe('[en] Principal')
  })

  it('skips locales without an existing sibling', async () => {
    const client = makeClient([sourceOrgan])
    const results = await runDispositionOnlyTranslation(
      adapt(client),
      new EchoTranslator(),
      'organ-source-disp',
      { targetLocales: ['de'] },
    )
    expect(results[0].status).toBe('skipped')
    expect(results[0].error).toMatch(/no sibling/i)
  })

  it('skips every locale when the source has no disposition', async () => {
    const client = makeClient([
      {
        _id: 'organ-blank',
        _rev: 'r',
        _type: 'organ',
        language: 'nl',
        title: 'A',
        // No `disposition` field.
      },
    ])
    const results = await runDispositionOnlyTranslation(
      adapt(client),
      new EchoTranslator(),
      'organ-blank',
      { targetLocales: ['en', 'de'] },
    )
    expect(results.every((r) => r.status === 'skipped')).toBe(true)
  })

  it('skips every locale when the disposition has no translatable units', async () => {
    const client = makeClient([
      {
        _id: 'organ-empty-disp',
        _rev: 'r',
        _type: 'organ',
        language: 'nl',
        title: 'A',
        disposition: {
          // Object exists but every array is empty.
          registers: [],
          couplings: [],
          accessories: [],
        },
      },
    ])
    const results = await runDispositionOnlyTranslation(
      adapt(client),
      new EchoTranslator(),
      'organ-empty-disp',
      { targetLocales: ['en'] },
    )
    expect(results[0].status).toBe('skipped')
  })

  it('throws when the source doc id does not exist', async () => {
    const client = makeClient([])
    await expect(
      runDispositionOnlyTranslation(
        adapt(client),
        new EchoTranslator(),
        'organ-nope',
        { targetLocales: ['en'] },
      ),
    ).rejects.toThrow(/not found/i)
  })

  it('throws when the source doc is not an organ', async () => {
    const client = makeClient([
      { _id: 'journal-nl', _rev: 'r', _type: 'journal', language: 'nl', title: 'A' },
    ])
    await expect(
      runDispositionOnlyTranslation(
        adapt(client),
        new EchoTranslator(),
        'journal-nl',
        { targetLocales: ['en'] },
      ),
    ).rejects.toThrow(/disposition-only/i)
  })

  it('reports per-locale failures and continues', async () => {
    class FlakyTranslator implements Translator {
      readonly name = 'flaky'
      readonly model = 'flaky-1'
      async translate(req: TranslateRequest) {
        if (req.targetLocale === 'de') throw new Error('boom')
        return {
          units: req.units.map((u) => ({ id: u.id, sourceText: `[${req.targetLocale}] ${u.sourceText}` })),
        }
      }
    }
    const client = makeClient([
      sourceOrgan,
      {
        _id: 'organ-en',
        _type: 'organ',
        language: 'en',
        title: 'EN',
        disposition: {
          registers: [
            {
              _key: 'r1',
              name: 'Hoofdwerk',
              stops: [{ _key: 's1', name: 'Bordun', pitch: "16'" }],
            },
          ],
        },
      },
      {
        _id: 'organ-de',
        _type: 'organ',
        language: 'de',
        title: 'DE',
        disposition: {
          registers: [
            {
              _key: 'r1',
              name: 'Hoofdwerk',
              stops: [{ _key: 's1', name: 'Bordun', pitch: "16'" }],
            },
          ],
        },
      },
      {
        _id: 'meta-1',
        _type: 'translation.metadata',
        translations: [
          { _key: 'k1', language: 'nl', value: { _ref: 'organ-source-disp', _type: 'reference' } },
          { _key: 'k2', language: 'en', value: { _ref: 'organ-en', _type: 'reference' } },
          { _key: 'k3', language: 'de', value: { _ref: 'organ-de', _type: 'reference' } },
        ],
      },
    ])
    const events: Array<{ type: string; result?: { status: string } }> = []
    const results = await runDispositionOnlyTranslation(
      adapt(client),
      new FlakyTranslator(),
      'organ-source-disp',
      {
        targetLocales: ['en', 'de'],
        onProgress: (e) => events.push(e as never),
      },
    )
    const byLocale = Object.fromEntries(results.map((r) => [r.locale, r]))
    expect(byLocale.en.status).toBe('updated')
    expect(byLocale.de.status).toBe('failed')
    expect(byLocale.de.error).toBe('boom')
    // The locale:done event for the failed locale should fire too.
    const failedDone = events.find(
      (e) => e.type === 'locale:done' && e.result?.status === 'failed',
    )
    expect(failedDone).toBeDefined()
  })

  it('emits progress events with translator usage', async () => {
    class TimedEcho extends EchoTranslator {
      override async translate(req: TranslateRequest) {
        const result = await super.translate(req)
        return { ...result, usage: { totalTokens: 7, durationMs: 11 } }
      }
    }
    const client = makeClient([
      sourceOrgan,
      {
        _id: 'organ-en',
        _type: 'organ',
        language: 'en',
        title: 'EN',
        disposition: {
          registers: [
            {
              _key: 'r1',
              name: 'Hoofdwerk',
              stops: [{ _key: 's1', name: 'Bordun', pitch: "16'" }],
            },
          ],
        },
      },
      {
        _id: 'meta-1',
        _type: 'translation.metadata',
        translations: [
          { _key: 'k1', language: 'nl', value: { _ref: 'organ-source-disp', _type: 'reference' } },
          { _key: 'k2', language: 'en', value: { _ref: 'organ-en', _type: 'reference' } },
        ],
      },
    ])
    const events: Array<{ type: string; tokens?: number; durationMs?: number }> = []
    await runDispositionOnlyTranslation(
      adapt(client),
      new TimedEcho(),
      'organ-source-disp',
      {
        targetLocales: ['en'],
        onProgress: (e) => events.push(e as never),
      },
    )
    expect(events.find((e) => e.type === 'locale:start')).toBeDefined()
    expect(events.find((e) => e.type === 'locale:done')).toBeDefined()
    const usage = events.find((e) => e.type === 'translator:usage')!
    expect(usage.tokens).toBe(7)
    expect(usage.durationMs).toBe(11)
  })

  it('emits a locale:done event for skipped siblings too', async () => {
    const client = makeClient([sourceOrgan])
    const events: Array<{ type: string }> = []
    await runDispositionOnlyTranslation(
      adapt(client),
      new EchoTranslator(),
      'organ-source-disp',
      {
        targetLocales: ['de'],
        onProgress: (e) => events.push(e as never),
      },
    )
    expect(events.filter((e) => e.type === 'locale:done')).toHaveLength(1)
  })

  it('defaults to every locale except the source when targetLocales is omitted', async () => {
    const client = makeClient([sourceOrgan])
    const results = await runDispositionOnlyTranslation(
      adapt(client),
      new EchoTranslator(),
      'organ-source-disp',
    )
    // 11 total locales, minus the source (`nl`) = 10.
    expect(results).toHaveLength(10)
    // All locales are skipped because no siblings exist in this fixture.
    expect(results.every((r) => r.status === 'skipped')).toBe(true)
  })

  it('falls back to `nl` when the source doc has no `language` field', async () => {
    const client = makeClient([
      {
        // Same shape as `sourceOrgan` but without an explicit `language`.
        _id: 'organ-no-lang',
        _rev: 'r',
        _type: 'organ',
        title: 'Een orgel',
        disposition: {
          registers: [
            {
              _key: 'r1',
              name: 'Hoofdwerk',
              stops: [{ _key: 's1', name: 'Bordun', pitch: "16'" }],
            },
          ],
        },
      },
    ])
    const results = await runDispositionOnlyTranslation(
      adapt(client),
      new EchoTranslator(),
      'organ-no-lang',
    )
    // Source language defaults to `nl`, so we get 10 target locales.
    expect(results).toHaveLength(10)
  })
})
