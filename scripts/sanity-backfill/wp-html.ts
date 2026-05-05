/**
 * Recover lost disposition data from the original WordPress HTML.
 *
 * Two of the organ posts (Hoogeveen Goede Herderkerk, De Krim Herv Kerk) had
 * their disposition encoded as an HTML <table> in WordPress. The WP\u2192Sanity
 * conversion didn't carry tables across, so the disposition is missing from
 * the live Sanity content[].  We re-parse the table directly here.
 *
 * Defensive: every extracted cell is sanitised (control chars stripped,
 * length-capped, leftover tag chars rejected) before being passed to the
 * downstream parser.
 */

import {
  addPitchApostrophe,
  parseStop,
  type ParsedDisposition,
  type ParsedKeyboard,
  type ParsedNamed,
  type ParsedStop,
  type Warning,
} from './parsers'

const MAX_CELL_LEN = 200

interface Table {
  rows: string[][]
}

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
}

function sanitiseCell(raw: string, warnings: Warning[]): string | null {
  let s = raw
  // Reconstruct fractions written as <span style="font-size: small;">2</span><span style="font-size: xx-small;">2/3</span>.
  // Insert a space before the smaller-text fraction so we don't end up with "22/3".
  // oxlint-disable-next-line no-control-regex
  s = s.replace(/<\/span>\s*<span[^>]*>(\d+\s*\/\s*\d+)/gi, ' $1')
  // Strip remaining HTML tags
  // oxlint-disable-next-line no-control-regex
  s = s.replace(/<[^>]*>/g, '')
  s = decodeEntities(s)
  // Drop control / zero-width characters (intentional control-char regex).
  /* eslint-disable-next-line no-control-regex */
  // oxlint-disable-next-line no-control-regex
  s = s.replace(
    /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200F\u2028-\u202F\u2060-\u206F\uFEFF]/g,
    '',
  )
  // Collapse whitespace
  // oxlint-disable-next-line no-control-regex
  s = s.replace(/\s+/g, ' ').trim()
  if (!s) return null
  // Reject anything that still contains tag characters \u2014 means the regex extraction missed something
  if (s.includes('<') || s.includes('>')) {
    warnings.push(`rejected cell containing leftover tag chars: "${s.slice(0, 60)}\u2026"`)
    return null
  }
  if (s.length > MAX_CELL_LEN) {
    warnings.push(`truncated cell (${s.length} \u2192 ${MAX_CELL_LEN}): "${s.slice(0, 40)}\u2026"`)
    s = s.slice(0, MAX_CELL_LEN)
  }
  return s
}

export function extractFirstTable(html: string, warnings: Warning[]): Table | null {
  const tableMatch = html.match(/<table[\s\S]*?<\/table>/i)
  if (!tableMatch) return null
  const tableHtml = tableMatch[0]
  const rows: string[][] = []
  for (const trMatch of tableHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells: string[] = []
    for (const tdMatch of trMatch[1].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)) {
      const cleaned = sanitiseCell(tdMatch[1], warnings)
      cells.push(cleaned ?? '')
    }
    if (cells.length) rows.push(cells)
  }
  return rows.length ? { rows } : null
}

interface ColumnSpec {
  kind: 'register' | 'couplings' | 'accessories' | 'unknown'
  name?: string
  range?: string
}

