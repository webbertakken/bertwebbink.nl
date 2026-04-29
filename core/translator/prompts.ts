import { LOCALE_LABELS_EN, type Locale } from '@/core/i18n/locales'

import { DO_NOT_TRANSLATE, type TranslateRequest } from './types'

/**
 * Builds a single system+instruction block describing the translation
 * task to any of the LLM providers. We keep this provider-agnostic;
 * each provider implementation handles its own JSON-schema response
 * format (tool-use, structured output, etc).
 */
export function buildSystemPrompt(req: TranslateRequest): string {
  const sourceName = LOCALE_LABELS_EN[req.sourceLocale]
  const targetName = LOCALE_LABELS_EN[req.targetLocale]
  const shape = req.documentContext?.shape ?? 'mixed'
  const lines: string[] = []

  lines.push(
    `You are a professional translator translating ${sourceName} (${req.sourceLocale}) text into ${targetName} (${req.targetLocale}).`,
  )
  lines.push(
    'You MUST preserve every inline formatting marker exactly as given, AND you MUST NOT invent new ones. There are two kinds:',
  )
  lines.push(
    '  1. Numbered tags: <m1>...</m1>, <m2>...</m2>, ... (used in long-form prose). When present in the source, keep the exact same tag names and integers, wrapping the equivalent translated phrase. When NOT present in the source, do NOT introduce them.',
  )
  lines.push(
    '  2. Brace-italic markers: {{...}} (used in short labels and titles to italicise the wrapped phrase on render). Preserve them verbatim when present in the source. Do NOT convert {{...}} to <m1>...</m1> or vice-versa, and do NOT add brace markers around words that the source did not already wrap.',
  )
  if (shape === 'portable-text') {
    lines.push(
      'The source units are paragraph-level prose from a long-form article. Translate naturally; do not invent content.',
    )
  } else if (shape === 'field-level') {
    lines.push(
      'The source units are short, independent catalog-style strings (titles, captions, alt text). Keep them concise and idiomatic; do not turn them into sentences.',
    )
  } else {
    lines.push(
      'The source units mix paragraph prose and short labels; translate each unit on its own merits.',
    )
  }

  // Domain-specific guidance for organ documents. The site is a
  // catalog of pipe organs and these terms appear constantly; the
  // LLM kept them as Dutch proper nouns by default which left the
  // disposition section partially untranslated.
  if (req.documentContext?.type === 'organ' || req.documentContext?.type === 'journal') {
    lines.push(
      'Organ-domain note: when you encounter Dutch keyboard-division names — Hoofdwerk, Bovenwerk, Rugwerk, Borstwerk, Zwelwerk, Pedaal, Onderpositief, Manuaal (I/II/III), Hoofdmanuaal — translate them to the standard target-language equivalent (German: Hauptwerk, Oberwerk, Rückpositiv, Brustwerk, Schwellwerk, Pedal; English: Great, Swell, Choir / Positive, Brustwerk, Pedal; French: Grand-Orgue, Récit, Positif, Pédale; Italian: Organo Maggiore, Eco, Positivo, Pedaliera; Japanese: 主鍵盤 / オーバーワーク / ポジティフ / ペダル; Chinese: 主键盘 / 上键盘 / 背键盘 / 脚键盘; Korean: ጌ주 건반 / 상부 / 들부 / 페달). Do NOT keep them as Dutch proper nouns. Stop names (Bordun, Principal, Vox Celeste, etc.) are different — those are universal organ-stop terminology and should generally be reproduced verbatim, only translated when the per-unit `context` says so.',
    )
  }
  lines.push(
    'Return one translated unit per source unit, keyed by the same `id`. Do not add extra units, drop any, or merge them.',
  )
  lines.push(
    'Do not surround translations with quotation marks or markdown. Output the bare translation text only, except for the inline formatting markers described above.',
  )

  if (req.glossary && Object.keys(req.glossary).length > 0) {
    const dnt: string[] = []
    const literal: Array<[string, string]> = []
    for (const [term, target] of Object.entries(req.glossary)) {
      if (target === DO_NOT_TRANSLATE || target === '') dnt.push(term)
      else literal.push([term, target])
    }
    if (dnt.length > 0) {
      lines.push(
        `Glossary \u2014 do not translate these terms; reproduce them verbatim: ${dnt.join(', ')}.`,
      )
    }
    if (literal.length > 0) {
      lines.push(
        'Glossary \u2014 use these exact translations when the source term appears:',
      )
      for (const [term, target] of literal) {
        lines.push(`  ${term} \u2192 ${target}`)
      }
    }
  }

  if (req.previousUnits && req.previousTranslation) {
    lines.push(
      'Context: a previous version of this document was already translated. Where the source text matches what was previously translated, you SHOULD reuse the previous translation verbatim. Use the previous source/translation pairs as terminology and tone hints.',
    )
  }

  return lines.join('\n')
}

/**
 * Encode units as a deterministic JSON payload for the LLM. We send them
 * as `{id, sourceText, previousSource?, previousTranslation?}` so the
 * LLM has the full context for diff-aware translation.
 */
export function buildUserPayload(req: TranslateRequest) {
  const previousByIdSource = new Map<string, string>()
  const previousByIdTarget = new Map<string, string>()
  for (const u of req.previousUnits ?? []) previousByIdSource.set(u.id, u.sourceText)
  for (const u of req.previousTranslation ?? []) previousByIdTarget.set(u.id, u.sourceText)

  return req.units.map((u) => ({
    id: u.id,
    sourceText: u.sourceText,
    context: u.context,
    previousSource: previousByIdSource.get(u.id),
    previousTranslation: previousByIdTarget.get(u.id),
  }))
}

/** JSON schema describing the LLM response. Used by Gemini/OpenAI structured output. */
export const responseSchema = {
  type: 'object',
  properties: {
    units: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          translatedText: { type: 'string' },
        },
        required: ['id', 'translatedText'],
      },
    },
  },
  required: ['units'],
} as const

export type RawTranslatorResponse = {
  units: Array<{ id: string; translatedText: string }>
}

/** Convert raw LLM response to TranslationUnit[], preserving order from source. */
export function decodeResponse(
  raw: RawTranslatorResponse,
  source: TranslateRequest,
): import('./types').TranslationUnit[] {
  const byId = new Map(raw.units.map((u) => [u.id, u.translatedText]))
  return source.units.map((u) => ({
    id: u.id,
    sourceText: byId.get(u.id) ?? u.sourceText,
  }))
}

/** Defensive accessor: tags with non-int suffix or odd ordering are still valid. */
export function describeLocale(locale: Locale): string {
  return `${LOCALE_LABELS_EN[locale]} (${locale})`
}
