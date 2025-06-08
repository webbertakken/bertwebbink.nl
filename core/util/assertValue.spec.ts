import { describe, it, expect } from 'vitest'
import { assertValue } from './assertValue'

describe('assertValue', () => {
  it('returns the value if it is defined', () => {
    const value = 'test'
    expect(assertValue(value, 'Value should not be undefined')).toBe(value)
  })

  it('throws an error if the value is undefined', () => {
    expect(() => assertValue(undefined, 'Value should not be undefined')).toThrow(
      'Value should not be undefined',
    )
  })

  it('throws an error with a custom message', () => {
    const customMessage = 'Custom error message'
    expect(() => assertValue(undefined, customMessage)).toThrow(customMessage)
  })

  it('does not throw an error for null values', () => {
    expect(assertValue(null, 'Value should not be undefined')).toBe(null)
  })

  it('does not throw an error for empty strings', () => {
    expect(assertValue('', 'Value should not be undefined')).toBe('')
  })

  it('does not throw an error for zero', () => {
    expect(assertValue(0, 'Value should not be undefined')).toBe(0)
  })

  it('does not throw an error for false boolean', () => {
    expect(assertValue(false, 'Value should not be undefined')).toBe(false)
  })

  it('does not throw an error for empty arrays', () => {
    expect(assertValue([], 'Value should not be undefined')).toEqual([])
  })

  it('does not throw an error for empty objects', () => {
    expect(assertValue({}, 'Value should not be undefined')).toEqual({})
  })
})
