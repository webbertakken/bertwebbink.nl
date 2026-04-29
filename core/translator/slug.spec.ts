import { describe, expect, it } from 'vitest'

import { applyTranslatedSlug, nextSlugForTranslation, slugify } from './slug'

describe('slugify', () => {
  it('lowercases and replaces whitespace with dashes', () => {
    expect(slugify('Hello World')).toBe('hello-world')
  })

  it('strips diacritics from latin text', () => {
    expect(slugify('café')).toBe('cafe')
    expect(slugify('naïve résumé')).toBe('naive-resume')
  })

  it('keeps CJK characters intact', () => {
    expect(slugify('日本語のタイトル')).toBe('日本語のタイトル')
  })

  it('removes punctuation and trims dashes', () => {
    expect(slugify('  -- A title? -- ')).toBe('a-title')
  })

  it('caps long output at 96 chars', () => {
    const long = 'a'.repeat(200)
    expect(slugify(long).length).toBe(96)
  })
})

describe('nextSlugForTranslation', () => {
  it('derives a fresh slug when there is no previous slug', () => {
    expect(
      nextSlugForTranslation({ newTranslatedTitle: 'Hello World' }),
    ).toBe('hello-world')
  })

  it('refreshes when the previous slug looks machine-generated', () => {
    expect(
      nextSlugForTranslation({
        newTranslatedTitle: 'New Title',
        previousTranslatedTitle: 'Old Title',
        existingSlug: 'old-title',
      }),
    ).toBe('new-title')
  })

  it('preserves a manual override when the existing slug differs from the auto value', () => {
    expect(
      nextSlugForTranslation({
        newTranslatedTitle: 'New Title',
        previousTranslatedTitle: 'Old Title',
        existingSlug: 'editor-pinned',
      }),
    ).toBeNull()
  })

  it('leaves the slug alone when no previous title is known', () => {
    expect(
      nextSlugForTranslation({
        newTranslatedTitle: 'New Title',
        existingSlug: 'whatever',
      }),
    ).toBeNull()
  })

  it('returns null when both new title and existing slug are empty', () => {
    expect(nextSlugForTranslation({ newTranslatedTitle: '   ' })).toBeNull()
  })

  it('returns null when the new title slugifies to empty even with a refresh path', () => {
    expect(
      nextSlugForTranslation({
        newTranslatedTitle: '   ',
        previousTranslatedTitle: 'Old Title',
        existingSlug: 'old-title',
      }),
    ).toBeNull()
  })
})

describe('applyTranslatedSlug', () => {
  it('returns the input doc unchanged when no title unit is present', () => {
    const doc = { title: 'A', slug: { _type: 'slug', current: 'a' } }
    expect(applyTranslatedSlug(doc, undefined, [])).toBe(doc)
  })

  it('writes a fresh slug when the previous sibling slug matches the auto value', () => {
    const doc = { title: '[en] Nieuw', slug: { _type: 'slug', current: 'nieuw' } }
    const prev = { title: 'Nieuw', slug: { _type: 'slug', current: 'nieuw' } }
    const result = applyTranslatedSlug(doc, prev, [
      { id: 'title', sourceText: '[en] Nieuw' },
    ])
    const slug = (result as { slug: { current: string } }).slug
    expect(slug.current).toBe('en-nieuw')
  })

  it('keeps a manual slug when previous sibling slug diverges from auto', () => {
    const doc = { title: '[en] Nieuw' }
    const prev = { title: 'Nieuw', slug: { _type: 'slug', current: 'editor-pinned' } }
    const result = applyTranslatedSlug(doc, prev, [
      { id: 'title', sourceText: '[en] Nieuw' },
    ])
    expect((result as { slug?: { current?: string } }).slug).toBeUndefined()
  })
})
