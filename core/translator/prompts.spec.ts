import { describe, expect, it } from 'vitest'
import {
  buildSystemPrompt,
  buildUserPayload,
  decodeResponse,
  describeLocale,
  responseSchema,
} from './prompts'
import { DO_NOT_TRANSLATE, type TranslateRequest } from './types'

const baseReq: TranslateRequest = {
  sourceLocale: 'nl',
  targetLocale: 'fr',
  units: [
    { id: 'title', sourceText: 'Hallo' },
    { id: 'body', sourceText: 'Wereld' },
  ],
}

describe('buildSystemPrompt', () => {
  it('names the source and target locales', () => {
    const prompt = buildSystemPrompt(baseReq)
    expect(prompt).toContain('Dutch')
    expect(prompt).toContain('French')
  })

  it('describes the document shape when given', () => {
    expect(
      buildSystemPrompt({
        ...baseReq,
        documentContext: { type: 'journal', shape: 'portable-text' },
      }),
    ).toMatch(/paragraph-level prose/)
    expect(
      buildSystemPrompt({
        ...baseReq,
        documentContext: { type: 'score', shape: 'field-level' },
      }),
    ).toMatch(/short, independent catalog-style/)
    expect(
      buildSystemPrompt({
        ...baseReq,
        documentContext: { type: 'organ', shape: 'mixed' },
      }),
    ).toMatch(/mix paragraph prose and short labels/)
  })

  it('formats glossary entries with both literal and do-not-translate cases', () => {
    const prompt = buildSystemPrompt({
      ...baseReq,
      glossary: {
        Hoofdwerk: DO_NOT_TRANSLATE,
        Pedaal: '',
        koppel: 'coupler',
      },
    })
    expect(prompt).toMatch(/do not translate these terms/)
    expect(prompt).toContain('Hoofdwerk')
    expect(prompt).toContain('Pedaal')
    expect(prompt).toMatch(/koppel/)
    expect(prompt).toMatch(/coupler/)
  })

  it('adds organ-domain guidance when the doc type is organ or journal', () => {
    const organPrompt = buildSystemPrompt({
      ...baseReq,
      documentContext: { type: 'organ', shape: 'mixed' },
    })
    expect(organPrompt).toMatch(/Organ-domain note/)
    expect(organPrompt).toMatch(/Hoofdwerk/)
    expect(organPrompt).toMatch(/Hauptwerk/)
    expect(organPrompt).toMatch(/Stop names/)

    const journalPrompt = buildSystemPrompt({
      ...baseReq,
      documentContext: { type: 'journal', shape: 'portable-text' },
    })
    expect(journalPrompt).toMatch(/Organ-domain note/)
  })

  it('omits organ-domain guidance for non-organ doc types', () => {
    const aboutPrompt = buildSystemPrompt({
      ...baseReq,
      documentContext: { type: 'about', shape: 'mixed' },
    })
    expect(aboutPrompt).not.toMatch(/Organ-domain note/)
    const noContextPrompt = buildSystemPrompt(baseReq)
    expect(noContextPrompt).not.toMatch(/Organ-domain note/)
  })

  it('explains both <mN> and {{...}} marker syntaxes and forbids introducing them', () => {
    const prompt = buildSystemPrompt(baseReq)
    expect(prompt).toMatch(/<m1>\.\.\.<\/m1>/)
    expect(prompt).toMatch(/\{\{\.\.\.\}\}/)
    expect(prompt).toMatch(/MUST NOT invent/)
    expect(prompt).toMatch(/Do NOT convert \{\{\.\.\.\}\} to <m1>/)
  })

  it('asks the LLM to reuse previous translations when provided', () => {
    const prompt = buildSystemPrompt({
      ...baseReq,
      previousUnits: [{ id: 'title', sourceText: 'Hallo' }],
      previousTranslation: [{ id: 'title', sourceText: 'Bonjour' }],
    })
    expect(prompt).toMatch(/reuse the previous translation/)
  })
})

describe('buildUserPayload', () => {
  it('emits one payload entry per source unit', () => {
    const payload = buildUserPayload(baseReq)
    expect(payload).toHaveLength(2)
    expect(payload[0]).toMatchObject({ id: 'title', sourceText: 'Hallo' })
  })

  it('attaches previousSource/previousTranslation context per unit when present', () => {
    const payload = buildUserPayload({
      ...baseReq,
      previousUnits: [{ id: 'title', sourceText: 'Older NL' }],
      previousTranslation: [{ id: 'title', sourceText: 'Older FR' }],
    })
    expect(payload[0]).toMatchObject({
      previousSource: 'Older NL',
      previousTranslation: 'Older FR',
    })
    expect(payload[1].previousSource).toBeUndefined()
  })
})

describe('decodeResponse', () => {
  it('preserves the source order even when the LLM reorders', () => {
    const decoded = decodeResponse(
      {
        units: [
          { id: 'body', translatedText: 'Monde' },
          { id: 'title', translatedText: 'Bonjour' },
        ],
      },
      baseReq,
    )
    expect(decoded.map((u) => u.id)).toEqual(['title', 'body'])
    expect(decoded[0].sourceText).toBe('Bonjour')
  })

  it('falls back to the source text when an id is missing from the response', () => {
    const decoded = decodeResponse({ units: [{ id: 'title', translatedText: 'Bonjour' }] }, baseReq)
    expect(decoded[1]).toEqual({ id: 'body', sourceText: 'Wereld' })
  })
})

describe('responseSchema', () => {
  it('declares the units array shape', () => {
    expect(responseSchema.required).toContain('units')
    expect(responseSchema.properties.units.items.required).toContain('id')
    expect(responseSchema.properties.units.items.required).toContain('translatedText')
  })
})

describe('describeLocale', () => {
  it('renders the English label and code', () => {
    expect(describeLocale('nl')).toBe('Dutch (nl)')
    expect(describeLocale('ja')).toBe('Japanese (ja)')
  })
})