// Header cells like "Hoofdwerk C-f3:" / "Pedal C-f1:" / "Speelhulpen:"
function classifyHeader(rawHeader: string): ColumnSpec {
  const h = rawHeader.replace(/[:]+\s*$/, '').trim()
  if (!h) return { kind: 'unknown' }
  if (/^(Speelhulpen|Spielhilfen|Accessories)\b/i.test(h)) return { kind: 'accessories' }
  if (/^(Koppelingen|Koppels|Couplers|Couplings)\b/i.test(h)) return { kind: 'couplings' }
  // Try keyboard names: longest-first list mirrors KEYBOARD_PATTERNS in parsers.ts
  const kbAliases: Array<{ re: RegExp; canonical: string }> = [
    { re: /^Hoofdwerk\b/i, canonical: 'Hoofdwerk' },
    { re: /^Bovenwerk\b/i, canonical: 'Bovenwerk' },
    { re: /^Rugwerk\b/i, canonical: 'Rugwerk' },
    { re: /^Borstwerk\b/i, canonical: 'Borstwerk' },
    { re: /^Zwelwerk\b/i, canonical: 'Zwelwerk' },
    { re: /^Onderpositief\b/i, canonical: 'Onderpositief' },
    { re: /^Positief\b/i, canonical: 'Positief' },
    { re: /^Pedaal\b/i, canonical: 'Pedaal' },
    { re: /^Manuaal\s+III\b/i, canonical: 'Manuaal III' },
    { re: /^Manuaal\s+II\b/i, canonical: 'Manuaal II' },
    { re: /^Manuaal\s+I\b/i, canonical: 'Manuaal I' },
    { re: /^Manuaal\b/i, canonical: 'Manuaal' },
    { re: /^Hauptwerk\b/i, canonical: 'Hauptwerk' },
    { re: /^Schwellwerk\b/i, canonical: 'Schwellwerk' },
    { re: /^Brustwerk\b/i, canonical: 'Brustwerk' },
    { re: /^Oberwerk\b/i, canonical: 'Oberwerk' },
    { re: /^Positiv\b/i, canonical: 'Positiv' },
    { re: /^Pedal\b/i, canonical: 'Pedal' },
    { re: /^Manual\b/i, canonical: 'Manual' },
    { re: /^Great\b/i, canonical: 'Great' },
    { re: /^Swell\b/i, canonical: 'Swell' },
    { re: /^Choir\b/i, canonical: 'Choir' },
  ]
  for (const { re, canonical } of kbAliases) {
    if (re.test(h)) {
      const after = h.replace(re, '').trim()
      const range = after.replace(/^[(]|[)]$/g, '').trim() || undefined
      return { kind: 'register', name: canonical, ...(range ? { range } : {}) }
    }
  }
  return { kind: 'unknown' }
}

export function tableToDisposition(table: Table, warnings: Warning[]): ParsedDisposition | null {
  if (table.rows.length < 2) {
    warnings.push('table has fewer than 2 rows \u2014 cannot parse')
    return null
  }
  const headerRow = table.rows[0]
  const columns = headerRow.map(classifyHeader)
  if (columns.every((c) => c.kind === 'unknown')) {
    warnings.push(`no recognised column headers in: ${headerRow.join(' | ')}`)
    return null
  }

  const registers: ParsedKeyboard[] = []
  const couplings: ParsedNamed[] = []
  const accessories: ParsedNamed[] = []
  const registerByCol = new Map<number, ParsedKeyboard>()
  for (let ci = 0; ci < columns.length; ci++) {
    const c = columns[ci]
    if (c.kind === 'register' && c.name) {
      const kb: ParsedKeyboard = {
        name: c.name,
        ...(c.range ? { range: c.range } : {}),
        stops: [],
      }
      registerByCol.set(ci, kb)
      registers.push(kb)
    } else if (c.kind === 'unknown') {
      warnings.push(`column "${headerRow[ci]}" not recognised \u2014 ignored`)
    }
  }

  for (let ri = 1; ri < table.rows.length; ri++) {
    const row = table.rows[ri]
    for (let ci = 0; ci < columns.length; ci++) {
      const cell = (row[ci] || '').trim()
      if (!cell) continue
      const col = columns[ci]
      if (col.kind === 'register') {
        const normalised = addPitchApostrophe(cell)
        const stop: ParsedStop = parseStop(normalised)
        registerByCol.get(ci)!.stops.push(stop)
      } else if (col.kind === 'couplings') {
        couplings.push({ name: cell.replace(/\s+-\s+/g, ' \u2013 ') })
      } else if (col.kind === 'accessories') {
        accessories.push({ name: cell })
      }
    }
  }

  const totalStops = registers.reduce((n, kb) => n + kb.stops.filter((s) => s.pitch).length, 0)
  const manuals = registers.filter(
    (kb) => !/^(pedaal|pedal|p\u00e9dale|gro\u00dfpedal|kleinpedal)\b/i.test(kb.name),
  ).length

  return {
    manuals: manuals || undefined,
    stops: totalStops || undefined,
    registers,
    couplings,
    accessories,
  }
}

export function parseDispositionFromWpHtml(html: string): {
  value: ParsedDisposition | null
  warnings: Warning[]
} {
  const warnings: Warning[] = []
  const table = extractFirstTable(html, warnings)
  if (!table) return { value: null, warnings: [...warnings, 'no <table> found in WP source'] }
  const value = tableToDisposition(table, warnings)
  return { value, warnings }
}
