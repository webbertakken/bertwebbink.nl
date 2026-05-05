import { describe, expect, it } from 'vitest'
import { shouldShowTranslateAction } from './visibility'

describe('shouldShowTranslateAction', () => {
  it('hides on non-translatable types', () => {
    expect(shouldShowTranslateAction({ type: 'sanity.imageAsset' })).toBe(false)
    expect(shouldShowTranslateAction({ type: 'translation.metadata' })).toBe(false)
  })

  it('always shows on `score` regardless of language', () => {
    expect(shouldShowTranslateAction({ type: 'score' })).toBe(true)
    expect(shouldShowTranslateAction({ type: 'score', language: 'en' })).toBe(true)
  })

  it('shows on the source-language doc-per-locale doc', () => {
    expect(shouldShowTranslateAction({ type: 'about', language: 'nl' })).toBe(true)
    expect(shouldShowTranslateAction({ type: 'journal', language: 'nl' })).toBe(true)
  })

  it('hides on non-source siblings', () => {
    expect(shouldShowTranslateAction({ type: 'about', language: 'en' })).toBe(false)
    expect(shouldShowTranslateAction({ type: 'journal', language: 'de' })).toBe(false)
  })

  it('treats a missing language as the source default', () => {
    expect(shouldShowTranslateAction({ type: 'about' })).toBe(true)
    expect(shouldShowTranslateAction({ type: 'about', language: null })).toBe(true)
  })
})
