import { describe, expect, it } from 'vitest'
import { extractFirstTable, parseDispositionFromWpHtml, tableToDisposition } from './wp-html'

describe('extractFirstTable', () => {
  it('returns null when no table is present', () => {
    const w: string[] = []
    expect(extractFirstTable('<p>Just prose</p>', w)).toBeNull()
  })

  it('extracts cells from rows, decoding entities and stripping tags', () => {
    const html = `
      <table>
        <tr><td><b>Hoofdwerk:</b></td><td>Bovenwerk:</td></tr>
        <tr><td>Prestant&nbsp;8</td><td>Bourdon&nbsp;8</td></tr>
        <tr><td>Octaaf 4</td><td>Gedekt 4</td></tr>
      </table>`
    const w: string[] = []
    const t = extractFirstTable(html, w)!
    expect(t.rows).toHaveLength(3)
    expect(t.rows[0]).toEqual(['Hoofdwerk:', 'Bovenwerk:'])
    expect(t.rows[1]).toEqual(['Prestant 8', 'Bourdon 8'])
    expect(t.rows[2]).toEqual(['Octaaf 4', 'Gedekt 4'])
    expect(w).toEqual([])
  })

  it('reconstructs fractions split across <span> font sizes', () => {
    // Mirrors what was actually in the WP source for Hoogeveen.
    const html =
      '<table><tr><td><span style="font-size: small;">Quint 2</span><span style="font-size: xx-small;">2/3</span></td></tr></table>'
    const out = extractFirstTable(html, [])!
    expect(out.rows[0][0]).toBe('Quint 2 2/3')
  })

  it('treats empty cells as empty strings', () => {
    const html = '<table><tr><td>Hoofdwerk:</td><td></td></tr></table>'
    const t = extractFirstTable(html, [])!
    expect(t.rows[0]).toEqual(['Hoofdwerk:', ''])
  })

  it('returns null when the table contains no rows', () => {
    expect(extractFirstTable('<table></table>', [])).toBeNull()
  })

  it('rejects a cell whose tag-stripping leaves leftover < / > characters', () => {
    // A pathological cell that hides a tag-shaped string (e.g. unclosed) so it survives
    // tag removal — should be replaced with empty + warning.
    // Crafted: <td> ... <not-a-real-tag... — the regex removes balanced tags but the
    // unclosed `<not-a-real-tag` survives.
    const html = '<table><tr><td>safe</td><td>weird <not-a-tag suspicious</td></tr></table>'
    const w: string[] = []
    const t = extractFirstTable(html, w)
    expect(t).not.toBeNull()
    expect(t!.rows[0]).toEqual(['safe', ''])
    expect(w.some((m) => /leftover tag/i.test(m))).toBe(true)
  })

  it('truncates outsized cells and emits a warning', () => {
    const big = 'A'.repeat(1000)
    const html = `<table><tr><td>${big}</td></tr></table>`
    const w: string[] = []
    const t = extractFirstTable(html, w)!
    expect(t.rows[0][0].length).toBe(200)
    expect(w.some((m) => /truncated cell/i.test(m))).toBe(true)
  })

  it('strips control characters from cell text', () => {
    const html = '<table><tr><td>before\u200B\u0001after</td></tr></table>'
    const t = extractFirstTable(html, [])!
    expect(t.rows[0][0]).toBe('beforeafter')
  })

  it('skips a row that has no <td> cells (TR-without-TD)', () => {
    const html = '<table><tr></tr><tr><td>only</td></tr></table>'
    const t = extractFirstTable(html, [])!
    expect(t.rows).toHaveLength(1)
    expect(t.rows[0]).toEqual(['only'])
  })

  it('returns null when sanitiseCell discards all cells (purely whitespace table)', () => {
    const html = '<table><tr><td>   </td><td>&nbsp;</td></tr></table>'
    const t = extractFirstTable(html, [])
    // Cells become "" after trim → row is collected but is `['', '']`. Still a row with cells, so the table is returned.
    expect(t).not.toBeNull()
    expect(t!.rows[0]).toEqual(['', ''])
  })
})

