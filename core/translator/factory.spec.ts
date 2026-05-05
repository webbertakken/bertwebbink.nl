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

  it('defaults to gemini when no env var is set', () => {
    delete process.env.TRANSLATOR_PROVIDER
    process.env.GOOGLE_AI_API_KEY = 'fake-key'
    try {
      expect(getTranslator().name).toBe('gemini')
    } finally {
      delete process.env.GOOGLE_AI_API_KEY
    }
  })

  it('instantiates each non-echo provider when an api key is present', () => {
    process.env.GOOGLE_AI_API_KEY = 'k'
    process.env.ANTHROPIC_API_KEY = 'k'
    process.env.OPENAI_API_KEY = 'k'
    try {
      expect(getTranslator('gemini').name).toBe('gemini')
      expect(getTranslator('anthropic').name).toBe('anthropic')
      expect(getTranslator('openai').name).toBe('openai')
    } finally {
      delete process.env.GOOGLE_AI_API_KEY
      delete process.env.ANTHROPIC_API_KEY
      delete process.env.OPENAI_API_KEY
    }
  })

  it('throws when an unknown provider is requested', () => {
    expect(() => getTranslator('does-not-exist' as never)).toThrow(/unknown provider/)
  })
})
