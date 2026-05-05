import { describe, expect, it } from 'vitest'
import {
  DEFAULT_LOCALE,
  I18N_ARRAY_LANGUAGES,
  LOCALES,
  LOCALE_ENDONYMS,
  SUPPORTED_LANGUAGES,
  UI_DEFAULT_LOCALE,
  isLocale,
  negotiateLocale,
} from './locales'

describe('locales constant', () => {
  it('declares 11 locales', () => {
    expect(LOCALES).toHaveLength(11)
  })

  it('uses Dutch as the content default and English as the UI default', () => {
    expect(DEFAULT_LOCALE).toBe('nl')
    expect(UI_DEFAULT_LOCALE).toBe('en')
  })

  it('has an endonym entry for every locale', () => {
    for (const locale of LOCALES) {
      expect(LOCALE_ENDONYMS[locale]).toBeTruthy()
    }
  })

  it('exposes the locale list shaped for both Sanity i18n plugins', () => {
    expect(SUPPORTED_LANGUAGES).toHaveLength(LOCALES.length)
    expect(SUPPORTED_LANGUAGES[0]).toEqual({ id: 'nl', title: 'Dutch' })
    expect(I18N_ARRAY_LANGUAGES).toBe(SUPPORTED_LANGUAGES)
  })
})

describe('isLocale', () => {
  it('returns true for known locale codes', () => {
    expect(isLocale('nl')).toBe(true)
    expect(isLocale('hi')).toBe(true)
  })

  it('returns false for anything else', () => {
    expect(isLocale('xx')).toBe(false)
    expect(isLocale('')).toBe(false)
    expect(isLocale(null)).toBe(false)
    expect(isLocale(123)).toBe(false)
  })
})

describe('negotiateLocale', () => {
  it('returns the first supported preference', () => {
    expect(negotiateLocale(['de', 'en'])).toBe('de')
  })

  it('strips region tags', () => {
    expect(negotiateLocale(['en-US'])).toBe('en')
    expect(negotiateLocale(['pt-BR'])).toBe('pt')
  })

  it('skips unsupported preferences', () => {
    expect(negotiateLocale(['sw', 'fr'])).toBe('fr')
  })

  it('falls back to UI default when nothing matches', () => {
    expect(negotiateLocale(['sw', 'xx'])).toBe('en')
  })

  it('honours an explicit fallback', () => {
    expect(negotiateLocale([], 'nl')).toBe('nl')
  })
})
