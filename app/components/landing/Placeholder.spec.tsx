import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'

import { Placeholder } from './Placeholder'

describe('Placeholder', () => {
  it('renders the default label when none is provided', () => {
    const { getByText } = render(<Placeholder />)
    expect(getByText('[ organ photograph ]')).toBeTruthy()
  })

  it('renders the supplied label', () => {
    const { getByText } = render(<Placeholder label="Martinikerk" />)
    expect(getByText('[ Martinikerk ]')).toBeTruthy()
  })

  it('falls back to the warm tone when no seed is provided', () => {
    const { container } = render(<Placeholder />)
    const stripe = container.querySelector('.placeholder-stripe') as HTMLElement
    expect(stripe).toBeTruthy()
    expect(stripe.style.getPropertyValue('--stripe-a')).toContain('72')
  })

  it('produces a deterministic tone for the same seed', () => {
    const a = render(<Placeholder seed="urk-bethelkerk" />)
    const b = render(<Placeholder seed="urk-bethelkerk" />)
    const sa = a.container.querySelector('.placeholder-stripe') as HTMLElement
    const sb = b.container.querySelector('.placeholder-stripe') as HTMLElement
    expect(sa.style.getPropertyValue('--stripe-a')).toBe(sb.style.getPropertyValue('--stripe-a'))
    expect(sa.style.getPropertyValue('--stripe-b')).toBe(sb.style.getPropertyValue('--stripe-b'))
  })

  it('distributes seeds across all four tone buckets', () => {
    // Sample 200 distinct slug-like seeds and confirm we hit every bucket.
    const seen = new Set<string>()
    for (let i = 0; i < 200; i++) {
      const { container } = render(<Placeholder seed={`organ-${i}`} />)
      const el = container.querySelector('.placeholder-stripe') as HTMLElement
      seen.add(el.style.getPropertyValue('--stripe-a'))
    }
    // Four tones → four distinct --stripe-a values.
    expect(seen.size).toBe(4)
  })

  it('still renders for an empty-string seed (deterministic warm)', () => {
    const { container } = render(<Placeholder seed="" />)
    const el = container.querySelector('.placeholder-stripe') as HTMLElement
    expect(el).toBeTruthy()
    // Empty seed bypasses the hash and lands on warm.
    expect(el.style.getPropertyValue('--stripe-a')).toContain('72')
  })
})
