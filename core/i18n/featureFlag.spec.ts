import { afterEach, describe, expect, it } from 'vitest'

import { isI18nEnabled, SINGLE_LOCALE_FALLBACK } from './featureFlag'

const ORIGINAL = process.env.NEXT_PUBLIC_I18N_ENABLED

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.NEXT_PUBLIC_I18N_ENABLED
  else process.env.NEXT_PUBLIC_I18N_ENABLED = ORIGINAL
})

describe('i18n feature flag', () => {
  it('defaults to enabled when env var is unset', () => {
    delete process.env.NEXT_PUBLIC_I18N_ENABLED
    expect(isI18nEnabled()).toBe(true)
  })

  it('stays enabled for any value other than literal "false"', () => {
    process.env.NEXT_PUBLIC_I18N_ENABLED = 'true'
    expect(isI18nEnabled()).toBe(true)
    process.env.NEXT_PUBLIC_I18N_ENABLED = ''
    expect(isI18nEnabled()).toBe(true)
    process.env.NEXT_PUBLIC_I18N_ENABLED = '0'
    expect(isI18nEnabled()).toBe(true)
  })

  it('disables only when explicitly set to "false"', () => {
    process.env.NEXT_PUBLIC_I18N_ENABLED = 'false'
    expect(isI18nEnabled()).toBe(false)
  })

  it('uses /en as the single-locale fallback', () => {
    expect(SINGLE_LOCALE_FALLBACK).toBe('en')
  })
})
