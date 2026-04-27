import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'

import { renderEmphasised, renderInlineItalic } from './renderEmphasised'

function html(node: unknown) {
  const { container } = render(<>{node as React.ReactNode}</>)
  return container.innerHTML
}

describe('renderEmphasised', () => {
  it('returns null for null/undefined/empty input', () => {
    expect(renderEmphasised(null)).toBeNull()
    expect(renderEmphasised(undefined)).toBeNull()
    expect(renderEmphasised('')).toBeNull()
  })

  it('wraps {{double-brace}} segments in <em> and leaves the rest as plain spans', () => {
    const out = html(renderEmphasised('Editions, fingerings, {{working scores}}.'))
    expect(out).toContain('<em class="font-normal italic">working scores</em>')
    expect(out).toContain('Editions, fingerings, ')
    expect(out).toContain('.')
  })

  it('leaves a string with no markers as plain text in spans', () => {
    const out = html(renderEmphasised('plain text only'))
    expect(out).not.toContain('<em')
    expect(out).toContain('plain text only')
  })

  it('handles multiple emphasis markers in one string', () => {
    const out = html(renderEmphasised('{{first}} and then {{second}}'))
    expect(out.match(/<em /g)).toHaveLength(2)
  })
})

describe('renderInlineItalic', () => {
  it('returns null for null/undefined/empty input', () => {
    expect(renderInlineItalic(null)).toBeNull()
    expect(renderInlineItalic(undefined)).toBeNull()
    expect(renderInlineItalic('')).toBeNull()
  })

  it('wraps *single-asterisk* segments in <em>', () => {
    const out = html(renderInlineItalic('Praeludium in *g-moll*'))
    expect(out).toContain('<em class="font-normal italic">g-moll</em>')
    expect(out).toContain('Praeludium in')
  })

  it('handles multiple asterisk pairs', () => {
    const out = html(renderInlineItalic('Trio Sonata No. 1 in *E-flat* — *BWV 525*'))
    expect(out.match(/<em /g)).toHaveLength(2)
  })

  it('passes through text with no asterisk pairs', () => {
    const out = html(renderInlineItalic('Plain title'))
    expect(out).not.toContain('<em')
    expect(out).toContain('Plain title')
  })

  it('does not wrap a stray single asterisk', () => {
    // No pair \u2192 the regex split keeps the string as one plain segment.
    const out = html(renderInlineItalic('A * stray asterisk'))
    expect(out).not.toContain('<em')
    expect(out).toContain('A * stray asterisk')
  })
})
