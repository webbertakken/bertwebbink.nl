import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'

import { highlight } from './highlight'

function html(node: unknown) {
  const { container } = render(<>{node as React.ReactNode}</>)
  return container.innerHTML
}

describe('highlight', () => {
  describe('empty / no-token input', () => {
    it('returns null for null/undefined/empty text', () => {
      expect(highlight('', ['bach'])).toBeNull()
      expect(highlight(null as unknown as string, ['bach'])).toBeNull()
      expect(highlight(undefined as unknown as string, ['bach'])).toBeNull()
    })

    it('returns the text unchanged when no tokens are given', () => {
      expect(html(highlight('Bach symphony', []))).toBe('Bach symphony')
    })

    it('ignores empty-string tokens', () => {
      expect(html(highlight('Bach', ['']))).toBe('Bach')
    })
  })

  describe('single-token matching', () => {
    it('wraps a whole-word match in <mark>', () => {
      const out = html(highlight('Bach', ['bach']))
      expect(out).toBe('<mark>Bach</mark>')
    })

    it('matches case-insensitively', () => {
      expect(html(highlight('BACH', ['bach']))).toBe('<mark>BACH</mark>')
      expect(html(highlight('bach', ['BACH']))).toBe('<mark>bach</mark>')
    })

    it('extends the highlight across letters/digits/marks (prefix match)', () => {
      // "bach" token highlights "Bachs" entirely \u2014 mirrors GROQ prefix matching.
      expect(html(highlight('Bachs', ['bach']))).toBe('<mark>Bachs</mark>')
    })

    it('preserves surrounding text', () => {
      const out = html(highlight('I love Bach symphonies', ['bach']))
      expect(out).toBe('I love <mark>Bach</mark> symphonies')
    })

    it('only matches at word starts \u2014 not mid-word', () => {
      // "ach" should NOT highlight "Bach" because the match is mid-word.
      const out = html(highlight('Bach', ['ach']))
      expect(out).toBe('Bach')
    })

    it('matches multiple occurrences in the same text', () => {
      const out = html(highlight('Bach Bach Bach', ['bach']))
      expect(out).toBe('<mark>Bach</mark> <mark>Bach</mark> <mark>Bach</mark>')
    })
  })

  describe('multi-token matching', () => {
    it('wraps each matching token independently', () => {
      const out = html(highlight('Bach symphony in D', ['bach', 'symphony']))
      expect(out).toBe('<mark>Bach</mark> <mark>symphony</mark> in D')
    })

    it('handles overlapping prefix tokens by taking the first match', () => {
      // "bach" and "bachs" both match "Bachs" \u2014 first listed wins.
      const out = html(highlight('Bachs', ['bach', 'bachs']))
      expect(out).toBe('<mark>Bachs</mark>')
    })
  })

  describe('XSS safety', () => {
    it('does not interpret HTML in the input text', () => {
      const out = html(highlight('<script>alert(1)</script>', ['script']))
      // React JSX-escapes the input \u2014 the output contains the literal &lt;
      expect(out).toContain('&lt;')
      expect(out).toContain('<mark>')
      // Crucially: no actual <script> element in the output.
      expect(out).not.toContain('<script>')
    })

    it('does not interpret regex metacharacters in tokens', () => {
      // "(.+)" is a regex special pattern; must not match anything.
      const out = html(highlight('Bach symphony', ['(.+)']))
      expect(out).toBe('Bach symphony')
    })
  })

  describe('non-Latin scripts', () => {
    it('highlights CJK runs as a single span when the token is a prefix', () => {
      // CJK content has no inter-char whitespace — the entire string is one
      // GROQ token. Highlighting the whole run mirrors what `match $token*`
      // actually matched on the server.
      const out = html(highlight('\u30d0\u30c3\u30cf\u3068\u30e2\u30fc\u30c4\u30a1\u30eb\u30c8', ['\u30d0\u30c3\u30cf']))
      expect(out).toBe('<mark>\u30d0\u30c3\u30cf\u3068\u30e2\u30fc\u30c4\u30a1\u30eb\u30c8</mark>')
    })

    it('separates CJK runs by whitespace', () => {
      const out = html(highlight('\u30d0\u30c3\u30cf \u30e2\u30fc\u30c4\u30a1\u30eb\u30c8', ['\u30d0\u30c3\u30cf']))
      expect(out).toBe('<mark>\u30d0\u30c3\u30cf</mark> \u30e2\u30fc\u30c4\u30a1\u30eb\u30c8')
    })

    it('highlights Devanagari with combining marks intact', () => {
      const out = html(highlight('\u0939\u093f\u0928\u094d\u0926\u0940 \u092d\u093e\u0937\u093e', ['\u0939\u093f\u0928\u094d\u0926\u0940']))
      expect(out).toContain('<mark>\u0939\u093f\u0928\u094d\u0926\u0940</mark>')
    })
  })
})
