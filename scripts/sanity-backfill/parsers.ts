/**
 * Pure parsers for the organ backfill migration.
 * Inputs are strings / Sanity content blocks; outputs are the structured
 * `location` / `disposition` shapes from the `organ` schema.
 *
 * Every parser returns the parsed value plus a list of warnings so the
 * dry-run can surface anything that needs manual review.
 */

export type Warning = string

export interface ParsedLocation {
  city: string
  building: string
  country: string
}

export interface ParsedStop {
  name: string
  pitch?: string
  note?: string
}

export interface ParsedKeyboard {
  name: string
  range?: string
  stops: ParsedStop[]
}

export interface ParsedNamed {
  name: string
  note?: string
}

export interface ParsedDisposition {
  manuals?: number
  stops?: number
  registers: ParsedKeyboard[]
  couplings: ParsedNamed[]
  accessories: ParsedNamed[]
}

// ---- LOCATION -------------------------------------------------------------

const MULTI_WORD_CITIES: Array<{ match: RegExp; city: string }> = [
  { match: /^Den Burg \(Texel\),?\s*/i, city: 'Den Burg (Texel)' },
  { match: /^Wirdum \(Friesland\)\s*/i, city: 'Wirdum (Friesland)' },
  { match: /^Hoge Hexel\s+/i, city: 'Hoge Hexel' },
  { match: /^Oud Avereest\b\s*/i, city: 'Oud Avereest' },
  { match: /^De Krim\s+/i, city: 'De Krim' },
  { match: /^Den Ham\s+/i, city: 'Den Ham' },
]

const FOREIGN_CITIES: Record<string, string> = {
  Kassel: 'DE',
  Ahaus: 'DE',
}

export function parseLocation(title: string): {
  value: ParsedLocation | null
  warnings: Warning[]
} {
  const warnings: Warning[] = []
  const trimmed = title.trim()

  let city = ''
  let rest = ''

  for (const { match, city: c } of MULTI_WORD_CITIES) {
    if (match.test(trimmed)) {
      city = c
      rest = trimmed.replace(match, '').trim()
      break
    }
  }

  if (!city) {
    const idx = trimmed.indexOf(' ')
    if (idx === -1) {
      warnings.push(`title has no space — cannot split city/building: "${title}"`)
      return { value: null, warnings }
    }
    city = trimmed.slice(0, idx).trim()
    rest = trimmed.slice(idx + 1).trim()
  }

  const building = rest.replace(/^,\s*/, '').trim()
  if (!building) {
    warnings.push(`no building part after city "${city}" in title "${title}"`)
    return { value: null, warnings }
  }

  const country = FOREIGN_CITIES[city] ?? 'NL'

  return { value: { city, building, country }, warnings }
}

// ---- DISPOSITION ----------------------------------------------------------

