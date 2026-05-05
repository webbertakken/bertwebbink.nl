import { describe, expect, it } from 'vitest'
import {
  addPitchApostrophe,
  classifyTabularHeader,
  parseDispositionFromContent,
  parseLocation,
  parseStop,
  parseTabularDisposition,
} from './parsers'

// Build a Sanity-like portable-text block for tests.
function block(text: string) {
  return { _type: 'block', children: [{ _type: 'span', text }] }
}
function nonBlock(t: string) {
  return { _type: t }
}

describe('parseLocation', () => {
  it('splits a standard "<City> <Building>" title', () => {
    const { value, warnings } = parseLocation('Epe Grote Kerk')
    expect(warnings).toEqual([])
    expect(value).toEqual({ city: 'Epe', building: 'Grote Kerk', country: 'NL' })
  })

  it('keeps hyphenated city names whole', () => {
    const { value } = parseLocation('Achter-Drempt Sint Willibrorduskerk')
    expect(value?.city).toBe('Achter-Drempt')
    expect(value?.building).toBe('Sint Willibrorduskerk')
  })

  it('matches multi-word city patterns', () => {
    expect(parseLocation('Hoge Hexel Herv. Kerk').value?.city).toBe('Hoge Hexel')
    expect(parseLocation('Den Ham Herv. Dorpskerk').value?.city).toBe('Den Ham')
    expect(parseLocation('De Krim Herv Kerk').value?.city).toBe('De Krim')
    expect(parseLocation('Wirdum (Friesland) Martinuskerk').value?.city).toBe('Wirdum (Friesland)')
  })

  it('strips a stray comma after multi-word cities like "Den Burg (Texel),"', () => {
    const { value } = parseLocation('Den Burg (Texel), De Burght')
    expect(value?.city).toBe('Den Burg (Texel)')
    expect(value?.building).toBe('De Burght')
  })

  it('marks foreign cities with the right country code', () => {
    expect(parseLocation('Kassel St. Martinskirche').value?.country).toBe('DE')
    expect(parseLocation('Ahaus Mariä Himmelfahrt').value?.country).toBe('DE')
  })

  it('returns null + warning when the title has no space', () => {
    const { value, warnings } = parseLocation('Oud-Avereest')
    // Hyphenated single token doesn't match any multi-word pattern, no space → fail.
    expect(value).toBeNull()
    expect(warnings.join(' ')).toMatch(/no space/i)
  })

  it('returns null + warning when the multi-word city has no building after it', () => {
    const { value, warnings } = parseLocation('Oud Avereest')
    expect(value).toBeNull()
    expect(warnings.join(' ')).toMatch(/no building part/i)
  })
})

