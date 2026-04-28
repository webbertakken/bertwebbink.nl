import { describe, expect, it, vi, beforeEach } from 'vitest'

const sanityFetchMock = vi.fn()

vi.mock('@/sanity/lib/live', () => ({
  sanityFetch: (...args: unknown[]) => sanityFetchMock(...args),
}))

vi.mock('@/sanity/lib/queries', () => ({
  archiveOrgansQuery: '<<archiveOrgansQuery>>',
}))

import { loadMoreOrgans } from './archiveActions'

describe('loadMoreOrgans', () => {
  beforeEach(() => {
    sanityFetchMock.mockReset()
  })

  it('passes offset, end (offset+limit) and city to sanityFetch', async () => {
    sanityFetchMock.mockResolvedValueOnce({ data: [] })
    await loadMoreOrgans({ offset: 24, limit: 10, city: 'Urk' })
    expect(sanityFetchMock).toHaveBeenCalledTimes(1)
    expect(sanityFetchMock).toHaveBeenCalledWith({
      query: '<<archiveOrgansQuery>>',
      params: { offset: 24, end: 34, city: 'Urk' },
    })
  })

  it('returns the data array verbatim when present', async () => {
    const rows = [{ _id: 'a' }, { _id: 'b' }]
    sanityFetchMock.mockResolvedValueOnce({ data: rows })
    const result = await loadMoreOrgans({ offset: 0, limit: 24, city: '' })
    expect(result).toBe(rows)
  })

  it('returns an empty array when sanityFetch yields no data', async () => {
    sanityFetchMock.mockResolvedValueOnce({ data: null })
    const result = await loadMoreOrgans({ offset: 0, limit: 24, city: '' })
    expect(result).toEqual([])
  })

  it('returns an empty array when data is undefined', async () => {
    sanityFetchMock.mockResolvedValueOnce({})
    const result = await loadMoreOrgans({ offset: 0, limit: 24, city: '' })
    expect(result).toEqual([])
  })
})