// Each entry maps a regex (matching the keyboard label as written in posts)
// to a canonical name we'll store in Sanity. Order matters: longest-first so
// that "Manuaal I" wins over "Manuaal".
const KEYBOARD_PATTERNS: Array<{ match: RegExp; canonical: string }> = [
  // Dutch — canonical
  { match: /^Hoofdwerk\b/i, canonical: 'Hoofdwerk' },
  { match: /^Bovenwerk\b/i, canonical: 'Bovenwerk' },
  { match: /^Rugwerk\b/i, canonical: 'Rugwerk' },
  { match: /^Borstwerk\b/i, canonical: 'Borstwerk' },
  { match: /^Zwelwerk\b/i, canonical: 'Zwelwerk' },
  { match: /^Onderpositief\b/i, canonical: 'Onderpositief' },
  { match: /^Positief\b/i, canonical: 'Positief' },
  { match: /^Echowerk\b/i, canonical: 'Echowerk' },
  { match: /^Pedaal\b/i, canonical: 'Pedaal' },
  { match: /^Manuaal\s+III\b/i, canonical: 'Manuaal III' },
  { match: /^Manuaal\s+II\b/i, canonical: 'Manuaal II' },
  { match: /^Manuaal\s+I\b/i, canonical: 'Manuaal I' },
  { match: /^Manuaal\b/i, canonical: 'Manuaal' },
  // Dutch — synonyms / typos seen in the corpus
  { match: /^Hoofwerk\b/i, canonical: 'Hoofdwerk' }, // typo
  { match: /^Hoofdmanuaal\b/i, canonical: 'Hoofdmanuaal' },
  { match: /^Bovenmanuaal\b/i, canonical: 'Bovenmanuaal' },
  { match: /^Onderklavier\b/i, canonical: 'Onderklavier' },
  { match: /^Bovenklavier\b/i, canonical: 'Bovenklavier' },
  { match: /^Nevenwerk\b/i, canonical: 'Nevenwerk' },
  { match: /^Dwarswerk\b/i, canonical: 'Dwarswerk' },
  { match: /^Kroonpositief\b/i, canonical: 'Kroonpositief' },
  { match: /^Solowerk\b/i, canonical: 'Solowerk' },
  { match: /^Groot\s+Orgel\b/i, canonical: 'Groot Orgel' },
  { match: /^Positief\s+Expressief\b/i, canonical: 'Positief Expressief' },
  { match: /^Reciet\s+Expressief\b/i, canonical: 'Reciet Expressief' },
  { match: /^Echo\b/i, canonical: 'Echo' },
  // German
  { match: /^Hauptwerk\b/i, canonical: 'Hauptwerk' },
  { match: /^Schwellwerk\b/i, canonical: 'Schwellwerk' },
  { match: /^Brustwerk\b/i, canonical: 'Brustwerk' },
  { match: /^Oberwerk\b/i, canonical: 'Oberwerk' },
  { match: /^Unterwerk\b/i, canonical: 'Unterwerk' },
  { match: /^Brustpositiv\b/i, canonical: 'Brustpositiv' },
  { match: /^Positiv\b/i, canonical: 'Positiv' },
  { match: /^Großpedal\b/i, canonical: 'Großpedal' },
  { match: /^Kleinpedal\b/i, canonical: 'Kleinpedal' },
  { match: /^Fernwerk\b/i, canonical: 'Fernwerk' },
  { match: /^Pedal\b/i, canonical: 'Pedal' },
  { match: /^Manual\s+III\b/i, canonical: 'Manual III' },
  { match: /^Manual\s+II\b/i, canonical: 'Manual II' },
  { match: /^Manual\s+I\b/i, canonical: 'Manual I' },
  { match: /^Manual\b/i, canonical: 'Manual' },
  // French
  { match: /^Pédale\b/i, canonical: 'Pédale' },
  { match: /^Récit\b/i, canonical: 'Récit' },
  { match: /^Reciet\b/i, canonical: 'Reciet' },
  { match: /^Grand\s+Orgue\b/i, canonical: 'Grand Orgue' },
  { match: /^Positif\b/i, canonical: 'Positif' },
  // English
  { match: /^Great\s+Organ\b/i, canonical: 'Great Organ' },
  { match: /^Swell\s+Organ\b/i, canonical: 'Swell Organ' },
  { match: /^Choir\s+Organ\b/i, canonical: 'Choir Organ' },
  { match: /^Pedal\s+Organ\b/i, canonical: 'Pedal Organ' },
  { match: /^Great\b/i, canonical: 'Great' },
  { match: /^Swell\b/i, canonical: 'Swell' },
  { match: /^Choir\b/i, canonical: 'Choir' },
]

function blockText(block: any): string {
  if (block?._type !== 'block') return ''
  return (block.children || []).map((c: any) => c.text || '').join('')
}

function isDispositionMarker(text: string): boolean {
  const t = text.trim()
  // "Dispositie" / "Dispositie van het orgel" / "Dispositie Naberorgel"
  if (/^Dispositie\b/i.test(t)) return true
  // "Huidige dispositie:" / "De dispositie bij oplevering 1870:"
  if (/\bdispositie\s*:?\s*$/i.test(t) && t.length < 80) return true
  return false
}

function isKoppelingenLine(text: string): boolean {
  return /^(Koppelingen|Koppels|Couplers|Couplings)\s*:/i.test(text)
}

function isSpeelhulpenLine(text: string): boolean {
  return /^(Speelhulpen|Accessories|Spielhilfen|Overige\s+registers)\s*:/i.test(text)
}

function normaliseQuotes(s: string): string {
  return s.replace(/[\u2019\u2032]/g, "'").replace(/[\u201C\u201D]/g, '"')
}

