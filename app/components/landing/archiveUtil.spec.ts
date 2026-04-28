import { describe, expect, it } from 'vitest'

import {
  cityHref,
  normaliseCityParam,
  sortedCitiesForSidebar,
  withYearGroups,
  yearTotals,
} from './archiveUtil'
import type { LandingOrgan } from './OrganCard'

const make = (overrides: Partial<LandingOrgan> & { _id: string; date: string }): LandingOrgan => ({
  _id: overrides._id,
  title: overrides.title ?? 'Test',
  slug: overrides.slug ?? 'test',
  excerpt: overrides.excerpt ?? null,
  date: overrides.date,
  coverImage: overrides.coverImage ?? null,
  location: overrides.location ?? null,
  builder: overrides.builder ?? null,
  year: overrides.year ?? null,
  hasAudio: overrides.hasAudio ?? false,
  hasVideo: overrides.hasVideo ?? false,
})

describe('withYearGroups', () => {
  it('marks the first item of each year as a year-start', () => {
    const items = withYearGroups([
      make({ _id: 'a', date: '2025-08-10T00:00:00Z' }),
      make({ _id: 'b', date: '2025-03-12T00:00:00Z' }),
      make({ _id: 'c', date: '2024-12-01T00:00:00Z' }),
      make({ _id: 'd', date: '2024-06-15T00:00:00Z' }),
      make({ _id: 'e', date: '2023-01-04T00:00:00Z' }),
    ])
    expect(items.map((x) => [x.year, x.isYearStart])).toEqual([
      [2025, true],
      [2025, false],
      [2024, true],
      [2024, false],
      [2023, true],
    ])
  })

  it('returns an empty array for an empty input', () => {
    expect(withYearGroups([])).toEqual([])
  })

  it('falls back to the previously seen year for invalid dates', () => {
    const items = withYearGroups([
      make({ _id: 'a', date: '2024-04-01T00:00:00Z' }),
      make({ _id: 'b', date: 'not-a-date' }),
    ])
    expect(items[0].year).toBe(2024)
    expect(items[0].isYearStart).toBe(true)
    // Invalid date inherits the previous group, so no new year-start.
    expect(items[1].year).toBe(2024)
    expect(items[1].isYearStart).toBe(false)
  })

  it('falls back to the current year when the very first date is invalid', () => {
    const items = withYearGroups([make({ _id: 'a', date: 'not-a-date' })])
    expect(items).toHaveLength(1)
    expect(items[0].year).toBe(new Date().getFullYear())
    expect(items[0].isYearStart).toBe(true)
  })
})

describe('yearTotals', () => {
  it('counts organs per calendar year, sorted newest year first', () => {
    const totals = yearTotals([
      make({ _id: 'a', date: '2025-08-10T00:00:00Z' }),
      make({ _id: 'b', date: '2024-12-01T00:00:00Z' }),
      make({ _id: 'c', date: '2024-06-15T00:00:00Z' }),
      make({ _id: 'd', date: '2024-03-15T00:00:00Z' }),
      make({ _id: 'e', date: '2023-01-04T00:00:00Z' }),
    ])
    expect(totals).toEqual([
      { year: 2025, count: 1 },
      { year: 2024, count: 3 },
      { year: 2023, count: 1 },
    ])
  })

  it('skips invalid dates entirely', () => {
    const totals = yearTotals([
      make({ _id: 'a', date: '2024-01-01T00:00:00Z' }),
      make({ _id: 'b', date: 'nonsense' }),
    ])
    expect(totals).toEqual([{ year: 2024, count: 1 }])
  })

  it('returns an empty list for no input', () => {
    expect(yearTotals([])).toEqual([])
  })
})

describe('cityHref', () => {
  it('returns the bare archive URL for the empty filter', () => {
    expect(cityHref('')).toBe('/organs')
  })

  it('encodes a single-word city', () => {
    expect(cityHref('Urk')).toBe('/organs?city=Urk')
  })

  it('URL-encodes spaces and special characters', () => {
    expect(cityHref('Den Burg (Texel)')).toBe('/organs?city=Den%20Burg%20(Texel)')
  })
})

describe('normaliseCityParam', () => {
  it('returns the empty string for undefined', () => {
    expect(normaliseCityParam(undefined)).toBe('')
  })

  it('trims a string', () => {
    expect(normaliseCityParam('  Urk  ')).toBe('Urk')
  })

  it('returns the empty string for whitespace-only input', () => {
    expect(normaliseCityParam('   ')).toBe('')
  })

  it('takes the first element when given an array', () => {
    expect(normaliseCityParam(['Urk', 'Zwolle'])).toBe('Urk')
  })

  it('returns the empty string when given an empty array', () => {
    expect(normaliseCityParam([])).toBe('')
  })

  it('returns the empty string for non-string non-array input via type coercion', () => {
    expect(normaliseCityParam(123 as unknown as string)).toBe('')
  })
})

describe('sortedCitiesForSidebar', () => {
  it('sorts by descending count, ties broken alphabetically', () => {
    const out = sortedCitiesForSidebar({
      Urk: 7,
      Zwolle: 4,
      Rijssen: 4,
      Apeldoorn: 1,
      Borne: 2,
      Almelo: 2,
    })
    expect(out).toEqual([
      { city: 'Urk', count: 7 },
      { city: 'Rijssen', count: 4 },
      { city: 'Zwolle', count: 4 },
      { city: 'Almelo', count: 2 },
      { city: 'Borne', count: 2 },
      { city: 'Apeldoorn', count: 1 },
    ])
  })

  it('handles an empty map', () => {
    expect(sortedCitiesForSidebar({})).toEqual([])
  })
})