describe('parseStop', () => {
  it('extracts name + pitch for a foot-mark pitch', () => {
    expect(parseStop("Bourdon 16'")).toEqual({ name: 'Bourdon', pitch: "16'" })
  })

  it('extracts a fractional pitch', () => {
    expect(parseStop("Quint 2 2/3'")).toEqual({ name: 'Quint', pitch: "2 2/3'" })
  })

  it('extracts a Roman-numeral rank pitch', () => {
    expect(parseStop('Mixtuur III sterk')).toEqual({ name: 'Mixtuur', pitch: 'III sterk' })
  })

  it('extracts a multi-segment Roman-numeral chain', () => {
    expect(parseStop('Mixtuur II-III-IV sterk')).toEqual({
      name: 'Mixtuur',
      pitch: 'II-III-IV sterk',
    })
  })

  it('extracts digit-rank notation with English/French rank words', () => {
    expect(parseStop('Mixture III ranks')).toEqual({ name: 'Mixture', pitch: 'III ranks' })
    expect(parseStop('Plein Jeu 4 rangs')).toEqual({ name: 'Plein Jeu', pitch: '4 rangs' })
    expect(parseStop('Mixtur 3 fach')).toEqual({ name: 'Mixtur', pitch: '3 fach' })
    expect(parseStop('Mixtuur 3-4 st.')).toEqual({ name: 'Mixtuur', pitch: '3-4 st.' })
  })

  it('extracts a year-suffix as a note', () => {
    expect(parseStop("Bourdon 16' - 1809/1994")).toEqual({
      name: 'Bourdon',
      pitch: "16'",
      note: '1809/1994',
    })
  })

  it('extracts a non-year textual note after a dash', () => {
    expect(parseStop("Trompete 16' - extension")).toEqual({
      name: 'Trompete',
      pitch: "16'",
      note: 'extension',
    })
  })

  it('extracts a parenthetical modifier as a note', () => {
    expect(parseStop("Trompet 8' (gedeeld)")).toEqual({
      name: 'Trompet',
      pitch: "8'",
      note: 'gedeeld',
    })
  })

  it('combines parenthetical + year notes with a comma separator', () => {
    expect(parseStop('Cornet IV sterk (discant) - 1994')).toEqual({
      name: 'Cornet',
      pitch: 'IV sterk',
      note: 'discant, 1994',
    })
  })

  it('keeps a pitch-extension parenthetical inside the pitch', () => {
    // (1 1/3') is part of the pitch description, not a separate note.
    expect(parseStop("Mixtur 4 fach (1 1/3')")).toEqual({
      name: 'Mixtur',
      pitch: "4 fach (1 1/3')",
    })
  })

  it('handles a glued-year suffix without spaces around the dash', () => {
    expect(parseStop("Fluit 4' -2020")).toEqual({
      name: 'Fluit',
      pitch: "4'",
      note: '2020',
    })
  })

  it('preserves a hyphenated stop name', () => {
    expect(parseStop("Basson-Hobo 8' - 1959")).toEqual({
      name: 'Basson-Hobo',
      pitch: "8'",
      note: '1959',
    })
  })

  it('normalises curly quotes and a missing space before a parenthetical', () => {
    // \u2019 = curly apostrophe, no space between 8\u2019 and (
    expect(parseStop('Trompet 8\u2019(gedeeld)')).toEqual({
      name: 'Trompet',
      pitch: "8'",
      note: 'gedeeld',
    })
  })

  it('falls back to name-only when nothing matches', () => {
    expect(parseStop('Tremulant')).toEqual({ name: 'Tremulant' })
  })

  it('handles "discant"/"bas" position suffix on a foot mark', () => {
    expect(parseStop("Prestant 8' discant")).toEqual({
      name: 'Prestant',
      pitch: "8' discant",
    })
  })
})

describe('addPitchApostrophe', () => {
  it("appends ' to a trailing bare digit", () => {
    expect(addPitchApostrophe('Prestant 8')).toBe("Prestant 8'")
  })

  it("appends ' to a trailing fraction", () => {
    expect(addPitchApostrophe('Quint 2 2/3')).toBe("Quint 2 2/3'")
  })

  it('converts trailing B / D position letters to bas / discant', () => {
    expect(addPitchApostrophe('Stop Diapason 8 B')).toBe("Stop Diapason 8' bas")
    expect(addPitchApostrophe('Stop Diapason 8 D')).toBe("Stop Diapason 8' discant")
  })

  it('leaves untouched a cell that already contains an apostrophe pitch', () => {
    expect(addPitchApostrophe("Bourdon 16'")).toBe("Bourdon 16'")
  })

  it('leaves untouched a cell with a curly apostrophe', () => {
    expect(addPitchApostrophe('Bourdon 16\u2019')).toBe('Bourdon 16\u2019')
  })

  it('leaves untouched a "voet" cell (handled separately)', () => {
    expect(addPitchApostrophe('Prestant 8 voet')).toBe('Prestant 8 voet')
  })

  it('leaves untouched a cell with an explicit rank word', () => {
    expect(addPitchApostrophe('Mixtuur III sterk')).toBe('Mixtuur III sterk')
    expect(addPitchApostrophe('Mixtur 4 fach')).toBe('Mixtur 4 fach')
    expect(addPitchApostrophe('Mixture III ranks')).toBe('Mixture III ranks')
    expect(addPitchApostrophe('Plein Jeu 4 rangs')).toBe('Plein Jeu 4 rangs')
  })

  it('does not apostrophise a 4-digit year', () => {
    expect(addPitchApostrophe('Built 1870')).toBe('Built 1870')
  })

  it('returns the cell unchanged when no trailing digits', () => {
    expect(addPitchApostrophe('Tremulant')).toBe('Tremulant')
  })
})