function matchKeyboard(line: string): { name: string; range?: string; rest: string } | null {
  for (const { match, canonical } of KEYBOARD_PATTERNS) {
    if (!match.test(line)) continue
    const after = line.replace(match, '').trim()
    // Allow zero or more parenthetical bits before the colon, e.g.
    //   ""                                  → just "<keyboard>:"
    //   "(C-f''')"                          → compass
    //   "(in zwelkast) (C-c'''')"           → description + compass
    //   "(Bovenwerk)"                       → alternative name
    const m = after.match(/^((?:\([^)]*\)\s*)*)\s*:\s*(.*)$/)
    if (!m) continue
    // Pick the first parenthetical that looks like a compass (contains a hyphen
    // or apostrophe), otherwise fall back to the first one.
    const parens = [...m[1].matchAll(/\(([^)]+)\)/g)].map((x) => x[1].trim())
    const compassParen = parens.find((p) => /[-–'′]/.test(p) && /[A-Ga-g]/.test(p))
    const range = compassParen ?? parens[0]
    const looksLikeYear = range && /^\d{4}(?:[-/]\d{2,4})?$/.test(range)
    return {
      name: canonical,
      range: looksLikeYear ? undefined : range,
      rest: m[2].trim(),
    }
  }
  return null
}

// Heuristic: a line that looks like the trailing tail of the previous keyboard's
// stop list — i.e. a comma-separated stop sequence ending with a period or comma.
// The early-out checks against matchKeyboard / isKoppelingenLine / isSpeelhulpenLine
// are defensive: the only caller already ruled those out before invoking, so
// those branches are not reachable in practice.
function looksLikeStopContinuation(line: string): boolean {
  /* v8 ignore next 2 */
  if (matchKeyboard(line)) return false
  if (isKoppelingenLine(line) || isSpeelhulpenLine(line)) return false
  // Must contain at least one pitch-shaped token (e.g. "8'", "III sterk").
  if (!/(?:\d+'|[IVX]+(?:[-–][IVX]+)*\s+(?:sterk|fach|ranks|rangs))/.test(line)) return false
  // Ends with a period (typical) or a trailing comma (line-wrapped mid-list).
  return /[.,]\s*$/.test(line)
}

// Heuristic: a line that looks like coupling continuation (e.g.
// "Pedaal - Hoofdwerk, Pedaal - Nevenwerk."). The early-out checks against
// matchKeyboard / isKoppelingenLine / isSpeelhulpenLine are defensive: the
// only caller already ruled those out before invoking, so those branches are
// not reachable in practice.
function looksLikeCouplingContinuation(line: string): boolean {
  /* v8 ignore next 2 */
  if (matchKeyboard(line)) return false
  if (isKoppelingenLine(line) || isSpeelhulpenLine(line)) return false
  return /^[A-Z][A-Za-z]+\s+[-–]\s+[A-Z]/.test(line) && /\.\s*$/.test(line)
}

function isTabularLine(line: string): boolean {
  // Two-column tabular dispositions are visually formatted with runs of 6+
  // spaces between columns. Real prose / stop lists never have that gap.
  return /\s{6,}/.test(line)
}

// ---- COLUMN-AWARE TABULAR PARSER ----
//
// Some posts format their disposition as a whitespace-aligned table:
//
//   Hoofdwerk:                     Bovenwerk:
//   Prestant 8 voet                Bourdon  8 voet
//   Roerfluit 8 voet               Gamba    8 voet
//   ...
//
// Strategy: split each row on runs of 10+ whitespace (much bigger than the
// internal padding within a single stop entry). Cells then line up by ordinal
// position with the header cells. This is more robust than slicing at fixed
// header-derived positions, because each data row tends to have different
// per-column alignment and the columns drift across rows.

const COLUMN_GAP_THRESHOLD = 15

export interface ColumnSpec {
  kind: 'register' | 'couplings' | 'accessories' | 'unknown'
  name?: string
  range?: string
}

function splitTabularRow(line: string): string[] {
  return line
    .split(new RegExp(`\\s{${COLUMN_GAP_THRESHOLD},}`))
    .map((s) => s.trim())
    .filter((s) => s)
}

export function classifyTabularHeader(rawHeader: string): ColumnSpec {
  const h = rawHeader.replace(/[:]+\s*$/, '').trim()
  if (!h) return { kind: 'unknown' }
  if (/^(Speelhulpen|Spielhilfen|Accessories)\b/i.test(h)) return { kind: 'accessories' }
  if (/^(Koppelingen|Koppels|Couplers|Couplings)\b/i.test(h)) return { kind: 'couplings' }
  for (const { match, canonical } of KEYBOARD_PATTERNS) {
    if (!match.test(h)) continue
    const after = h.replace(match, '').trim()
    if (!after) return { kind: 'register', name: canonical }
    const parenMatch = after.match(/^\(([^)]+)\)$/)
    const range = parenMatch ? parenMatch[1].trim() : after
    return { kind: 'register', name: canonical, range }
  }
  return { kind: 'unknown' }
}

// Convert "8 voet" → "8'", "2 2/3 voet" → "2 2/3'".
function normaliseVoet(s: string): string {
  return s.replace(/(\d+(?:\s+\d+\/\d+)?)\s+voet\b/gi, "$1'")
}

// Convert a bare-digit pitch ("Prestant 8") to "Prestant 8'" by appending the
// apostrophe if the cell ends in digits / fraction. Skips:
//   - cells that already contain a pitch indicator (', ’, ′, voet, sterk, fach …)
//   - 4-digit year-shaped trailing numbers ("Prestant 8' – 1870" → leave "1870" alone)
export function addPitchApostrophe(cell: string): string {
  if (/['’′]|\bvoet\b|\b(?:sterk|fach|ranks|rangs)\b/i.test(cell)) return cell
  return cell.replace(/(\d+(?:\s+\d+\/\d+)?)(\s*[BD])?\s*$/, (m, num, posLetter) => {
    if (/^\s*\d{4}\s*$/.test(num)) return m
    const pos = posLetter ? (posLetter.trim() === 'B' ? ' bas' : ' discant') : ''
    return `${num}'${pos}`
  })
}

export function parseTabularDisposition(
  lines: string[],
  warnings: Warning[],
): ParsedDisposition | null {
  // Find the first line whose split yields 2+ recognised column headers.
  let headerIdx = -1
  let columns: ColumnSpec[] = []
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const cells = splitTabularRow(lines[i])
    if (cells.length < 2) continue
    const cspecs = cells.map(classifyTabularHeader)
    if (cspecs.filter((s) => s.kind !== 'unknown').length >= 2) {
      headerIdx = i
      columns = cspecs
      break
    }
  }
  if (headerIdx === -1) return null

  const registers: ParsedKeyboard[] = []
  const couplings: ParsedNamed[] = []
  const accessories: ParsedNamed[] = []
  const registerByCol = new Map<number, ParsedKeyboard>()
  // Map column index → register, creating the register on first sight (or
  // reusing it by name when the same keyboard appears in a later header band).
  function ensureRegister(ci: number, spec: ColumnSpec) {
    if (spec.kind !== 'register' || !spec.name) return
    const existing = registers.find((r) => r.name === spec.name)
    if (existing) {
      registerByCol.set(ci, existing)
      return
    }
    const kb: ParsedKeyboard = {
      name: spec.name,
      ...(spec.range ? { range: spec.range } : {}),
      stops: [],
    }
    registerByCol.set(ci, kb)
    registers.push(kb)
  }
  columns.forEach((c, ci) => ensureRegister(ci, c))

  // After the tabular block ends we switch to single-column post-table mode
  // (e.g. Dedemsvaart's "Koppels: pedaal - hoofdwerk" footer).
  let postTable: 'none' | 'couplings' | 'accessories' = 'none'

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const row = lines[i]
    if (!row.trim()) continue
    const cells = splitTabularRow(row)
    // splitTabularRow only returns 0 cells for whitespace-only rows, which the
    // earlier !row.trim() guard already skipped — defensive only.
    /* v8 ignore next */
    if (cells.length === 0) continue

    // Could be a *second* header band (e.g. Vriezenveen "Pedaal: ... Koppelingen:")
    if (cells.length >= 2) {
      const cspecs = cells.map(classifyTabularHeader)
      const recognised = cspecs.filter((s) => s.kind !== 'unknown').length
      if (recognised >= 2 && recognised === cspecs.length) {
        columns = cspecs
        cspecs.forEach((c, ci) => ensureRegister(ci, c))
        postTable = 'none'
        continue
      }
    }

    // Single-cell row — either a Koppelingen/Speelhulpen header / continuation,
    // a continuation of the FIRST column when other columns are empty, or prose.
    if (cells.length === 1) {
      const only = cells[0]
      // Narrative prose? Terminate the section.
      if (only.length > 60 && /\s\w+\s\w+\s\w+\s\w+\s\w+/.test(only) && !/\d'/.test(only)) {
        warnings.push(`tabular section terminated at narrative line: "${only.slice(0, 60)}…"`)
        break
      }
      // Koppelingen / Speelhulpen footer block?
      if (isKoppelingenLine(only)) {
        postTable = 'couplings'
        const rest = only
          .replace(/^(Koppelingen|Koppels|Couplers|Couplings)\s*:\s*/i, '')
          .replace(/\.\s*$/, '')
        if (rest) couplings.push(...parseCouplingList(rest))
        continue
      }
      if (isSpeelhulpenLine(only)) {
        postTable = 'accessories'
        const rest = only
          .replace(/^(Speelhulpen|Accessories|Spielhilfen|Overige\s+registers)\s*:\s*/i, '')
          .replace(/\.\s*$/, '')
        if (rest) accessories.push(...parseAccessoryList(rest))
        continue
      }
      // Looks like a stop (has pitch) AND we're still in the table proper? It's
      // a continuation of the first register's column (other columns were
      // exhausted earlier).
      const hasPitch =
        /\d['’′]/.test(only) ||
        /\b[IVX]+(?:[-–][IVX]+)*\b/.test(only) ||
        /\s(?:sterk|fach|ranks|rangs|st\.|voet)\b/i.test(only)
      if (postTable === 'none' && hasPitch) {
        const firstRegisterCol = [...registerByCol.keys()].sort((a, b) => a - b)[0]
        if (firstRegisterCol !== undefined) {
          const kb = registerByCol.get(firstRegisterCol)!
          const normalised = addPitchApostrophe(normaliseVoet(only))
          kb.stops.push(parseStop(normalised))
          continue
        }
      }
      // Continuation of the previous post-table section: each continuation line
      // is one coupling/accessory entry (do NOT comma-split, since these are
      // free-text descriptions like "Manuaalkoppel, gedeeld in bas/discant— 1870").
      if (postTable === 'couplings') {
        const text = only.replace(/\.\s*$/, '').trim()
        const yearDash = text.match(/^(.+?)\s+[-–]\s+((?:19|20)\d{2}.*)$/)
        if (yearDash)
          couplings.push({ name: normaliseDashes(yearDash[1].trim()), note: yearDash[2].trim() })
        else couplings.push({ name: normaliseDashes(text) })
        continue
      }
      if (postTable === 'accessories') {
        accessories.push({ name: only.replace(/\.\s*$/, '').trim() })
        continue
      }
      // Otherwise just skip & flag.
      warnings.push(`tabular post-section unrecognised: "${only.slice(0, 80)}"`)
      continue
    }

    // Multi-cell data row — each cell goes into the column at the same ordinal index.
    for (let ci = 0; ci < cells.length; ci++) {
      const cell = cells[ci]
      // splitTabularRow already filters empty cells; this guard is defensive only.
      /* v8 ignore next */
      if (!cell) continue
      const col = columns[ci]
      if (!col) {
        warnings.push(
          `tabular row has more cells (${cells.length}) than columns (${columns.length}); extra cell "${cell.slice(0, 60)}" ignored`,
        )
        continue
      }
      if (col.kind === 'register') {
        const kb = registerByCol.get(ci)
        // ensureRegister always populates registerByCol for register columns;
        // this guard is defensive against future refactors.
        /* v8 ignore next */
        if (!kb) continue
        const normalised = addPitchApostrophe(normaliseVoet(cell))
        const stop = parseStop(normalised)
        if (!stop.pitch && !PITCHLESS_STOP_NAMES.test(stop.name)) {
          warnings.push(`tabular cell "${cell}" → no pitch parsed`)
        }
        kb.stops.push(stop)
      } else if (col.kind === 'couplings') {
        const normalised = cell.replace(/\s*&\s*/g, ' – ').replace(/\s+-\s+/g, ' – ')
        couplings.push({ name: normalised })
      } else if (col.kind === 'accessories') {
        accessories.push({ name: cell })
      }
    }
  }

  if (registers.length === 0 && couplings.length === 0 && accessories.length === 0) return null

  const totalStops = registers.reduce((n, kb) => n + kb.stops.filter((s) => s.pitch).length, 0)
  const manuals = registers.filter(
    (kb) => !/^(pedaal|pedal|pédale|großpedal|kleinpedal)\b/i.test(kb.name),
  ).length

  return {
    manuals: manuals || undefined,
    stops: totalStops || undefined,
    registers,
    couplings,
    accessories,
  }
}

/**
 * Split a comma-separated list while respecting parentheses.
 * "A 8', B (gedeeld), C III-V sterk (1 1/3'), D 8'."
 *   → ["A 8'", "B (gedeeld)", "C III-V sterk (1 1/3')", "D 8'"]
 */
function smartSplit(input: string): string[] {
  const out: string[] = []
  let depth = 0
  let buf = ''
  for (const ch of input) {
    if (ch === '(') depth++
    else if (ch === ')') depth = Math.max(0, depth - 1)
    if (ch === ',' && depth === 0) {
      if (buf.trim()) out.push(buf.trim())
      buf = ''
    } else {
      buf += ch
    }
  }
  if (buf.trim()) out.push(buf.trim())
  // strip a trailing period from the last item
  if (out.length) out[out.length - 1] = out[out.length - 1].replace(/\.\s*$/, '').trim()
  return out
}

// Pitch is one of:
//   - foot mark: 32', 16', 8', 4', 2', 1', or with fraction "2 2/3'", "1 1/3'", "1 3/5'"
//   - bare fraction "1/2'" (no integer part)
//   - "<digit> voet" alternative spelling: "8 voet", "2 2/3 voet"
//   - rank notation: roman numeral chain (III, III-V, II-III-IV) or digit-rank
//     ("3 sterk", "4 fach", "5 ranks", "3 rangs"), optional pitch annotation
//     in parens like "(2')" / "(1 1/3')"
// Optional trailing "discant" / "bas" / "gedeeld" position word.
const PITCH_REGEX =
  /(?:\d+(?:\s+\d+\/\d+)?'|\d+\/\d+'|\d+(?:\s+\d+\/\d+)?\s+voet|[IVX]+(?:[-–][IVX]+)*(?:\s+(?:sterk|fach|ranks|rangs|st\.?))?(?:\s*\([^)]*\))?|\d+(?:[-–]\d+)?\s+(?:sterk|fach|ranks|rangs|st\.?)(?:\s*\([^)]*\))?)(?:\s+(?:discant|bas|gedeeld))?/

