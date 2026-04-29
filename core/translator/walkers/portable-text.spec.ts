import { describe, expect, it } from 'vitest'

import { applyPortableTextUnits, extractPortableTextUnits } from './portable-text'

describe('portable-text walker', () => {
  it('extracts plain prose blocks', () => {
    const blocks = [
      {
        _key: 'a',
        _type: 'block',
        style: 'normal',
        children: [{ _key: 's1', _type: 'span', text: 'Hello world.' }],
        markDefs: [],
      },
    ]
    expect(extractPortableTextUnits(blocks)).toEqual([
      { id: 'block[0]', sourceText: 'Hello world.' },
    ])
  })

  it('round-trips marks via inline `<mN>` markers', () => {
    const blocks = [
      {
        _key: 'a',
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          { _key: 's1', _type: 'span', text: 'A ' },
          { _key: 's2', _type: 'span', text: 'cathedral', marks: ['em'] },
          { _key: 's3', _type: 'span', text: ' organ.' },
        ],
      },
    ]
    const units = extractPortableTextUnits(blocks)
    expect(units).toHaveLength(1)
    expect(units[0].sourceText).toBe('A <m2>cathedral</m2> organ.')

    // Translator preserves the marker verbatim.
    const translated = [{ id: 'block[0]', sourceText: 'Een <m2>kathedraal</m2>orgel.' }]
    const back = applyPortableTextUnits(blocks, translated)
    expect(back[0]).toMatchObject({
      _key: 'a',
      _type: 'block',
      children: [
        expect.objectContaining({ text: 'Een ', _type: 'span' }),
        expect.objectContaining({ text: 'kathedraal', _type: 'span', marks: ['em'] }),
        expect.objectContaining({ text: 'orgel.', _type: 'span' }),
      ],
    })
  })

  it('preserves embedded media blocks structurally; only translates caption/alt', () => {
    const blocks = [
      {
        _key: 'img',
        _type: 'image',
        asset: { _ref: 'image-x', _type: 'reference' },
        alt: 'A church organ',
        caption: 'Photographed at dusk.',
      },
    ]
    const units = extractPortableTextUnits(blocks)
    expect(units).toEqual([
      { id: 'block[0].alt', sourceText: 'A church organ' },
      { id: 'block[0].caption', sourceText: 'Photographed at dusk.' },
    ])

    const back = applyPortableTextUnits(blocks, [
      { id: 'block[0].alt', sourceText: 'Een kerkorgel' },
      { id: 'block[0].caption', sourceText: 'In de schemering.' },
    ])
    expect(back[0]).toEqual({
      _key: 'img',
      _type: 'image',
      asset: { _ref: 'image-x', _type: 'reference' },
      alt: 'Een kerkorgel',
      caption: 'In de schemering.',
    })
  })

  it('leaves unknown _types untouched when no translatable leaf fields', () => {
    const blocks = [
      { _key: 'd', _type: 'divider' },
      { _key: 'e', _type: 'embed', url: 'https://example.test/x' },
    ]
    expect(extractPortableTextUnits(blocks)).toEqual([])
    expect(applyPortableTextUnits(blocks, [])).toEqual([
      { _key: 'd', _type: 'divider' },
      { _key: 'e', _type: 'embed', url: 'https://example.test/x' },
    ])
  })

  it('preserves _key on every block in apply', () => {
    const blocks = [
      {
        _key: 'k1',
        _type: 'block',
        style: 'normal',
        children: [{ _key: 's', _type: 'span', text: 'one' }],
        markDefs: [],
      },
      {
        _key: 'k2',
        _type: 'block',
        style: 'normal',
        children: [{ _key: 's', _type: 'span', text: 'two' }],
        markDefs: [],
      },
    ]
    const back = applyPortableTextUnits(blocks, [
      { id: 'block[0]', sourceText: '1' },
      { id: 'block[1]', sourceText: '2' },
    ])
    expect(back.map((b: { _key?: string }) => b._key)).toEqual(['k1', 'k2'])
  })

  it('keeps untranslated blocks verbatim', () => {
    const blocks = [
      {
        _key: 'a',
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [{ _key: 's', _type: 'span', text: 'one' }],
      },
      {
        _key: 'b',
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [{ _key: 's', _type: 'span', text: 'two' }],
      },
    ]
    const back = applyPortableTextUnits(blocks, [
      { id: 'block[1]', sourceText: 'twee' },
    ])
    expect((back[0] as { children: Array<{ text: string }> }).children[0].text).toBe('one')
    expect((back[1] as { children: Array<{ text: string }> }).children[0].text).toBe('twee')
  })
})