describe('classifyTabularHeader', () => {
  it('classifies a Speelhulpen-like header as accessories', () => {
    expect(classifyTabularHeader('Speelhulpen:')).toEqual({ kind: 'accessories' })
    expect(classifyTabularHeader('Spielhilfen')).toEqual({ kind: 'accessories' })
    expect(classifyTabularHeader('Accessories:')).toEqual({ kind: 'accessories' })
  })

  it('classifies a Koppelingen-like header as couplings', () => {
    expect(classifyTabularHeader('Koppelingen:')).toEqual({ kind: 'couplings' })
    expect(classifyTabularHeader('Koppels')).toEqual({ kind: 'couplings' })
    expect(classifyTabularHeader('Couplers:')).toEqual({ kind: 'couplings' })
  })

  it('classifies a known keyboard name as a register and captures the range', () => {
    expect(classifyTabularHeader('Hoofdwerk C-f3:')).toEqual({
      kind: 'register',
      name: 'Hoofdwerk',
      range: 'C-f3',
    })
    expect(classifyTabularHeader('Pedaal:')).toEqual({ kind: 'register', name: 'Pedaal' })
    expect(classifyTabularHeader('Manuaal II (in zwelkast):')).toEqual({
      kind: 'register',
      name: 'Manuaal II',
      range: 'in zwelkast',
    })
  })

  it('returns unknown for empty strings and unrecognised labels', () => {
    expect(classifyTabularHeader('')).toEqual({ kind: 'unknown' })
    expect(classifyTabularHeader('   ')).toEqual({ kind: 'unknown' })
    expect(classifyTabularHeader('Random heading')).toEqual({ kind: 'unknown' })
  })
})

