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

  it('joins consecutive bare-text matches into one span when a stray `<` interrupts them', () => {
    const blocks = [
      {
        _key: 'a',
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [{ _key: 's', _type: 'span', text: 'plain' }],
      },
    ]
    // The translated string contains a bare `<` that doesn't match `<mN>`,
    // so the regex breaks the bare-text run into two halves. They must be
    // re-joined into a single plain span (covers `last.text += match[3]`).
    const back = applyPortableTextUnits(blocks, [
      { id: 'block[0]', sourceText: 'one < two' },
    ])
    const block = back[0] as { children: Array<{ text: string; marks?: string[] }> }
    expect(block.children).toHaveLength(1)
    expect(block.children[0].text).toBe('one  two')
  })

  it('appends bare text after a marked span back into a single span', () => {
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
    // Multiple bare-text segments arrive one after another in the translation.
    const back = applyPortableTextUnits(blocks, [
      { id: 'block[0]', sourceText: 'Een gigantisch <m2>kathedraal</m2>orgel groot.' },
    ])
    const block = back[0] as { children: Array<{ text: string; marks?: string[] }> }
    // Bare text after the marked span should be folded into the immediately
    // preceding plain (no-marks) span rather than spawning a new span.
    const last = block.children[block.children.length - 1]
    expect(last.marks).toBeUndefined()
    expect(last.text).toContain('orgel')
    expect(last.text).toContain('groot')
  })

  it('handles a translated block with no markers (collapsed children path)', () => {
    const blocks = [
      {
        _key: 'a',
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          { _key: 's1', _type: 'span', text: 'plain ' },
          { _key: 's2', _type: 'span', text: 'text' },
        ],
      },
    ]
    const back = applyPortableTextUnits(blocks, [
      { id: 'block[0]', sourceText: 'translated text' },
    ])
    const block = back[0] as { children: Array<{ text: string }> }
    expect(block.children).toHaveLength(1)
    expect(block.children[0].text).toBe('translated text')
  })

  it('falls back to original children when the translated text is empty', () => {
    const blocks = [
      {
        _key: 'a',
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [{ _key: 's', _type: 'span', text: 'one' }],
      },
    ]
    const back = applyPortableTextUnits(blocks, [
      { id: 'block[0]', sourceText: '' },
    ])
    const block = back[0] as { children: Array<{ text: string }> }
    expect(block.children[0].text).toBe('one')
  })

  it('skips blocks whose merged text is whitespace-only', () => {
    const blocks = [
      {
        _key: 'a',
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [{ _key: 's', _type: 'span', text: '   ' }],
      },
    ]
    expect(extractPortableTextUnits(blocks)).toEqual([])
  })

  it('handles null / undefined block input', () => {
    expect(extractPortableTextUnits(null)).toEqual([])
    expect(extractPortableTextUnits(undefined)).toEqual([])
    expect(applyPortableTextUnits(null, [])).toEqual([])
  })

  it('handles a block with missing children array', () => {
    const blocks = [{ _key: 'a', _type: 'block', style: 'normal' } as never]
    expect(extractPortableTextUnits(blocks)).toEqual([])
  })

  it('rebuilds a block whose source span has no _key (falls back to span-N id)', () => {
    const blocks = [
      {
        _key: 'a',
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [{ _type: 'span', text: 'A ' }, { _type: 'span', text: 'B', marks: ['em'] }],
      },
    ]
    const back = applyPortableTextUnits(blocks, [
      { id: 'block[0]', sourceText: 'X <m2>Y</m2>' },
    ])
    const block = back[0] as { children: Array<{ _key?: string; text: string }> }
    expect(block.children[1]._key).toMatch(/span-/)
  })

  it('handles a translator-hallucinated marker pointing at an unmarked source span', () => {
    const blocks = [
      {
        _key: 'a',
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [{ _key: 's1', _type: 'span', text: 'one' }],
      },
    ]
    // Translator wraps the text in `<m1>...</m1>` even though source span 1
    // had no marks. The walker copes by emitting an unmarked span.
    const back = applyPortableTextUnits(blocks, [
      { id: 'block[0]', sourceText: '<m1>vertaald</m1>' },
    ])
    const block = back[0] as { children: Array<{ marks?: string[]; text: string }> }
    expect(block.children[0].marks).toBeUndefined()
    expect(block.children[0].text).toBe('vertaald')
  })

  it('falls back to undefined _key when no plain-text source span exists', () => {
    const blocks = [
      {
        _key: 'a',
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [{ _key: 's', _type: 'span', text: 'B', marks: ['em'] }],
      },
    ]
    // Translation introduces a fresh bare-text segment; no plain-text source
    // span to crib a `_key` from — falls through to the `?? undefined` path.
    const back = applyPortableTextUnits(blocks, [
      { id: 'block[0]', sourceText: '<m1>B</m1> tail' },
    ])
    const block = back[0] as { children: Array<{ _key?: string; text: string }> }
    const tail = block.children[block.children.length - 1]
    expect(tail.text).toContain('tail')
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
