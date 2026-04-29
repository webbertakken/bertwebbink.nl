import type { Locale } from '@/core/i18n/locales'

import type { TranslationUnit, DocumentShape } from '../types'
import {
  applyPortableTextUnits,
  extractPortableTextUnits,
} from './portable-text'
import {
  applyStringFields,
  type DerivedFieldSpec,
  extractDerivedFields,
  extractStringFields,
  specPathMatches,
} from './fields'
import {
  applyI18nArrayUnits,
  extractI18nArrayUnits,
  type I18nArrayPathConfig,
} from './i18n-array'

type AnyDoc = Record<string, unknown>

export type WalkerSpec = {
  /**
   * Plain string/text fields to translate. Dotted paths; may include
   * `[*]` to mean "every entry in this array".
   */
  stringFields?: string[]
  /**
   * Fields whose translation should be stored under a *different*
   * field on the target doc. Used for organ stop names, where the
   * canonical name stays in `name` and the localised gloss lands in
   * `translation`.
   */
  derivedFields?: DerivedFieldSpec[]
  /** Array-of-block fields (Portable Text) to translate. Dotted paths. */
  portableTextFields?: string[]
  /** Internationalised-array fields. Used by `score` only. */
  i18nArrayFields?: I18nArrayPathConfig[]
  /** Hint for the LLM prompt builder. */
  shape: DocumentShape
}

/**
 * Per-type walker definitions. Document-per-locale types translate the
 * full per-locale doc body; field-level types (`score`) translate only
 * their internationalised array fields.
 */
const WALKERS: Record<string, WalkerSpec> = {
  journal: {
    stringFields: [
      'title',
      'excerpt',
      'coverImage.alt',
      'coverImage.caption',
    ],
    portableTextFields: ['content'],
    shape: 'mixed',
  },
  organ: {
    stringFields: [
      'title',
      'excerpt',
      'coverImage.alt',
      'coverImage.caption',
      // Disposition: register/coupling/accessory headings + stop notes.
      // Stop names are handled separately via `derivedFields` so the
      // canonical (source-language) name stays in `name`.
      'disposition.registers[*].name',
      'disposition.registers[*].stops[*].note',
      'disposition.couplings[*].name',
      'disposition.couplings[*].note',
      'disposition.accessories[*].name',
      'disposition.accessories[*].note',
    ],
    derivedFields: [
      {
        readPath: 'disposition.registers[*].stops[*].name',
        writePath: 'disposition.registers[*].stops[*].translation',
        context:
          'Organ stop name (proper noun). If the term is already in the target language or is a universally recognised organ-stop term, output it verbatim; otherwise provide a brief target-language gloss (one or two words).',
      },
    ],
    portableTextFields: ['content'],
    shape: 'mixed',
  },
  about: {
    stringFields: [
      'eyebrow',
      'title',
      'signoffName',
      'signoffLocation',
      'portraitImage.alt',
      'portraitCaption',
      'portraitPlate',
      'secondaryImage.alt',
      'secondaryCaption',
      'secondaryPlate',
      'timelineSummary',
      'repertoireIntro',
      'contactTitle',
      'contactLede',
      // Repeating sub-objects: every quick-fact, timeline entry,
      // repertoire card and contact-row label needs translating.
      // `repertoire[*].pieces[]` (composer/work titles) is
      // intentionally left untranslated — those are universal music
      // catalog entries.
      'quickFacts[*].label',
      'quickFacts[*].value',
      'timeline[*].year',
      'timeline[*].what',
      'timeline[*].where',
      'repertoire[*].era',
      'repertoire[*].title',
      'contactRows[*].label',
    ],
    portableTextFields: ['letter'],
    shape: 'mixed',
  },
  elsewhere: {
    stringFields: ['title', 'eyebrow'],
    portableTextFields: ['intro'],
    shape: 'mixed',
  },
  privacy: {
    stringFields: ['eyebrow', 'title', 'intro', 'contactLine'],
    shape: 'mixed',
  },
  journalPage: {
    stringFields: [
      'kickerLeft',
      'kickerRight',
      'heading',
      'tagline',
      'cornerLeftSub',
      'cornerRightSub',
    ],
    shape: 'field-level',
  },
  organsPage: {
    stringFields: [
      'kickerLeft',
      'kickerRight',
      'heading',
      'tagline',
      'cornerLeftSub',
      'cornerRightSub',
    ],
    shape: 'field-level',
  },
  scoresPage: {
    stringFields: ['kicker', 'heading', 'tagline'],
    shape: 'field-level',
  },
  settings: {
    stringFields: [
      'title',
      'wordmark',
      'tagline',
      'scoresNoticeBody',
      'scoresEditionLine',
    ],
    shape: 'field-level',
  },
  score: {
    i18nArrayFields: [
      { path: 'forInstrument', entryType: 'internationalizedArrayStringValue' },
      { path: 'edition', entryType: 'internationalizedArrayStringValue' },
      { path: 'blurb', entryType: 'internationalizedArrayTextValue' },
    ],
    shape: 'field-level',
  },
}

