import { describe, expect, it } from 'vitest'
import { currentYear, firstYearOrCurrent } from './calendarYear'

describe('currentYear', () => {
  it('reads the year in UTC', () => {
    expect(currentYear(new Date('2026-12-31T23:30:00-02:00'))).toBe(2027)
  })

  it('defaults to the clock', () => {
    expect(currentYear()).toBe(new Date().getUTCFullYear())
  })
})

describe('firstYearOrCurrent', () => {
  const now = new Date('2026-06-01T00:00:00Z')

  it('returns the year of the first date', () => {
    expect(firstYearOrCurrent('2004-03-15', now)).toBe(2004)
  })

  it('falls back to the current year when there is no first date', () => {
    expect(firstYearOrCurrent(null, now)).toBe(2026)
    expect(firstYearOrCurrent(undefined, now)).toBe(2026)
    expect(firstYearOrCurrent('', now)).toBe(2026)
  })

  it('defaults to the clock', () => {
    expect(firstYearOrCurrent(null)).toBe(new Date().getUTCFullYear())
  })
})
