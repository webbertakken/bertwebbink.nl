import { describe, expect, it } from 'vitest'

import { searchResultHref } from './url'

describe('searchResultHref', () => {
  describe('journal', () => {
    it('returns a locale-prefixed URL with the slug', () => {
      expect(searchResultHref({ _type: 'journal', slug: 'first-organ-trip' }, 'en')).toBe(
        '/en/journal/first-organ-trip',
      )
    })

    it('returns null when the slug is missing', () => {
      expect(searchResultHref({ _type: 'journal' }, 'en')).toBeNull()
      expect(searchResultHref({ _type: 'journal', slug: null }, 'en')).toBeNull()
      expect(searchResultHref({ _type: 'journal', slug: '' }, 'en')).toBeNull()
    })
  })

  describe('organ', () => {
    it('returns a locale-prefixed URL with the slug', () => {
      expect(searchResultHref({ _type: 'organ', slug: 'hoogeveen-de-opgang' }, 'nl')).toBe(
        '/nl/organs/hoogeveen-de-opgang',
      )
    })

    it('returns null when the slug is missing', () => {
      expect(searchResultHref({ _type: 'organ' }, 'en')).toBeNull()
      expect(searchResultHref({ _type: 'organ', slug: null }, 'en')).toBeNull()
    })
  })

  describe('score', () => {
    it('returns the scores URL with a zero-padded edition hash', () => {
      expect(searchResultHref({ _type: 'score', editionNumber: 1 }, 'en')).toBe('/en/scores#ed-01')
    })

    it('zero-pads to two digits but does not truncate three-digit editions', () => {
      expect(searchResultHref({ _type: 'score', editionNumber: 12 }, 'en')).toBe(
        '/en/scores#ed-12',
      )
      expect(searchResultHref({ _type: 'score', editionNumber: 123 }, 'en')).toBe(
        '/en/scores#ed-123',
      )
    })

    it('returns the scores URL without a hash when editionNumber is missing', () => {
      expect(searchResultHref({ _type: 'score' }, 'en')).toBe('/en/scores')
      expect(searchResultHref({ _type: 'score', editionNumber: null }, 'en')).toBe('/en/scores')
    })
  })

  describe('singletons', () => {
    it('returns the about URL', () => {
      expect(searchResultHref({ _type: 'about' }, 'en')).toBe('/en/about')
    })

    it('returns the elsewhere URL', () => {
      expect(searchResultHref({ _type: 'elsewhere' }, 'de')).toBe('/de/elsewhere')
    })

    it('returns the privacy URL', () => {
      expect(searchResultHref({ _type: 'privacy' }, 'ja')).toBe('/ja/privacy')
    })
  })

  describe('unknown types', () => {
    it('returns null for an unrecognised _type', () => {
      // @ts-expect-error — deliberately unsupported type to exercise the runtime guard
      expect(searchResultHref({ _type: 'settings' }, 'en')).toBeNull()
    })
  })
})