export function walkersFor(type: string): WalkerSpec | undefined {
  return WALKERS[type]
}

export type ExtractedUnits = {
  units: TranslationUnit[]
  /** Optional debug label, never used by the LLM \u2014 helps test assertions. */
  shape: DocumentShape
}

/** Extract all translatable units from a doc per its registered walker. */
export function extractAll(
  doc: AnyDoc,
  type: string,
  sourceLocale: Locale,
): ExtractedUnits {
  const spec = walkersFor(type)
  if (!spec) return { units: [], shape: 'mixed' }
  const units: TranslationUnit[] = []

  if (spec.stringFields) units.push(...extractStringFields(doc, spec.stringFields))
  if (spec.derivedFields) units.push(...extractDerivedFields(doc, spec.derivedFields))
  if (spec.portableTextFields) {
    for (const field of spec.portableTextFields) {
      const blocks = doc[field] as unknown[] | undefined
      const ptUnits = extractPortableTextUnits(blocks as never)
      for (const u of ptUnits) units.push({ ...u, id: `${field}.${u.id}` })
    }
  }
  if (spec.i18nArrayFields) {
    units.push(...extractI18nArrayUnits(doc, spec.i18nArrayFields, sourceLocale))
  }

  return { units, shape: spec.shape }
}

/** Apply translated units to a doc per its registered walker. */
export function applyAll(
  doc: AnyDoc,
  type: string,
  units: TranslationUnit[],
  targetLocale: Locale,
): AnyDoc {
  const spec = walkersFor(type)
  if (!spec) return doc
  let result: AnyDoc = doc

  if (spec.stringFields) {
    const stringUnits = units.filter((u) =>
      spec.stringFields!.some((p) => specPathMatches(p, u.id)),
    )
    result = applyStringFields(result, stringUnits)
  }

  if (spec.derivedFields) {
    const derivedUnits = units.filter((u) =>
      spec.derivedFields!.some((d) => specPathMatches(d.writePath, u.id)),
    )
    result = applyStringFields(result, derivedUnits)
  }

  if (spec.portableTextFields) {
    for (const field of spec.portableTextFields) {
      const prefix = `${field}.`
      const blockUnits: TranslationUnit[] = []
      for (const u of units) {
        if (u.id.startsWith(prefix)) {
          blockUnits.push({ id: u.id.slice(prefix.length), sourceText: u.sourceText, context: u.context })
        }
      }
      const original = (result[field] as unknown[]) ?? []
      const next = applyPortableTextUnits(original as never, blockUnits)
      result = { ...result, [field]: next }
    }
  }

  if (spec.i18nArrayFields) {
    const arrUnits = units.filter((u) =>
      spec.i18nArrayFields!.some((c) => c.path === u.id),
    )
    result = applyI18nArrayUnits(result, spec.i18nArrayFields, arrUnits, targetLocale)
  }

  return result
}
