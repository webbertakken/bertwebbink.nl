import { describe, expect, it } from 'vitest'

import {
  applyStringFields,
  extractStringFields,
  readPath,
  writePath,
} from './fields'

describe('field walker', () => {
  it('extracts plain string fields by dotted path', () => {
    const doc = { title: 'A title', excerpt: 'A short excerpt' }
    expect(extractStringFields(doc, ['title', 'excerpt'])).toEqual([
      { id: 'title', sourceText: 'A title' },
      { id: 'excerpt', sourceText: 'A short excerpt' },
    ])
  })

  it('skips missing or empty values', () => {
    const doc = { title: '', subtitle: null, body: '   ' }
    expect(extractStringFields(doc as never, ['title', 'subtitle', 'body', 'missing'])).toEqual([])
  })

  it('reads nested paths', () => {
    const doc = { coverImage: { alt: 'cover alt', caption: 'a caption' } }
    expect(extractStringFields(doc, ['coverImage.alt', 'coverImage.caption'])).toEqual([
      { id: 'coverImage.alt', sourceText: 'cover alt' },
      { id: 'coverImage.caption', sourceText: 'a caption' },
    ])
  })

  it('writes nested paths back without mutating the input', () => {
    const doc = { title: 'Hello', coverImage: { alt: 'cover' } }
    const result = applyStringFields(doc, [
      { id: 'title', sourceText: 'Hallo' },
      { id: 'coverImage.alt', sourceText: 'omslag' },
    ])
    expect(result).toEqual({ title: 'Hallo', coverImage: { alt: 'omslag' } })
    expect(doc).toEqual({ title: 'Hello', coverImage: { alt: 'cover' } })
  })

  it('supports `[index]` and `[_key=="..."]` segments via readPath/writePath', () => {
    const doc = {
      list: [
        { _key: 'a', label: 'alpha' },
        { _key: 'b', label: 'beta' },
      ],
    }
    expect(readPath(doc, 'list[0].label')).toBe('alpha')
    expect(readPath(doc, 'list[_key=="b"].label')).toBe('beta')

    const written = writePath(doc, 'list[_key=="b"].label', 'b\u00e8ta')
    expect((written.list as Array<{ _key: string; label: string }>)[1].label).toBe('b\u00e8ta')
    // Original untouched.
    expect((doc.list as Array<{ _key: string; label: string }>)[1].label).toBe('beta')
  })
})