describe('parseTabularDisposition', () => {
  it('parses a 2-column whitespace-aligned table', () => {
    const lines = [
      'Hoofdwerk:                                      Bovenwerk:',
      'Prestant   8 voet                         Bourdon        8 voet',
      'Roerfluit   8 voet                         Gamba           8 voet',
    ]
    const warnings: string[] = []
    const out = parseTabularDisposition(lines, warnings)
    expect(out).not.toBeNull()
    expect(out!.registers).toHaveLength(2)
    expect(out!.registers[0].name).toBe('Hoofdwerk')
    expect(out!.registers[1].name).toBe('Bovenwerk')
    expect(out!.registers[0].stops.map((s) => s.name)).toEqual(['Prestant', 'Roerfluit'])
    expect(out!.registers[1].stops.map((s) => s.name)).toEqual(['Bourdon', 'Gamba'])
  })

  it('captures a compass range from a tabular header like "Hoofdwerk C-f3:"', () => {
    const lines = [
      'Hoofdwerk C-f3:                                  Bovenwerk C-f3:',
      "Prestant 8'                                      Bourdon 8'",
    ]
    const out = parseTabularDisposition(lines, [])!
    expect(out.registers[0].range).toBe('C-f3')
    expect(out.registers[1].range).toBe('C-f3')
  })

  it('handles a second header band that introduces new keyboards / coupling column', () => {
    const lines = [
      'Hoofdwerk:                                      Bovenwerk:',
      'Prestant   8 voet                         Bourdon        8 voet',
      'Pedaal:                                             Koppelingen:',
      'Subbas          16 voet                      Hoofdwerk & Bovenwerk',
    ]
    const warnings: string[] = []
    const out = parseTabularDisposition(lines, warnings)!
    const names = out.registers.map((r) => r.name)
    expect(names).toEqual(['Hoofdwerk', 'Bovenwerk', 'Pedaal'])
    const pedaal = out.registers.find((r) => r.name === 'Pedaal')!
    expect(pedaal.stops.map((s) => s.name)).toEqual(['Subbas'])
    expect(out.couplings.map((c) => c.name)).toContain('Hoofdwerk – Bovenwerk')
  })

  it('returns null when no header row is present', () => {
    expect(parseTabularDisposition(['plain prose line', 'another'], [])).toBeNull()
  })

  it('returns null when wide-gap rows have no recognised header cells', () => {
    // Multi-cell after split but neither cell classifies as a known column.
    const lines = ['random                                          junk']
    expect(parseTabularDisposition(lines, [])).toBeNull()
  })

  it('returns null when the header recognises only non-register columns and no data follows', () => {
    const lines = ['Koppelingen:                                          Speelhulpen:']
    expect(parseTabularDisposition(lines, [])).toBeNull()
  })

  it('skips blank rows and zero-cell rows in the tabular data loop', () => {
    const lines = [
      'Hoofdwerk:                                      Bovenwerk:',
      "Bourdon 16'                                     Holpijp 8'",
      '   ', // blank row — .trim() falsy, continues
      '', // empty row — splitTabularRow returns [], continues
      "Octaaf 4'                                       Prestant 4'",
    ]
    const out = parseTabularDisposition(lines, [])!
    expect(out.registers[0].stops.map((s) => s.name)).toEqual(['Bourdon', 'Octaaf'])
  })

  it('returns null on empty input', () => {
    expect(parseTabularDisposition([], [])).toBeNull()
  })

  it('terminates the section on a long narrative single-cell line', () => {
    const lines = [
      'Hoofdwerk                                           Bovenwerk',
      "Prestant 8'                                       Prestant 8'",
      "Octaaf 4'                                       Octaaf 4'",
      'Koppels:          pedaal - hoofdwerk',
      'Het orgel heeft een monumentale status gekregen evenals het kerkgebouw, een monument in een monument.',
    ]
    const warnings: string[] = []
    const out = parseTabularDisposition(lines, warnings)!
    expect(out.couplings).toHaveLength(1)
    expect(warnings.some((w) => /terminated at narrative/i.test(w))).toBe(true)
  })

  it('appends a single-cell pitched line to the first register as a continuation', () => {
    const lines = [
      'Hoofdwerk                                           Bovenwerk                                          Pedaal',
      "Prestant 8' - 1870                                Prestant 8' - 1870                                Subbas 16'",
      'Mixtuur III-IV - 1870 - a',
    ]
    const out = parseTabularDisposition(lines, [])!
    const hw = out.registers[0]
    expect(hw.stops.map((s) => s.name)).toContain('Mixtuur')
  })

  it('parses a Koppelingen post-table footer that follows the table', () => {
    const lines = [
      'Hoofdwerk                                           Bovenwerk',
      "Prestant 8'                                         Prestant 8'",
      'Koppels: pedaal - hoofdwerk',
      'pedaal – bovenwerk',
    ]
    const out = parseTabularDisposition(lines, [])!
    expect(out.couplings.map((c) => c.name)).toEqual([
      expect.stringMatching(/pedaal/i),
      expect.stringMatching(/pedaal/i),
    ])
  })

  it('parses a Speelhulpen post-table footer', () => {
    const lines = [
      'Hoofdwerk                                           Bovenwerk',
      "Prestant 8'                                         Prestant 8'",
      'Speelhulpen: Tremulant',
      'Ventiel',
    ]
    const out = parseTabularDisposition(lines, [])!
    expect(out.accessories.map((a) => a.name)).toEqual(['Tremulant', 'Ventiel'])
  })

  it('splits a year out of a post-table coupling continuation line', () => {
    const lines = [
      'Hoofdwerk                                           Bovenwerk',
      "Prestant 8'                                         Prestant 8'",
      'Koppels: Manuaalkoppel',
      'Pedaalkoppel – 1985',
    ]
    const out = parseTabularDisposition(lines, [])!
    expect(out.couplings).toEqual([
      { name: 'Manuaalkoppel' },
      { name: 'Pedaalkoppel', note: '1985' },
    ])
  })

  it('warns and continues on a single-cell post-table line that does not match anything known', () => {
    const lines = [
      'Hoofdwerk                                           Bovenwerk',
      "Prestant 8'                                         Prestant 8'",
      'a = deels 1870',
    ]
    const warnings: string[] = []
    parseTabularDisposition(lines, warnings)
    expect(warnings.some((w) => /tabular post-section unrecognised/.test(w))).toBe(true)
  })

  it('warns when a multi-cell row has more cells than columns', () => {
    const lines = [
      'Hoofdwerk:                                      Bovenwerk:',
      "Prestant 8'                                     Bourdon 8'                                     Extra",
    ]
    const warnings: string[] = []
    parseTabularDisposition(lines, warnings)
    expect(warnings.some((w) => /more cells/.test(w))).toBe(true)
  })

  it('warns when a tabular cell has no parseable pitch', () => {
    const lines = [
      'Hoofdwerk:                                      Bovenwerk:',
      'Halfpipe                                        Funky stuff',
    ]
    const warnings: string[] = []
    parseTabularDisposition(lines, warnings)
    expect(warnings.some((w) => /no pitch parsed/.test(w))).toBe(true)
  })

  it('parses an accessory with a trailing year-dash as name + note', () => {
    const { value } = parseDispositionFromContent([
      block('Dispositie'),
      block("Manuaal: Bourdon 16'."),
      block('Speelhulpen: Tremulant - 2002.'),
    ])
    expect(value!.accessories).toEqual([{ name: 'Tremulant', note: '2002' }])
  })

  it('parses an accessory with a parenthetical description as name + note', () => {
    const { value } = parseDispositionFromContent([
      block('Dispositie'),
      block("Manuaal: Bourdon 16'."),
      block('Speelhulpen: Tremulant (over het gehele werk).'),
    ])
    expect(value!.accessories).toEqual([{ name: 'Tremulant', note: 'over het gehele werk' }])
  })

  it('skips a multi-cell row that has unrecognised columns mixed in (not a clean second band)', () => {
    // First-band header valid, then a row with only 1 recognised header cell among 2 —
    // should NOT be treated as a new band but processed as a data row instead.
    const lines = [
      'Hoofdwerk:                                      Bovenwerk:',
      "Bourdon 16'                                     Holpijp 8'",
      'Some prose                                      Pedaal:',
    ]
    const out = parseTabularDisposition(lines, [])!
    // "Pedaal:" should NOT have spawned a register since the row mixed prose with header.
    expect(out.registers.map((r) => r.name)).toEqual(['Hoofdwerk', 'Bovenwerk'])
  })

  it('omits manuals/stops totals in the tabular path when zero', () => {
    // Two pedal-style columns + pitchless content → manuals = 0 (both filtered)
    // and totalStops = 0. Both should be omitted from the result.
    const lines = [
      'Pedaal:                                             Pedal:',
      'Aangehangen                                         Aangehangen',
    ]
    const out = parseTabularDisposition(lines, [])!
    expect(out.manuals).toBeUndefined()
    expect(out.stops).toBeUndefined()
  })

  it('routes tabular data cells in a Speelhulpen column to the accessories list', () => {
    const lines = [
      'Hoofdwerk:                                      Speelhulpen:',
      "Bourdon 16'                                     Tremulant",
    ]
    const out = parseTabularDisposition(lines, [])!
    expect(out.accessories.map((a) => a.name)).toEqual(['Tremulant'])
  })

  it('reuses an existing register by name when a second header band repeats it', () => {
    // Hoofdwerk appears in band 1 at col 0 and again in band 2 at col 1; the
    // ensureRegister helper must reuse the existing register, not create a duplicate.
    const lines = [
      'Hoofdwerk:                                      Bovenwerk:',
      "Bourdon 16'                                     Holpijp 8'",
      'Pedaal:                                             Hoofdwerk:',
      "Subbas 16'                                      Trompet 8'",
    ]
    const out = parseTabularDisposition(lines, [])!
    const names = out.registers.map((r) => r.name)
    // Hoofdwerk should appear only once in the registers list.
    expect(names.filter((n) => n === 'Hoofdwerk')).toHaveLength(1)
    const hw = out.registers.find((r) => r.name === 'Hoofdwerk')!
    // The Hoofdwerk register accumulates stops from both bands.
    expect(hw.stops.map((s) => s.name)).toEqual(['Bourdon', 'Trompet'])
  })
})

