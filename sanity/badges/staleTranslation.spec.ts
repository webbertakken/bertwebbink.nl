import { describe, expect, it } from 'vitest'

import type { DocumentBadgeProps } from 'sanity'

import { staleTranslationBadge } from './staleTranslation'

function buildProps(overrides: Partial<DocumentBadgeProps>): DocumentBadgeProps {
  return {
    id: 'doc',
    type: 'about',
    draft: null,
    published: null,
    liveEdit: false,
    schemaType: { name: 'about' } as never,
    ...overrides,
  } as DocumentBadgeProps
}

describe('staleTranslationBadge', () => {
  it('returns null for non-translatable types', () => {
    expect(
      staleTranslationBadge(
        buildProps({ type: 'sanity.imageAsset', published: { _type: 'sanity.imageAsset' } as never }),
      ),
    ).toBeNull()
  })

  it('returns null when neither draft nor published exists', () => {
    expect(staleTranslationBadge(buildProps({ type: 'about' }))).toBeNull()
  })

  it('returns null on the source-language doc', () => {
    const result = staleTranslationBadge(
      buildProps({
        type: 'about',
        published: { _type: 'about', language: 'nl', _rev: 'r1' } as never,
      }),
    )
    expect(result).toBeNull()
  })

  it('flags a sibling without `_translationSourceRev` as never-translated', () => {
    const result = staleTranslationBadge(
      buildProps({
        type: 'about',
        published: { _type: 'about', language: 'en' } as never,
      }),
    )
    expect(result).toMatchObject({ label: 'Never translated', color: 'warning' })
  })

  it('returns null on a sibling that already carries a sourceRev (badge does not block on staleness here)', () => {
    expect(
      staleTranslationBadge(
        buildProps({
          type: 'about',
          published: {
            _type: 'about',
            language: 'en',
            _translationSourceRev: 'r1',
          } as never,
        }),
      ),
    ).toBeNull()
  })

  it('flags a score with a stale per-locale provenance entry', () => {
    const result = staleTranslationBadge(
      buildProps({
        type: 'score',
        published: {
          _type: 'score',
          _rev: 'rev-2',
          _translationProvenance: { en: { sourceRev: 'rev-1' } },
        } as never,
      }),
    )
    expect(result).toMatchObject({ label: 'Stale translations' })
  })

  it('returns null for a score whose provenance matches the current rev', () => {
    expect(
      staleTranslationBadge(
        buildProps({
          type: 'score',
          published: {
            _type: 'score',
            _rev: 'rev-2',
            _translationProvenance: { en: { sourceRev: 'rev-2' } },
          } as never,
        }),
      ),
    ).toBeNull()
  })

  it('ignores provenance for the source locale on score docs', () => {
    expect(
      staleTranslationBadge(
        buildProps({
          type: 'score',
          published: {
            _type: 'score',
            _rev: 'rev-2',
            _translationProvenance: { nl: { sourceRev: 'rev-1' } },
          } as never,
        }),
      ),
    ).toBeNull()
  })

  it('returns null for a score with no provenance recorded yet', () => {
    expect(
      staleTranslationBadge(
        buildProps({
          type: 'score',
          published: { _type: 'score', _rev: 'rev-1' } as never,
        }),
      ),
    ).toBeNull()
  })
})
