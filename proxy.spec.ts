import { describe, expect, it } from 'vitest'

import { LAUNCH_AT_MS } from './core/launch'
import { gateIsActive, isAlwaysAllowed } from './proxy.helpers'

const FUTURE = LAUNCH_AT_MS + 1000 * 60 * 60 * 24
const PAST = LAUNCH_AT_MS - 1000 * 60 * 60 * 24

describe('isAlwaysAllowed', () => {
  it('lets /admin through', () => {
    expect(isAlwaysAllowed('/admin')).toBe(true)
    expect(isAlwaysAllowed('/admin/structure')).toBe(true)
  })

  it('lets /api through', () => {
    expect(isAlwaysAllowed('/api/translate')).toBe(true)
  })

  it('lets /llms.txt and /llms.{locale}.txt through', () => {
    expect(isAlwaysAllowed('/llms.txt')).toBe(true)
    expect(isAlwaysAllowed('/llms.nl.txt')).toBe(true)
    expect(isAlwaysAllowed('/llms.de.txt')).toBe(true)
  })

  it('does not let arbitrary site paths through', () => {
    expect(isAlwaysAllowed('/nl/about')).toBe(false)
    expect(isAlwaysAllowed('/en/organs')).toBe(false)
    expect(isAlwaysAllowed('/scores')).toBe(false)
  })
})

describe('gateIsActive', () => {
  it('is active before the launch timestamp', () => {
    expect(gateIsActive(PAST)).toBe(true)
  })

  it('is inactive after the launch timestamp', () => {
    expect(gateIsActive(FUTURE)).toBe(false)
  })

  it('respects the explicit UNDER_CONSTRUCTION env override', () => {
    expect(gateIsActive(FUTURE, { UNDER_CONSTRUCTION: 'true' })).toBe(true)
    expect(gateIsActive(PAST, { UNDER_CONSTRUCTION: 'false' })).toBe(true) // launch still in past
  })
})