export function parseStop(input: string): ParsedStop {
  let body = normaliseQuotes(input).trim()
  // Normalise missing space before opening paren: "Trompet 8'(gedeeld)" → "Trompet 8' (gedeeld)"
  body = body.replace(/(\S)\(/g, '$1 (')
  const noteParts: string[] = []

  // Step 1a: trailing space-bracketed dash followed by free text — always a note
  // (years, "oud", "transmissie", "extension", "prepared for", "bas uit 1923", …).
  // Requires whitespace on both sides of the dash to avoid splitting hyphenated
  // names like "Basson-Hobo" or rank notation like "III-IV" / "3-4".
  const dashSuffix = body.match(/^(.+?)\s+[-–]\s+(.+)$/)
  if (dashSuffix) {
    body = dashSuffix[1].trim()
    noteParts.push(dashSuffix[2].trim())
  } else {
    // Step 1b: trailing dash glued to a 4-digit year ("Fluit 4' -2020")
    const yearGlued = body.match(/^(.+?)\s*[-–]\s*((?:19|20)\d{2}(?:[-/]\d{2,4})*)\s*$/)
    if (yearGlued) {
      body = yearGlued[1].trim()
      noteParts.push(yearGlued[2].trim())
    }
  }

  // Step 2: trailing parenthetical that's plainly a modifier (not part of a pitch like "(1 1/3')")
  const trailParen = body.match(/^(.*?)\s+\(([^()]+)\)\s*$/)
  if (trailParen) {
    const inside = trailParen[2].trim()
    const isPitchExtension = /^\d/.test(inside) || /^[IVX]/.test(inside)
    if (!isPitchExtension) {
      body = trailParen[1].trim()
      noteParts.unshift(inside)
    }
  }

  // Step 3: extract pitch from end of body
  const pitchMatch = body.match(new RegExp('^(.+?)\\s+(' + PITCH_REGEX.source + ')\\s*$'))
  let name: string
  let pitch: string | undefined
  if (pitchMatch) {
    name = pitchMatch[1].trim()
    pitch = pitchMatch[2].trim()
  } else {
    name = body
  }

  return {
    name,
    ...(pitch ? { pitch } : {}),
    ...(noteParts.length ? { note: noteParts.join(', ') } : {}),
  }
}

// Names that legitimately appear in a stop list with no pitch — don't warn on these.
// Includes Tremulant variants, multi-rank labels written without a count, and
// accessories that occasionally bleed into the stop list.
const PITCHLESS_STOP_NAMES =
  /^(tremulant|tremolo|tremblant|trembulant|tremolant|aangehangen|ventiel|ventil|calcant|mixtur|mixtuur|mixture|cornet|cornett|cornettino|sesquialter|sesquialtera|siebenquart|cimbel|cymbel|cymbale|cimbal|zimbel|scharff|plein\s+jeu|fourniture|klokkenspel|carillon|harfe|harp|windharfe|röhrenglocken|stahlklang|geen\s+eigen|no\s+stops)\b/i

function parseStopList(rest: string, warnings: Warning[]): ParsedStop[] {
  // "Aangehangen" alone → no individual stops
  if (/^aangehangen\.?\s*$/i.test(rest)) return []
  const items = smartSplit(rest)
  return items.map((s) => {
    const stop = parseStop(s)
    if (!stop.pitch && !PITCHLESS_STOP_NAMES.test(stop.name)) {
      warnings.push(`stop "${s}" → no pitch parsed (kept as name only)`)
    }
    return stop
  })
}

// For accessories (Speelhulpen): split a trailing year/note on " - ".
function parseAccessoryList(rest: string): ParsedNamed[] {
  const items = smartSplit(rest)
  return items.map((s) => {
    const dash = s.match(/^(.+?)\s+[-–]\s+(.+)$/)
    if (dash) return { name: dash[1].trim(), note: dash[2].trim() }
    const paren = s.match(/^(.+?)\s+\(([^)]+)\)\s*$/)
    if (paren) return { name: paren[1].trim(), note: paren[2].trim() }
    return { name: s.trim() }
  })
}

