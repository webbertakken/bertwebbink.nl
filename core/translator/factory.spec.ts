import { afterEach, describe, expect, it } from 'vitest'

import { getTranslator } from './factory'

const ORIGINAL_ENV = { ...process.env }

afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
})

describe('translator factory', () => {
  it('returns the requested translator', () => {
    const translator = getTranslator('echo')
    expect(translator.name).toBe('echo')
  })

  it('reads the provider from TRANSLATOR_PROVIDER', () => {
    process.env.TRANSLATOR_PROVIDER = 'echo'
    expect(getTranslator().name).toBe('echo')
  })

  it('throws when an unknown provider is requested', () => {
    expect(() => getTranslator('does-not-exist' as never)).toThrow(/unknown provider/)
  })
})
