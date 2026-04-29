import { describe, expect, it } from 'vitest'

import { extractTokens, sanitiseQuery } from './sanitise'

describe('sanitiseQuery', () => {
  describe('empty / too-short input', () => {
    it('returns null for an empty string', () => {
      expect(sanitiseQuery('')).toBeNull()
    })

    it('returns null for whitespace-only input', () => {
      expect(sanitiseQuery('   ')).toBeNull()
      expect(sanitiseQuery('\t\n')).toBeNull()
    })

    it('returns null when the only token is below min length (2)', () => {
      expect(sanitiseQuery('a')).toBeNull()
      expect(sanitiseQuery(' a ')).toBeNull()
    })

    it('returns null when every token is below min length', () => {
      expect(sanitiseQuery('a b c')).toBeNull()
    })
  })

  describe('single-token queries', () => {
    it('lowercases and appends a wildcard', () => {
      expect(sanitiseQuery('Bach')).toBe('bach*')
    })

    it('preserves already-lowercase input', () => {
      expect(sanitiseQuery('bach')).toBe('bach*')
    })

    it('trims surrounding whitespace', () => {
      expect(sanitiseQuery('  bach  ')).toBe('bach*')
    })
  })

  describe('multi-token queries', () => {
    it('joins tokens with a single space, each suffixed with a wildcard', () => {
      expect(sanitiseQuery('bach symphony')).toBe('bach* symphony*')
    })

    it('collapses multiple internal whitespace runs into one separator', () => {
      expect(sanitiseQuery('bach    symphony')).toBe('bach* symphony*')
    })

    it('drops sub-min-length tokens but keeps the rest', () => {
      expect(sanitiseQuery('a bach b symphony')).toBe('bach* symphony*')
    })
  })

  describe('punctuation handling', () => {
    it("treats ASCII apostrophes as a separator (\"bach's\" -> bach*; the lone 's' falls under min length)", () => {
      expect(sanitiseQuery("bach's")).toBe('bach*')
    })

    it('treats unicode curly apostrophes the same way', () => {
      expect(sanitiseQuery('bach\u2019s')).toBe('bach*')
    })

    it('strips standalone punctuation tokens entirely', () => {
      expect(sanitiseQuery('bach & co.')).toBe('bach* co*')
    })

    it('strips trailing punctuation from a token', () => {
      expect(sanitiseQuery('bach,')).toBe('bach*')
      expect(sanitiseQuery('bach!')).toBe('bach*')
      expect(sanitiseQuery('bach?')).toBe('bach*')
    })

    it('strips leading punctuation from a token', () => {
      expect(sanitiseQuery('"bach"')).toBe('bach*')
    })

    it('splits compound tokens on inner punctuation (do-re-mi yields three tokens)', () => {
      expect(sanitiseQuery('do-re-mi')).toBe('do* re* mi*')
    })
  })

  describe('NFC normalisation', () => {
    it('normalises NFD-decomposed input to NFC before tokenising', () => {
      // \u00e9 in NFD is `e` + combining acute (\u0301). NFC folds back to \u00e9.
      const decomposed = 'caf\u0065\u0301'
      const composed = 'caf\u00e9'
      expect(decomposed).not.toBe(composed)
      expect(sanitiseQuery(decomposed)).toBe(sanitiseQuery(composed))
      expect(sanitiseQuery(decomposed)).toBe('caf\u00e9*')
    })
  })

  describe('extractTokens (shared with the highlighter)', () => {
    it('returns an empty array for empty / whitespace input', () => {
      expect(extractTokens('')).toEqual([])
      expect(extractTokens('   ')).toEqual([])
    })

    it('returns the bare lowercase tokens (no wildcards)', () => {
      expect(extractTokens("Bach's symphony")).toEqual(['bach', 'symphony'])
    })

    it('drops sub-min-length tokens but keeps the rest', () => {
      expect(extractTokens('a bach b symphony')).toEqual(['bach', 'symphony'])
    })
  })

  describe('non-Latin scripts', () => {
    it('preserves CJK characters and appends a wildcard', () => {
      expect(sanitiseQuery('\u30d0\u30c3\u30cf')).toBe('\u30d0\u30c3\u30cf*')
    })

    it('preserves Devanagari with combining marks', () => {
      // \u0939\u093f\u0928\u094d\u0926\u0940 = "Hindi". Combining marks must survive.
      expect(sanitiseQuery('\u0939\u093f\u0928\u094d\u0926\u0940')).toBe(
        '\u0939\u093f\u0928\u094d\u0926\u0940*',
      )
    })

    it('preserves Korean Hangul', () => {
      expect(sanitiseQuery('\ubc14\ud750')).toBe('\ubc14\ud750*')
    })
  })
})
