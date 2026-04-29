import { describe, expect, it } from 'vitest'

import { applyAll, extractAll, walkersFor } from './registry'

describe('walker registry', () => {
  it('exposes a derivedFields entry for organ stop names', () => {
    const spec = walkersFor('organ')
    if (!spec) throw new Error('organ spec missing')
    expect(spec.derivedFields?.[0]?.readPath).toBe(
      'disposition.registers[*].stops[*].name',
    )
    expect(spec.derivedFields?.[0]?.writePath).toBe(
      'disposition.registers[*].stops[*].translation',
    )
  })

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

  it('expands wildcard string-field paths on extract and matches them again on apply', () => {
    // Smoke-test: the apply step uses `specPathMatches` for wildcard
    // entries; without the wildcard-aware filter the dispatch would
    // drop these units.
    const doc = {
      _id: 'organ-nl',
      _type: 'organ',
      title: 't',
      content: [],
      disposition: {
        accessories: [
          { _key: 'a1', name: 'Tremulant' },
          { _key: 'a2', name: 'Cymbelstern' },
        ],
      },
    }
    const { units } = extractAll(doc, 'organ', 'nl')
    const translated = units.map((u) => ({
      id: u.id,
      sourceText: `T:${u.sourceText}`,
    }))
    const next = applyAll(doc, 'organ', translated, 'de') as typeof doc
    expect(next.disposition.accessories[0].name).toBe('T:Tremulant')
    expect(next.disposition.accessories[1].name).toBe('T:Cymbelstern')
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

  it('extracts disposition fields for an organ doc, splitting stop names into a derived translation field', () => {
    const doc = {
      _id: 'organ-nl',
      _type: 'organ',
      title: 'Hinsz orgel Vriezenveen',
      content: [],
      disposition: {
        registers: [
          {
            _key: 'r1',
            name: 'Hoofdwerk',
            stops: [
              { _key: 's1', name: 'Bordun', pitch: "16'", note: 'discant' },
              { _key: 's2', name: 'Principal', pitch: "8'" },
            ],
          },
        ],
        couplings: [
          { _key: 'c1', name: 'Hoofdwerk – Bovenwerk', note: "4'" },
        ],
        accessories: [{ _key: 'a1', name: 'Tremulant' }],
      },
    }
    const { units } = extractAll(doc, 'organ', 'nl')
    const ids = units.map((u) => u.id)
    expect(ids).toContain('disposition.registers[_key=="r1"].name')
    expect(ids).toContain(
      'disposition.registers[_key=="r1"].stops[_key=="s1"].note',
    )
    expect(ids).toContain('disposition.couplings[_key=="c1"].name')
    expect(ids).toContain('disposition.couplings[_key=="c1"].note')
    expect(ids).toContain('disposition.accessories[_key=="a1"].name')
    // Stop names land on the derived `translation` path, not on `name`.
    expect(ids).toContain(
      'disposition.registers[_key=="r1"].stops[_key=="s1"].translation',
    )
    expect(ids).toContain(
      'disposition.registers[_key=="r1"].stops[_key=="s2"].translation',
    )
    expect(ids).not.toContain(
      'disposition.registers[_key=="r1"].stops[_key=="s1"].name',
    )
  })

  it('round-trips an organ disposition: register names overwrite, stop names go to translation', () => {
    const doc = {
      _id: 'organ-nl',
      _type: 'organ',
      title: 'NL title',
      content: [],
      disposition: {
        registers: [
          {
            _key: 'r1',
            name: 'Hoofdwerk',
            stops: [
              { _key: 's1', name: 'Bordun', pitch: "16'" },
            ],
          },
        ],
      },
    }
    const { units } = extractAll(doc, 'organ', 'nl')
    const translated = units.map((u) => ({
      id: u.id,
      sourceText: `[ja] ${u.sourceText}`,
    }))
    const next = applyAll(doc, 'organ', translated, 'ja') as typeof doc
    expect(next.title).toBe('[ja] NL title')
    expect(next.disposition.registers[0].name).toBe('[ja] Hoofdwerk')
    // Canonical stop name preserved.
    expect(next.disposition.registers[0].stops[0].name).toBe('Bordun')
    // Translation written to the derived field.
    expect(
      (next.disposition.registers[0].stops[0] as unknown as {
        translation?: string
      }).translation,
    ).toBe('[ja] Bordun')
    // Pitch (numeric notation) is left alone.
    expect(next.disposition.registers[0].stops[0].pitch).toBe("16'")
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
