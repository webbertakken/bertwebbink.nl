import { describe, expect, it } from 'vitest'

import { searchResultHref } from './url'

describe('searchResultHref', () => {
  describe('journal', () => {
    it('returns a typed href with the slug param', () => {
      expect(searchResultHref({ _type: 'journal', slug: 'first-organ-trip' })).toEqual({
        pathname: '/journal/[slug]',
        params: { slug: 'first-organ-trip' },
      })
    })

    it('returns null when the slug is missing', () => {
      expect(searchResultHref({ _type: 'journal' })).toBeNull()
      expect(searchResultHref({ _type: 'journal', slug: null })).toBeNull()
      expect(searchResultHref({ _type: 'journal', slug: '' })).toBeNull()
    })
  })

  describe('organ', () => {
    it('returns a typed href with the slug param', () => {
      expect(searchResultHref({ _type: 'organ', slug: 'hoogeveen-de-opgang' })).toEqual({
        pathname: '/organs/[slug]',
        params: { slug: 'hoogeveen-de-opgang' },
      })
    })

    it('returns null when the slug is missing', () => {
      expect(searchResultHref({ _type: 'organ' })).toBeNull()
      expect(searchResultHref({ _type: 'organ', slug: null })).toBeNull()
    })
  })

  describe('score', () => {
    it('returns the scores pathname with a zero-padded edition hash', () => {
      expect(searchResultHref({ _type: 'score', editionNumber: 1 })).toEqual({
        pathname: '/scores',
        hash: 'ed-01',
      })
    })

    it('zero-pads to two digits but does not truncate three-digit editions', () => {
      expect(searchResultHref({ _type: 'score', editionNumber: 12 })).toEqual({
        pathname: '/scores',
        hash: 'ed-12',
      })
      expect(searchResultHref({ _type: 'score', editionNumber: 123 })).toEqual({
        pathname: '/scores',
        hash: 'ed-123',
      })
    })

    it('returns the scores pathname without a hash when editionNumber is missing', () => {
      expect(searchResultHref({ _type: 'score' })).toEqual({ pathname: '/scores' })
      expect(searchResultHref({ _type: 'score', editionNumber: null })).toEqual({
        pathname: '/scores',
      })
    })
  })

  describe('singletons', () => {
    it('returns the about pathname', () => {
      expect(searchResultHref({ _type: 'about' })).toEqual({ pathname: '/about' })
    })

    it('returns the elsewhere pathname', () => {
      expect(searchResultHref({ _type: 'elsewhere' })).toEqual({ pathname: '/elsewhere' })
    })

    it('returns the privacy pathname', () => {
      expect(searchResultHref({ _type: 'privacy' })).toEqual({ pathname: '/privacy' })
    })
  })

  describe('unknown types', () => {
    it('returns null for an unrecognised _type', () => {
      // @ts-expect-error \u2014 deliberately unsupported type to exercise the runtime guard
      expect(searchResultHref({ _type: 'settings' })).toBeNull()
    })
  })
})
