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

  it('returns undefined for paths that traverse a non-object', () => {
    expect(readPath({ x: 'string' }, 'x.y')).toBeUndefined()
    expect(readPath({ list: [1, 2] }, 'list[10].nope')).toBeUndefined()
    expect(readPath({}, 'missing.deep.path')).toBeUndefined()
  })

  it('readPath supports an index segment that hits an array element', () => {
    expect(readPath({ list: ['a', 'b', 'c'] }, 'list[1]')).toBe('b')
  })

  it('writePath replaces non-object intermediates with a fresh object', () => {
    const result = writePath({ x: 'leaf' }, 'x.y', 'next')
    expect(result).toEqual({ x: { y: 'next' } })
  })

  it('writePath traverses index segments en route to a property', () => {
    const doc = { list: [{ value: 'a' }, { value: 'b' }] }
    const result = writePath(doc, 'list[1].value', 'B')
    expect(
      (result.list as Array<{ value: string }>)[1].value,
    ).toBe('B')
  })

  it('writePath bails when an index segment lands on a non-array intermediate', () => {
    const result = writePath({ x: 'not-an-array' }, 'x[0].leaf', 'X')
    expect(result).toEqual({ x: {} })
  })

  it('writePath bails when a keyMatch segment lands on a non-array intermediate', () => {
    const result = writePath({ x: 'not-an-array' }, 'x[_key=="a"].leaf', 'X')
    expect(result).toEqual({ x: {} })
  })

  it('writePath replaces a null intermediate with a fresh object and writes the leaf', () => {
    const result = writePath({ x: null }, 'x.y.z', 'X')
    expect(result).toEqual({ x: { y: { z: 'X' } } })
  })

  it('writePath bails when prop traversal hits an array intermediate', () => {
    const result = writePath({ list: [1, 2, 3] }, 'list.foo.bar', 'X')
    // The prop check sees `cursor` is an array and bails immediately.
    expect(result).toEqual({ list: [1, 2, 3] })
  })

  it('writePath bails when keyMatch lookup fails', () => {
    const result = writePath(
      { list: [{ _key: 'a', value: 1 }] },
      'list[_key=="missing"].value',
      99,
    )
    expect(result).toEqual({ list: [{ _key: 'a', value: 1 }] })
  })

  it('throws on unbalanced or unsupported path segments', () => {
    expect(() => readPath({}, 'list[0')).toThrow(/Unbalanced/)
    expect(() => readPath({}, 'list[xx]')).toThrow(/Unsupported segment/)
  })

  it('readPath returns undefined for [index] on a non-array', () => {
    expect(readPath({ list: 'string' }, 'list[0]')).toBeUndefined()
  })

  it('readPath returns undefined for [_key==] on a non-array', () => {
    expect(readPath({ list: 'string' }, 'list[_key=="a"]')).toBeUndefined()
  })

  it('writePath bails when intermediate keyMatch lookup returns undefined', () => {
    const result = writePath(
      { list: [{ _key: 'a' }] },
      'list[_key=="missing"].leaf',
      'X',
    )
    expect(result).toEqual({ list: [{ _key: 'a' }] })
  })
})
