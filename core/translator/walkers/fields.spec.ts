import { describe, expect, it } from 'vitest'

import {
  applyStringFields,
  expandWildcardPair,
  expandWildcards,
  extractDerivedFields,
  extractStringFields,
  readPath,
  specPathMatches,
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

  it('expandWildcards returns the path verbatim when there is no wildcard', () => {
    expect(expandWildcards({}, 'foo.bar')).toEqual(['foo.bar'])
  })

  it('expandWildcards walks an array of keyed items', () => {
    const doc = {
      list: [
        { _key: 'a', name: 'first' },
        { _key: 'b', name: 'second' },
      ],
    }
    expect(expandWildcards(doc, 'list[*].name')).toEqual([
      'list[_key=="a"].name',
      'list[_key=="b"].name',
    ])
  })

  it('expandWildcards expands nested wildcards (e.g. registers[*].stops[*])', () => {
    const doc = {
      registers: [
        {
          _key: 'r1',
          stops: [
            { _key: 's1', name: 'Bordun' },
            { _key: 's2', name: 'Principal' },
          ],
        },
        { _key: 'r2', stops: [{ _key: 's3', name: 'Trompete' }] },
      ],
    }
    expect(expandWildcards(doc, 'registers[*].stops[*].name')).toEqual([
      'registers[_key=="r1"].stops[_key=="s1"].name',
      'registers[_key=="r1"].stops[_key=="s2"].name',
      'registers[_key=="r2"].stops[_key=="s3"].name',
    ])
  })

  it('expandWildcards skips items without a string `_key` and yields nothing for non-array prefixes', () => {
    const doc = {
      list: [
        { _key: 'a' }, // ok
        { name: 'no-key' },
        null,
        'not-an-object',
        { _key: 42 }, // numeric key, skipped
      ],
      nope: 'string-not-array',
    }
    expect(expandWildcards(doc as never, 'list[*].name')).toEqual([
      'list[_key=="a"].name',
    ])
    expect(expandWildcards(doc as never, 'nope[*].x')).toEqual([])
  })

  it('extractStringFields skips empty values and expands wildcards', () => {
    const doc = {
      list: [
        { _key: 'a', name: 'Alpha' },
        { _key: 'b', name: '' },
        { _key: 'c', name: 'Gamma' },
      ],
    }
    expect(extractStringFields(doc, ['list[*].name'])).toEqual([
      { id: 'list[_key=="a"].name', sourceText: 'Alpha' },
      { id: 'list[_key=="c"].name', sourceText: 'Gamma' },
    ])
  })

  it('specPathMatches matches concrete unit ids against wildcard spec paths', () => {
    expect(specPathMatches('foo.bar', 'foo.bar')).toBe(true)
    expect(specPathMatches('foo.bar', 'foo.baz')).toBe(false)
    expect(
      specPathMatches('list[*].name', 'list[_key=="abc"].name'),
    ).toBe(true)
    expect(
      specPathMatches('list[*].name', 'list[_key=="abc"].label'),
    ).toBe(false)
    expect(
      specPathMatches(
        'registers[*].stops[*].translation',
        'registers[_key=="r"].stops[_key=="s"].translation',
      ),
    ).toBe(true)
  })

  it('expandWildcardPair mirrors resolved keys into a write path', () => {
    const doc = {
      registers: [
        {
          _key: 'r1',
          stops: [{ _key: 's1' }, { _key: 's2' }],
        },
      ],
    }
    expect(
      expandWildcardPair(
        doc,
        'registers[*].stops[*].name',
        'registers[*].stops[*].translation',
      ),
    ).toEqual([
      [
        'registers[_key=="r1"].stops[_key=="s1"].name',
        'registers[_key=="r1"].stops[_key=="s1"].translation',
      ],
      [
        'registers[_key=="r1"].stops[_key=="s2"].name',
        'registers[_key=="r1"].stops[_key=="s2"].translation',
      ],
    ])
  })

  it('expandWildcardPair returns the templates verbatim when neither has a wildcard', () => {
    expect(expandWildcardPair({}, 'foo.name', 'foo.translation')).toEqual([
      ['foo.name', 'foo.translation'],
    ])
  })

  it('expandWildcardPair yields nothing when the read prefix is not an array', () => {
    expect(
      expandWildcardPair({ x: 'string' }, 'x[*].name', 'x[*].translation'),
    ).toEqual([])
  })

  it('expandWildcardPair skips items with no string `_key`', () => {
    const doc = {
      list: [
        { _key: 'a' },
        { name: 'no-key' },
        null,
      ],
    }
    expect(
      expandWildcardPair(
        doc as never,
        'list[*].name',
        'list[*].translation',
      ),
    ).toEqual([
      [
        'list[_key=="a"].name',
        'list[_key=="a"].translation',
      ],
    ])
  })

  it('extractDerivedFields emits units keyed by the write path', () => {
    const doc = {
      stops: [
        { _key: 's1', name: 'Bordun' },
        { _key: 's2', name: '   ' }, // whitespace -> skipped
        { _key: 's3', name: 'Vox Celeste' },
      ],
    }
    const units = extractDerivedFields(doc, [
      {
        readPath: 'stops[*].name',
        writePath: 'stops[*].translation',
        context: 'Organ stop name.',
      },
    ])
    expect(units).toEqual([
      {
        id: 'stops[_key=="s1"].translation',
        sourceText: 'Bordun',
        context: 'Organ stop name.',
      },
      {
        id: 'stops[_key=="s3"].translation',
        sourceText: 'Vox Celeste',
        context: 'Organ stop name.',
      },
    ])
  })

  it('extractDerivedFields omits the context property when no context is configured', () => {
    const doc = { stops: [{ _key: 's1', name: 'Bordun' }] }
    const units = extractDerivedFields(doc, [
      { readPath: 'stops[*].name', writePath: 'stops[*].translation' },
    ])
    expect(units).toEqual([
      { id: 'stops[_key=="s1"].translation', sourceText: 'Bordun' },
    ])
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
