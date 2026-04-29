import { describe, expect, it } from 'vitest'

import { applyAll, extractAll, walkersFor } from './registry'

describe('walker registry', () => {
  it('returns walker specs for every translatable type', () => {
    for (const t of [
      'journal',
      'organ',
      'about',
      'elsewhere',
      'privacy',
      'journalPage',
      'organsPage',
      'scoresPage',
      'settings',
      'score',
    ]) {
      const spec = walkersFor(t)
      if (!spec) throw new Error(`walker missing for ${t}`)
      expect(spec).toBeDefined()
    }
  })

  it('returns undefined for unknown types', () => {
    expect(walkersFor('unknownType')).toBeUndefined()
  })

  it('extracts strings and PT for journal docs', () => {
    const doc = {
      _id: 'journal-nl',
      _type: 'journal',
      title: 'Bezoek aan Vriezenveen',
      excerpt: 'Een korte aanloop.',
      coverImage: { alt: 'orgel', caption: 'klavier' },
      content: [
        {
          _key: 'a',
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [{ _key: 's', _type: 'span', text: 'Het orgel klonk vol.' }],
        },
      ],
    }
    const { units, shape } = extractAll(doc, 'journal', 'nl')
    expect(shape).toBe('mixed')
    expect(units.map((u) => u.id)).toEqual([
      'title',
      'excerpt',
      'coverImage.alt',
      'coverImage.caption',
      'content.block[0]',
    ])
  })

  it('round-trips a journal doc end-to-end (extract -> apply)', () => {
    const doc = {
      _id: 'journal-nl',
      _type: 'journal',
      title: 'NL title',
      content: [
        {
          _key: 'a',
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [{ _key: 's', _type: 'span', text: 'Hello.' }],
        },
      ],
    }
    const { units } = extractAll(doc, 'journal', 'nl')
    const translated = units.map((u) => ({ id: u.id, sourceText: `[en] ${u.sourceText}` }))
    const updated = applyAll(doc, 'journal', translated, 'en')
    expect(updated.title).toBe('[en] NL title')
    const block = (updated.content as Array<{ children: Array<{ text: string }> }>)[0]
    expect(block.children[0].text).toBe('[en] Hello.')
  })

  it('returns empty units and passes through doc when type is unknown', () => {
    expect(extractAll({}, 'unknownType', 'nl').units).toEqual([])
    const doc = { foo: 'bar' }
    expect(applyAll(doc, 'unknownType', [], 'en')).toBe(doc)
  })

  it('extracts and applies a score with i18n arrays', () => {
    const doc = {
      _id: 'score-x',
      _type: 'score',
      composer: 'Buxtehude',
      forInstrument: [
        { _key: 'k1', _type: 'internationalizedArrayStringValue', language: 'nl', value: 'Voor orgel' },
      ],
      edition: [
        { _key: 'k2', _type: 'internationalizedArrayStringValue', language: 'nl', value: '1e editie' },
      ],
      blurb: [
        { _key: 'k3', _type: 'internationalizedArrayTextValue', language: 'nl', value: 'Een werk in g.' },
      ],
    }
    const { units } = extractAll(doc, 'score', 'nl')
    expect(units.map((u) => u.id)).toEqual(['forInstrument', 'edition', 'blurb'])
    const translated = units.map((u) => ({ id: u.id, sourceText: `[en] ${u.sourceText}` }))
    const next = applyAll(doc, 'score', translated, 'en')
    const blurb = next.blurb as Array<{ language: string; value: string }>
    expect(blurb.find((e) => e.language === 'en')?.value).toBe('[en] Een werk in g.')
    expect(blurb.find((e) => e.language === 'nl')?.value).toBe('Een werk in g.')
    expect(next.composer).toBe('Buxtehude')
  })
})
