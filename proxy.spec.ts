import { describe, expect, it } from 'vitest'

import { isAlwaysAllowed, singleLocaleLockTarget } from './proxy.helpers'

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

describe('singleLocaleLockTarget', () => {
  it('returns null when i18n is enabled', () => {
    expect(singleLocaleLockTarget('/de/about', true)).toBeNull()
    expect(singleLocaleLockTarget('/nl/organs', true)).toBeNull()
  })

  it('returns null when the path already uses the fallback locale', () => {
    expect(singleLocaleLockTarget('/en/about', false)).toBeNull()
    expect(singleLocaleLockTarget('/en', false)).toBeNull()
  })

  it('rewrites every other locale prefix to /en when i18n is disabled', () => {
    expect(singleLocaleLockTarget('/nl/about', false)).toBe('/en/about')
    expect(singleLocaleLockTarget('/de/organs/foo', false)).toBe('/en/organs/foo')
    expect(singleLocaleLockTarget('/ja', false)).toBe('/en')
  })

  it('leaves non-locale paths alone', () => {
    expect(singleLocaleLockTarget('/admin/structure', false)).toBeNull()
    expect(singleLocaleLockTarget('/api/translate', false)).toBeNull()
  })

  it('honours an explicit fallback override', () => {
    expect(singleLocaleLockTarget('/de/about', false, 'nl')).toBe('/nl/about')
  })
})
