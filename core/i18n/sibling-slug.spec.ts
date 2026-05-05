import { describe, expect, it, vi } from 'vitest'
import {
  findSiblingSlug,
  isSluggedLocalisedType,
  SLUGGED_LOCALISED_TYPES,
  type SiblingSlugClient,
} from './sibling-slug'

function fakeClient(result: string | null): SiblingSlugClient & { calls: unknown[] } {
  const calls: unknown[] = []
  return {
    calls,
    fetch: vi.fn(async (query: string, params: Record<string, unknown>) => {
      calls.push({ query, params })
      return result as never
    }),
  }
}

describe('isSluggedLocalisedType', () => {
  it('accepts the documented document types', () => {
    for (const type of SLUGGED_LOCALISED_TYPES) {
      expect(isSluggedLocalisedType(type)).toBe(true)
    }
  })

  it('rejects unknown types and non-strings', () => {
    expect(isSluggedLocalisedType('about')).toBe(false)
    expect(isSluggedLocalisedType('')).toBe(false)
    expect(isSluggedLocalisedType(undefined)).toBe(false)
    expect(isSluggedLocalisedType(42)).toBe(false)
  })
})

describe('findSiblingSlug', () => {
  it('returns the source slug when target matches source (no query)', async () => {
    const client = fakeClient(null)
    const slug = await findSiblingSlug(client, {
      type: 'journal',
      sourceLocale: 'nl',
      sourceSlug: 'mijn-post',
      targetLocale: 'nl',
    })
    expect(slug).toBe('mijn-post')
    expect(client.calls).toHaveLength(0)
  })

  it('returns the sibling slug from the metadata-driven GROQ query', async () => {
    const client = fakeClient('my-post')
    const slug = await findSiblingSlug(client, {
      type: 'journal',
      sourceLocale: 'nl',
      sourceSlug: 'mijn-post',
      targetLocale: 'en',
    })
    expect(slug).toBe('my-post')
    expect(client.calls).toEqual([
      {
        query: expect.stringContaining('translation.metadata'),
        params: {
          type: 'journal',
          sourceLocale: 'nl',
          sourceSlug: 'mijn-post',
          targetLocale: 'en',
        },
      },
    ])
  })

  it('returns null when no sibling is linked for the target locale', async () => {
    const client = fakeClient(null)
    const slug = await findSiblingSlug(client, {
      type: 'organ',
      sourceLocale: 'nl',
      sourceSlug: 'het-orgel',
      targetLocale: 'de',
    })
    expect(slug).toBeNull()
  })

  it('treats empty strings from Sanity as missing siblings', async () => {
    const client = fakeClient('')
    const slug = await findSiblingSlug(client, {
      type: 'organ',
      sourceLocale: 'nl',
      sourceSlug: 'het-orgel',
      targetLocale: 'de',
    })
    expect(slug).toBeNull()
  })
})