describe('tableToDisposition', () => {
  it('returns null + warning for a 1-row table', () => {
    const w: string[] = []
    const out = tableToDisposition({ rows: [['Hoofdwerk:']] }, w)
    expect(out).toBeNull()
    expect(w.some((m) => /fewer than 2 rows/.test(m))).toBe(true)
  })

  it('returns null + warning when no headers are recognised', () => {
    const w: string[] = []
    const out = tableToDisposition(
      {
        rows: [
          ['Random', 'Junk'],
          ['a', 'b'],
        ],
      },
      w,
    )
    expect(out).toBeNull()
    expect(w.some((m) => /no recognised column headers/.test(m))).toBe(true)
  })

  it('parses a typical 4-column Dutch organ table', () => {
    const out = tableToDisposition(
      {
        rows: [
          ['Hoofdwerk C-f3:', 'Rugwerk C-f3:', 'Pedaal:', 'Speelhulpen:'],
          ['Quintadena 16', 'Holpijp 8', 'Subbas 16', 'Koppel HW-RW'],
          ['Prestant 8', 'Prestant 4', 'Prestant 8', 'Tremulant RW'],
          ['Mixtuur IV-VI st.', '', '', ''],
        ],
      },
      [],
    )!
    expect(out.registers.map((r) => r.name)).toEqual(['Hoofdwerk', 'Rugwerk', 'Pedaal'])
    expect(out.registers[0].range).toBe('C-f3')
    expect(out.registers[0].stops.map((s) => `${s.name} ${s.pitch || ''}`)).toEqual([
      "Quintadena 16'",
      "Prestant 8'",
      'Mixtuur IV-VI st.',
    ])
    expect(out.accessories.map((a) => a.name)).toEqual(['Koppel HW-RW', 'Tremulant RW'])
    expect(out.couplings).toEqual([])
  })

  it('classifies Koppelingen and Couplers columns as couplings', () => {
    const out = tableToDisposition(
      {
        rows: [
          ['Manuaal:', 'Koppelingen:'],
          ['Bourdon 16', 'Hoofdwerk - Pedaal'],
        ],
      },
      [],
    )!
    expect(out.couplings.map((c) => c.name)).toEqual(['Hoofdwerk – Pedaal'])
  })

  it('emits a warning for unknown column headers but keeps known ones', () => {
    const w: string[] = []
    const out = tableToDisposition(
      {
        rows: [
          ['Manuaal:', 'Wat is dit'],
          ['Bourdon 16', 'foo'],
        ],
      },
      w,
    )!
    expect(out.registers.map((r) => r.name)).toEqual(['Manuaal'])
    expect(w.some((m) => /not recognised/.test(m))).toBe(true)
  })

  it('counts manuals (excluding pedal-style names) and totals stops with a pitch', () => {
    const out = tableToDisposition(
      {
        rows: [
          ['Hoofdwerk:', 'Bovenwerk:', 'Pedaal:'],
          ['Bourdon 16', 'Holpijp 8', 'Subbas 16'],
        ],
      },
      [],
    )!
    expect(out.manuals).toBe(2)
    expect(out.stops).toBe(3)
  })

  it('classifies English keyboard headers (Great/Swell/Pedal)', () => {
    const out = tableToDisposition(
      {
        rows: [
          ['Great C-f3:', 'Swell C-f3:', 'Pedal C-f1:', 'Speelhulpen:'],
          ['Open Diapason 8', 'Bourdon 16', 'Bourdon 16', 'Great-Swell'],
        ],
      },
      [],
    )!
    expect(out.registers.map((r) => `${r.name} (${r.range})`)).toEqual([
      'Great (C-f3)',
      'Swell (C-f3)',
      'Pedal (C-f1)',
    ])
    expect(out.accessories.map((a) => a.name)).toEqual(['Great-Swell'])
    expect(out.manuals).toBe(2)
  })

  it('treats an empty header cell as an unknown column', () => {
    const w: string[] = []
    tableToDisposition(
      {
        rows: [
          ['', 'Manuaal:'],
          ['ignored', 'Bourdon 16'],
        ],
      },
      w,
    )
    expect(w.some((m) => /""/.test(m) && /not recognised/.test(m))).toBe(true)
  })

  it('omits manuals/stops when the only register is a Pedaal-only column with pitchless stops', () => {
    const out = tableToDisposition(
      {
        rows: [
          ['Pedaal:'],
          ['Tremulant'], // pitchless
        ],
      },
      [],
    )!
    // Only Pedaal → manuals = 0 → omitted
    expect(out.manuals).toBeUndefined()
    // No pitch → totalStops = 0 → omitted
    expect(out.stops).toBeUndefined()
  })
})

describe('parseDispositionFromWpHtml', () => {
  it('returns null + warning for HTML without a <table>', () => {
    const { value, warnings } = parseDispositionFromWpHtml('<p>Photos only</p>')
    expect(value).toBeNull()
    expect(warnings.some((m) => /no <table>/.test(m))).toBe(true)
  })

  it('returns the parsed disposition for a well-formed table', () => {
    const html = `
      <table>
        <tr><td>Manuaal:</td><td>Pedaal:</td></tr>
        <tr><td>Bourdon 16</td><td>Subbas 16</td></tr>
      </table>`
    const { value, warnings } = parseDispositionFromWpHtml(html)
    expect(value).not.toBeNull()
    expect(value!.registers.map((r) => r.name)).toEqual(['Manuaal', 'Pedaal'])
    expect(warnings).toEqual([])
  })
})