// For couplings (Koppelingen): the typical form "Hoofdwerk - Bovenwerk" should
// stay as a single name (with em-dash) per the hand-curated convention. Only a
// trailing year (e.g. "X - 1995") or parenthetical is split into a note.
function parseCouplingList(rest: string): ParsedNamed[] {
  const items = smartSplit(rest)
  return items.map((s) => {
    const yearDash = s.match(/^(.+?)\s+[-–]\s+((?:19|20)\d{2}(?:[-/]\d{2,4})*)\s*$/)
    if (yearDash) return { name: normaliseDashes(yearDash[1].trim()), note: yearDash[2].trim() }
    const paren = s.match(/^(.+?)\s+\(([^)]+)\)\s*$/)
    if (paren) return { name: normaliseDashes(paren[1].trim()), note: paren[2].trim() }
    return { name: normaliseDashes(s.trim()) }
  })
}

function normaliseDashes(s: string): string {
  return s.replace(/\s+-\s+/g, ' \u2013 ')
}

export function parseDispositionFromContent(content: any[] | undefined): {
  value: ParsedDisposition | null
  warnings: Warning[]
} {
  const warnings: Warning[] = []
  if (!content || content.length === 0) {
    return { value: null, warnings: ['no content[]'] }
  }

  // find disposition markers
  const markerIndices: number[] = []
  for (let i = 0; i < content.length; i++) {
    const t = blockText(content[i]).trim()
    if (isDispositionMarker(t)) markerIndices.push(i)
  }
  if (markerIndices.length === 0) {
    return { value: null, warnings: ['no "Dispositie" marker block'] }
  }
  if (markerIndices.length > 1) {
    warnings.push(
      `multiple "Dispositie" markers found (${markerIndices.length}) — likely two instruments in one post; parsing only the first`,
    )
  }

  const start = markerIndices[0] + 1
  const lines: string[] = []
  let blanks = 0
  for (let i = start; i < content.length; i++) {
    const block = content[i]
    if (block._type !== 'block') {
      // walk through embedded media (image/audio/embed) — Bert sometimes puts an
      // audio block between "Dispositie:" and the keyboard list
      continue
    }
    const t = blockText(block).trim()
    if (!t) {
      blanks++
      if (blanks >= 3) break
      continue
    }
    blanks = 0
    if (isDispositionMarker(t)) break
    lines.push(t)
  }

  if (lines.length === 0) {
    return { value: null, warnings: [...warnings, 'no disposition lines after marker'] }
  }

  // Tabular layout? If the first non-blank lines split into 2+ recognised
  // header cells on big whitespace gaps, use the column-aware parser instead.
  const firstFew = lines.slice(0, 5).filter((l) => /\s{4,}/.test(l))
  if (firstFew.length >= 2) {
    const headerCells = splitTabularRow(firstFew[0])
    const recognisedHeaders = headerCells
      .map(classifyTabularHeader)
      .filter((c) => c.kind !== 'unknown').length
    if (recognisedHeaders >= 2) {
      const value = parseTabularDisposition(lines, warnings)
      if (value) return { value, warnings }
      // Fall through to line-by-line if tabular parser produced nothing
    }
  }

  const registers: ParsedKeyboard[] = []
  const couplings: ParsedNamed[] = []
  const accessories: ParsedNamed[] = []

  // Lines that signal we've left the disposition section and entered editor
  // metadata about the audio recordings ("Bert: 1", "Ab Kristiaans-orgel ...",
  // "Hieronder enkele audio-opnames", "Bron:", etc.).
  const isEditorMeta = (line: string) =>
    /^(Bert|Ab)(\s|:|$)/i.test(line) ||
    /^(Bron|Improvisatie|Hieronder|Luistervoorbeeld|Het\s+(H\.|Deetlef|Hendrik)|Hendrik\s+Jan)\b/i.test(
      line,
    ) ||
    /^[123456789],?\s*[A-Za-z\d,\s]*\b(Bert|Ab)\b/i.test(line)

  let lastTrack: 'register' | 'coupling' | 'accessory' | null = null
  let tabularCount = 0
  for (const line of lines) {
    if (isEditorMeta(line)) break // terminate the section — the rest is post-meta
    if (isTabularLine(line)) {
      tabularCount++
      warnings.push(`tabular two-column layout detected, line skipped: "${line}"`)
      continue
    }
    if (isKoppelingenLine(line)) {
      const rest = line
        .replace(/^(Koppelingen|Koppels|Couplers|Couplings)\s*:\s*/i, '')
        .replace(/\.\s*$/, '')
      couplings.push(...parseCouplingList(rest))
      lastTrack = 'coupling'
      continue
    }
    if (isSpeelhulpenLine(line)) {
      const rest = line
        .replace(/^(Speelhulpen|Accessories|Spielhilfen|Overige\s+registers)\s*:\s*/i, '')
        .replace(/\.\s*$/, '')
      accessories.push(...parseAccessoryList(rest))
      lastTrack = 'accessory'
      continue
    }
    const kb = matchKeyboard(line)
    if (kb) {
      const stops = parseStopList(kb.rest, warnings)
      registers.push({ name: kb.name, ...(kb.range ? { range: kb.range } : {}), stops })
      lastTrack = 'register'
      continue
    }
    // Continuation of the previous block? Common when long stop lists wrap.
    if (lastTrack === 'register' && registers.length && looksLikeStopContinuation(line)) {
      const more = parseStopList(line.replace(/\.\s*$/, ''), warnings)
      registers[registers.length - 1].stops.push(...more)
      continue
    }
    if (lastTrack === 'coupling' && looksLikeCouplingContinuation(line)) {
      couplings.push(...parseCouplingList(line.replace(/\.\s*$/, '')))
      continue
    }
    // Unrecognised line — flag for manual review but DON'T pollute structured data
    warnings.push(`unrecognised disposition line: "${line}"`)
  }

  // If the post is dominated by tabular junk, the parsed registers are
  // unreliable — throw the disposition out and force manual entry.
  if (tabularCount >= 3) {
    return {
      value: null,
      warnings: [...warnings, 'tabular two-column disposition detected — needs manual entry'],
    }
  }

  if (registers.length === 0) {
    return { value: null, warnings: [...warnings, 'no keyboards parsed'] }
  }

  // Count only "real" stops (with a pitch). Tremulant / Aangehangen don't count.
  const totalStops = registers.reduce((n, kb) => n + kb.stops.filter((s) => s.pitch).length, 0)
  const manuals = registers.filter((kb) => !/^pedaal\b/i.test(kb.name)).length

  return {
    value: {
      manuals: manuals || undefined,
      stops: totalStops || undefined,
      registers,
      couplings,
      accessories,
    },
    warnings,
  }
}
