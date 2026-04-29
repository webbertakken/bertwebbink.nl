import { describe, expect, it } from 'vitest'

import {
  applyI18nArrayUnits,
  extractI18nArrayUnits,
  type I18nArrayPathConfig,
} from './i18n-array'

const cfg: I18nArrayPathConfig[] = [
  { path: 'blurb', entryType: 'internationalizedArrayTextValue' },
  { path: 'edition', entryType: 'internationalizedArrayStringValue' },
]

describe('i18n-array walker', () => {
  it('extracts the entry matching the source locale', () => {
    const doc = {
      blurb: [
        { _key: 'k1', _type: 'internationalizedArrayTextValue', language: 'nl', value: 'Een korte beschrijving.' },
        { _key: 'k2', _type: 'internationalizedArrayTextValue', language: 'en', value: 'A short blurb.' },
      ],
      edition: [
        { _key: 'k3', _type: 'internationalizedArrayStringValue', language: 'nl', value: '1e editie' },
      ],
    }
    expect(extractI18nArrayUnits(doc, cfg, 'nl')).toEqual([
      { id: 'blurb', sourceText: 'Een korte beschrijving.' },
      { id: 'edition', sourceText: '1e editie' },
    ])
  })

  it('appends a new entry for a brand-new target locale', () => {
    const doc = {
      blurb: [
        { _key: 'k1', _type: 'internationalizedArrayTextValue', language: 'nl', value: 'NL.' },
      ],
    }
    const result = applyI18nArrayUnits(
      doc,
      cfg.slice(0, 1),
      [{ id: 'blurb', sourceText: 'EN.' }],
      'en',
    )
    const arr = result.blurb as Array<{ language: string; value: string; _type?: string }>
    expect(arr).toHaveLength(2)
    expect(arr.find((e) => e.language === 'en')).toMatchObject({
      language: 'en',
      value: 'EN.',
      _type: 'internationalizedArrayTextValue',
    })
  })

  it('updates an existing entry for the same target locale', () => {
    const doc = {
      blurb: [
        { _key: 'k1', _type: 'internationalizedArrayTextValue', language: 'nl', value: 'NL.' },
        { _key: 'k2', _type: 'internationalizedArrayTextValue', language: 'en', value: 'old EN' },
      ],
    }
    const result = applyI18nArrayUnits(
      doc,
      cfg.slice(0, 1),
      [{ id: 'blurb', sourceText: 'new EN' }],
      'en',
    )
    const arr = result.blurb as Array<{ _key: string; language: string; value: string }>
    expect(arr).toHaveLength(2)
    const enEntry = arr.find((e) => e.language === 'en')!
    expect(enEntry).toMatchObject({ _key: 'k2', value: 'new EN' })
  })

  it('leaves source-locale entry untouched when applying to a different target', () => {
    const doc = {
      blurb: [
        { _key: 'k1', _type: 'internationalizedArrayTextValue', language: 'nl', value: 'NL.' },
      ],
    }
    const result = applyI18nArrayUnits(
      doc,
      cfg.slice(0, 1),
      [{ id: 'blurb', sourceText: 'DE.' }],
      'de',
    )
    const arr = result.blurb as Array<{ language: string; value: string }>
    expect(arr.find((e) => e.language === 'nl')).toMatchObject({ value: 'NL.' })
    expect(arr.find((e) => e.language === 'de')).toMatchObject({ value: 'DE.' })
  })

  it('does not mutate the input', () => {
    const doc = {
      blurb: [
        { _key: 'k1', _type: 'internationalizedArrayTextValue', language: 'nl', value: 'NL.' },
      ],
    }
    const before = JSON.stringify(doc)
    applyI18nArrayUnits(doc, cfg.slice(0, 1), [{ id: 'blurb', sourceText: 'EN.' }], 'en')
    expect(JSON.stringify(doc)).toBe(before)
  })
})
