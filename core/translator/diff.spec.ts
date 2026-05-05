import { describe, expect, it } from 'vitest'
import { combineTranslations, diffUnits } from './diff'

describe('diff-aware updates', () => {
  it('reports no-op when source unchanged', () => {
    const current = [{ id: 'title', sourceText: 'Hello' }]
    const previousSource = [{ id: 'title', sourceText: 'Hello' }]
    const previousTranslation = [{ id: 'title', sourceText: 'Hallo' }]
    const result = diffUnits(current, previousSource, previousTranslation)
    expect(result.changed).toEqual([])
    expect(result.reuseTranslated).toEqual([{ id: 'title', sourceText: 'Hallo' }])
    expect(result.removedIds).toEqual([])
  })

  it('flags only edited paragraphs as changed', () => {
    const current = [
      { id: 'block[0]', sourceText: 'Para A unchanged' },
      { id: 'block[1]', sourceText: 'Para B EDITED' },
    ]
    const previousSource = [
      { id: 'block[0]', sourceText: 'Para A unchanged' },
      { id: 'block[1]', sourceText: 'Para B old' },
    ]
    const previousTranslation = [
      { id: 'block[0]', sourceText: 'Para A vertaald' },
      { id: 'block[1]', sourceText: 'Para B oud' },
    ]
    const result = diffUnits(current, previousSource, previousTranslation)
    expect(result.changed).toEqual([{ id: 'block[1]', sourceText: 'Para B EDITED' }])
    expect(result.reuseTranslated).toEqual([{ id: 'block[0]', sourceText: 'Para A vertaald' }])
  })

  it('treats new paragraphs as changed', () => {
    const current = [
      { id: 'block[0]', sourceText: 'Para A' },
      { id: 'block[1]', sourceText: 'NEW para' },
    ]
    const previousSource = [{ id: 'block[0]', sourceText: 'Para A' }]
    const previousTranslation = [{ id: 'block[0]', sourceText: 'Para A vertaald' }]
    const result = diffUnits(current, previousSource, previousTranslation)
    expect(result.changed.map((u) => u.id)).toEqual(['block[1]'])
  })

  it('reports removed ids when previous translation outlives current source', () => {
    const current = [{ id: 'block[0]', sourceText: 'A' }]
    const previousSource = [
      { id: 'block[0]', sourceText: 'A' },
      { id: 'block[1]', sourceText: 'B' },
    ]
    const previousTranslation = [
      { id: 'block[0]', sourceText: 'A-trans' },
      { id: 'block[1]', sourceText: 'B-trans' },
    ]
    const result = diffUnits(current, previousSource, previousTranslation)
    expect(result.removedIds).toEqual(['block[1]'])
  })

  it('marks fields as changed when the previous translation is identical to the previous source (deep-clone, never translated)', () => {
    // Typical after a walker-spec expansion: the sibling has a field
    // that was deep-cloned from the source and never sent to the LLM.
    // Without the deep-clone check, the diff would happily "reuse"
    // the un-translated value forever.
    const current = [{ id: 'disposition.registers[_key=="r1"].name', sourceText: 'Hoofdwerk' }]
    const previousSource = [
      { id: 'disposition.registers[_key=="r1"].name', sourceText: 'Hoofdwerk' },
    ]
    const previousTranslation = [
      { id: 'disposition.registers[_key=="r1"].name', sourceText: 'Hoofdwerk' },
    ]
    const result = diffUnits(current, previousSource, previousTranslation)
    expect(result.changed).toEqual(current)
    expect(result.reuseTranslated).toEqual([])
  })

  it('falls back to fresh translation when no previous data', () => {
    const current = [{ id: 'title', sourceText: 'Hello' }]
    const result = diffUnits(current, undefined, undefined)
    expect(result.changed).toEqual(current)
    expect(result.reuseTranslated).toEqual([])
    expect(result.removedIds).toEqual([])
  })

  it('falls back to source text when neither translator nor reused covers a unit', () => {
    const source = [{ id: 'a', sourceText: 'A' }]
    expect(combineTranslations(source, [], [])).toEqual([{ id: 'a', sourceText: 'A' }])
  })

  it('combines translator output and reused units in source order', () => {
    const source = [
      { id: 'block[0]', sourceText: 'A' },
      { id: 'block[1]', sourceText: 'B' },
      { id: 'block[2]', sourceText: 'C' },
    ]
    const fromTranslator = [{ id: 'block[1]', sourceText: 'B-new' }]
    const reused = [
      { id: 'block[0]', sourceText: 'A-old' },
      { id: 'block[2]', sourceText: 'C-old' },
    ]
    expect(combineTranslations(source, fromTranslator, reused)).toEqual([
      { id: 'block[0]', sourceText: 'A-old' },
      { id: 'block[1]', sourceText: 'B-new' },
      { id: 'block[2]', sourceText: 'C-old' },
    ])
  })
})