describe('parseDispositionFromContent', () => {
  it('returns null + warning for empty content', () => {
    expect(parseDispositionFromContent(undefined).value).toBeNull()
    expect(parseDispositionFromContent([]).value).toBeNull()
  })

  it('handles a block that has no `children` array (treats as empty text)', () => {
    // A pathological block missing its children property; blockText falls back
    // to an empty array. Just verify nothing crashes and the marker isn't
    // accidentally found.
    const { value, warnings } = parseDispositionFromContent([{ _type: 'block' }])
    expect(value).toBeNull()
    expect(warnings.some((w) => /no "Dispositie" marker/.test(w))).toBe(true)
  })

  it('returns null + warning when no Dispositie marker is present', () => {
    const { value, warnings } = parseDispositionFromContent([
      block('Some prose'),
      block('More prose'),
    ])
    expect(value).toBeNull()
    expect(warnings.some((w) => /no "Dispositie" marker/.test(w))).toBe(true)
  })

  it('parses a typical single-organ line-by-line disposition', () => {
    const { value, warnings } = parseDispositionFromContent([
      block('Dispositie'),
      block("Hoofdwerk: Bourdon 16', Prestant 8', Octaaf 4', Mixtuur III sterk, Trompet 8'."),
      block("Pedaal: Subbas 16', Octaaf 8'."),
      block('Koppelingen: Hoofdwerk - Pedaal.'),
      block('Speelhulpen: Tremulant.'),
    ])
    expect(warnings).toEqual([])
    expect(value).not.toBeNull()
    expect(value!.registers.map((r) => r.name)).toEqual(['Hoofdwerk', 'Pedaal'])
    expect(value!.couplings).toHaveLength(1)
    expect(value!.accessories.map((a) => a.name)).toContain('Tremulant')
    expect(value!.manuals).toBe(1)
    expect(value!.stops).toBe(7)
  })

  it('flags multiple Dispositie markers and parses only the first instrument', () => {
    const { value, warnings } = parseDispositionFromContent([
      block('Dispositie Naberorgel'),
      block("Manuaal: Bourdon 16', Prestant 8'."),
      block('Pedaal: Aangehangen.'),
      block('Dispositie Blankorgel'),
      block("Manuaal I: Holpijp 8'."),
    ])
    expect(value!.registers.map((r) => r.name)).toEqual(['Manuaal', 'Pedaal'])
    expect(warnings.some((w) => /multiple "Dispositie" markers/.test(w))).toBe(true)
  })

  it('skips embedded media (image/audio) between the marker and the keyboard list', () => {
    const { value } = parseDispositionFromContent([
      block('Dispositie:'),
      nonBlock('image'),
      nonBlock('audio'),
      block("Manuaal: Bourdon 16', Prestant 8'."),
    ])
    expect(value!.registers).toHaveLength(1)
    expect(value!.registers[0].stops.map((s) => s.name)).toEqual(['Bourdon', 'Prestant'])
  })

  it('terminates the disposition section on three consecutive blank blocks', () => {
    const { value } = parseDispositionFromContent([
      block('Dispositie'),
      block("Manuaal: Bourdon 16'."),
      block(''),
      block(''),
      block(''),
      block("Pedaal: Subbas 16'."),
    ])
    expect(value!.registers.map((r) => r.name)).toEqual(['Manuaal'])
  })

  it('terminates on editor metadata lines like "Bert: 1"', () => {
    const { value } = parseDispositionFromContent([
      block('Dispositie'),
      block("Manuaal: Bourdon 16', Prestant 8'."),
      block('Bert: 1'),
      block('Ab: 2'),
    ])
    expect(value!.registers).toHaveLength(1)
  })

  it('supports the "Dispositie:" trailing-colon marker variant', () => {
    const { value } = parseDispositionFromContent([
      block('Huidige dispositie:'),
      block('Hoofdwerk                                           Bovenwerk'),
      block("Prestant 8'                                         Prestant 8'"),
    ])
    expect(value).not.toBeNull()
    expect(value!.registers.map((r) => r.name)).toEqual(['Hoofdwerk', 'Bovenwerk'])
  })

  it('appends a comma-ending stop continuation to the previous keyboard', () => {
    const { value } = parseDispositionFromContent([
      block('Dispositie'),
      block("Hoofdwerk: Bourdon 16', Prestant 8',"),
      block("Roerfluit 8', Octaaf 4', Trompet 8'."),
    ])
    const hw = value!.registers.find((r) => r.name === 'Hoofdwerk')!
    expect(hw.stops.map((s) => s.name)).toEqual([
      'Bourdon',
      'Prestant',
      'Roerfluit',
      'Octaaf',
      'Trompet',
    ])
  })

  it('appends a coupling continuation to the couplings list', () => {
    const { value } = parseDispositionFromContent([
      block('Dispositie'),
      block("Manuaal: Bourdon 16'."),
      block('Koppelingen: Hoofdwerk - Bovenwerk,'),
      block('Pedaal - Hoofdwerk.'),
    ])
    expect(value!.couplings.map((c) => c.name)).toEqual([
      'Hoofdwerk – Bovenwerk',
      'Pedaal – Hoofdwerk',
    ])
  })

  it('discards a year-shaped keyboard parenthetical from the range field', () => {
    // "Pedaal (2001):" — the (2001) describes when the pedal was added; it's
    // not a compass range, so it should not become `range`.
    const { value } = parseDispositionFromContent([
      block('Dispositie'),
      block("Pedaal (2001): Subbas 16', Octaaf 8'."),
    ])
    expect(value!.registers[0].range).toBeUndefined()
    expect(value!.registers[0].name).toBe('Pedaal')
  })

  it('captures keyboard compass ranges from the line-by-line path', () => {
    const { value } = parseDispositionFromContent([
      block('Dispositie'),
      block("Hoofdwerk (C-f'''): Bourdon 16', Prestant 8'."),
      block("Pedaal (C-d'): Subbas 16'."),
    ])
    expect(value!.registers.find((r) => r.name === 'Hoofdwerk')!.range).toBe("C-f'''")
    expect(value!.registers.find((r) => r.name === 'Pedaal')!.range).toBe("C-d'")
  })

  it('omits manuals/stops when only Pedaal with pitchless content remains', () => {
    const { value } = parseDispositionFromContent([
      block('Dispositie'),
      block('Pedaal: Aangehangen.'),
    ])
    // Pedaal-only and zero pitched stops → both totals omitted.
    expect(value!.manuals).toBeUndefined()
    expect(value!.stops).toBeUndefined()
  })

  it('parses a coupling with a trailing year as name + note', () => {
    const { value } = parseDispositionFromContent([
      block('Dispositie'),
      block("Manuaal: Bourdon 16'."),
      block('Koppelingen: Manuaalkoppel - 2004.'),
    ])
    expect(value!.couplings).toEqual([{ name: 'Manuaalkoppel', note: '2004' }])
  })

  it('parses a coupling with a parenthetical note as name + note', () => {
    const { value } = parseDispositionFromContent([
      block('Dispositie'),
      block("Manuaal: Bourdon 16'."),
      block('Koppelingen: Manuaalkoppel (schuifkoppel).'),
    ])
    expect(value!.couplings).toEqual([{ name: 'Manuaalkoppel', note: 'schuifkoppel' }])
  })

  it('flags an unrecognised non-keyboard line', () => {
    const { warnings } = parseDispositionFromContent([
      block('Dispositie'),
      block("Manuaal: Bourdon 16'."),
      block('Tremulant achter het register windlozing'),
    ])
    expect(warnings.some((w) => /unrecognised disposition line/.test(w))).toBe(true)
  })

  it('returns null when no keyboards parse but the marker existed', () => {
    const { value, warnings } = parseDispositionFromContent([
      block('Dispositie:'),
      block('Bron:'),
      block('- Orgels in Drenthe'),
    ])
    expect(value).toBeNull()
    expect(warnings.some((w) => /no keyboards parsed/.test(w))).toBe(true)
  })

  it('returns null when there are no lines after the marker', () => {
    const { value, warnings } = parseDispositionFromContent([block('Dispositie:')])
    expect(value).toBeNull()
    expect(warnings.some((w) => /no disposition lines/.test(w))).toBe(true)
  })

  it('routes a tabular layout through the column-aware parser', () => {
    const { value } = parseDispositionFromContent([
      block('Dispositie van het orgel'),
      block('Hoofdwerk:                                      Bovenwerk:'),
      block('Prestant   8 voet                         Bourdon        8 voet'),
    ])
    expect(value).not.toBeNull()
    expect(value!.registers.map((r) => r.name)).toEqual(['Hoofdwerk', 'Bovenwerk'])
  })

  it('falls back to line-by-line parsing if the tabular parser yields nothing', () => {
    // First non-blank line *looks* tabular (multi-space gaps + 2 keyboard names) but
    // the rest of the data does not actually structure as columns. The fallthrough
    // path is exercised when parseTabularDisposition returns null.
    const { value } = parseDispositionFromContent([
      block('Dispositie'),
      // A single line resembling a header is not enough to commit to tabular mode
      // because we require 2+ lines with 4+ whitespace gaps in the lookahead.
      block("Hoofdwerk: Bourdon 16'."),
    ])
    expect(value).not.toBeNull()
    expect(value!.registers).toHaveLength(1)
  })

  it('treats a stop-shaped continuation that ends with a period as a continuation', () => {
    const { value } = parseDispositionFromContent([
      block('Dispositie'),
      block("Hoofdwerk: Bourdon 16', Prestant 8'."),
      block("Octaaf 4', Mixtuur III sterk."),
    ])
    const hw = value!.registers[0]
    expect(hw.stops.map((s) => s.name)).toEqual(['Bourdon', 'Prestant', 'Octaaf', 'Mixtuur'])
  })

  it('skips a keyboard-prefixed line that has no colon (matchKeyboard fallthrough)', () => {
    // "Hoofdwerk" matches a keyboard name but the line has no colon — the inner
    // regex in matchKeyboard fails and the line is treated as unrecognised.
    const { value, warnings } = parseDispositionFromContent([
      block('Dispositie'),
      block("Pedaal: Subbas 16'."),
      block('Hoofdwerk no colon here ends weirdly'),
    ])
    // Pedaal still parses; the broken Hoofdwerk line is flagged.
    expect(value!.registers.map((r) => r.name)).toEqual(['Pedaal'])
    expect(warnings.some((w) => /unrecognised disposition line/.test(w))).toBe(true)
  })

  it('warns when a stop in a normal line-by-line list has no parseable pitch', () => {
    const { warnings } = parseDispositionFromContent([
      block('Dispositie'),
      block("Manuaal: Bourdon 16', randomstuff, Trompet 8'."),
    ])
    expect(warnings.some((w) => /no pitch parsed \(kept as name only\)/.test(w))).toBe(true)
  })

  it('flags 3+ tabular two-column lines mixed into otherwise non-tabular content and bails out', () => {
    // A first line that does NOT look tabular (so the tabular pre-check inside
    // parseDispositionFromContent fails), followed by 3+ wide-gap tabular lines
    // that the line-by-line path has to step over. This is the only way to
    // exercise the `tabularCount >= 3` early-return branch.
    const { value, warnings } = parseDispositionFromContent([
      block('Dispositie'),
      block("Manuaal: Bourdon 16'."),
      block('A          B          C'),
      block('D          E          F'),
      block('G          H          I'),
    ])
    expect(value).toBeNull()
    expect(warnings.some((w) => /tabular two-column disposition detected/.test(w))).toBe(true)
  })
})
