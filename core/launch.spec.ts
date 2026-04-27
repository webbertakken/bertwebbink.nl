import { describe, expect, it } from 'vitest'

import { LAUNCH_AT_ISO, LAUNCH_AT_MS } from './launch'

describe('launch constants', () => {
  it('exposes the launch ISO timestamp as a string', () => {
    expect(typeof LAUNCH_AT_ISO).toBe('string')
    expect(LAUNCH_AT_ISO).toBe('2026-04-30T12:00:00+02:00')
  })

  it('exposes a finite numeric epoch matching the ISO string', () => {
    expect(Number.isFinite(LAUNCH_AT_MS)).toBe(true)
    expect(LAUNCH_AT_MS).toBe(Date.parse(LAUNCH_AT_ISO))
  })

  it('places the launch moment at noon Amsterdam time on 30 April 2026', () => {
    const d = new Date(LAUNCH_AT_MS)
    expect(d.getUTCFullYear()).toBe(2026)
    expect(d.getUTCMonth()).toBe(3) // April (0-indexed)
    expect(d.getUTCDate()).toBe(30)
    // 12:00 +02:00 == 10:00 UTC
    expect(d.getUTCHours()).toBe(10)
    expect(d.getUTCMinutes()).toBe(0)
  })
})
