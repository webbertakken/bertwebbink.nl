import type { TranslationUnit } from '../types'

type AnyDoc = Record<string, unknown>

/**
 * Read a value from a doc using a dotted path with optional `[<index>]`
 * or `[_key=="..."]` segments. Returns `undefined` if any step is missing.
 */
export function readPath(doc: AnyDoc, path: string): unknown {
  const segments = parsePath(path)
  let value: unknown = doc
  for (const seg of segments) {
    if (value == null) return undefined
    if (seg.kind === 'prop') {
      if (typeof value !== 'object' || Array.isArray(value)) return undefined
      value = (value as AnyDoc)[seg.name]
    } else if (seg.kind === 'index') {
      if (!Array.isArray(value)) return undefined
      value = value[seg.index]
    } else if (seg.kind === 'keyMatch') {
      if (!Array.isArray(value)) return undefined
      value = (value as Array<AnyDoc>).find((item) => item._key === seg.key)
    }
  }
  return value
}

/**
 * Write a value into a doc at a dotted path, creating intermediate
 * objects as needed. Returns a deep-cloned doc; the input is left
 * unchanged.
 */
export function writePath(doc: AnyDoc, path: string, value: unknown): AnyDoc {
  const segments = parsePath(path)
  const out = deepClone(doc)
  let cursor: unknown = out
  for (let i = 0; i < segments.length - 1; i++) {
    const seg = segments[i]
    if (seg.kind === 'prop') {
      if (typeof cursor !== 'object' || cursor == null || Array.isArray(cursor)) return out
      const co = cursor as AnyDoc
      if (co[seg.name] == null || typeof co[seg.name] !== 'object') co[seg.name] = {}
      cursor = co[seg.name]
    } else if (seg.kind === 'index') {
      if (!Array.isArray(cursor)) return out
      cursor = cursor[seg.index]
    } else if (seg.kind === 'keyMatch') {
      if (!Array.isArray(cursor)) return out
      cursor = (cursor as Array<AnyDoc>).find((item) => item._key === seg.key)
    }
    if (cursor == null) return out
  }
  const last = segments[segments.length - 1]
  if (
    last.kind === 'prop' &&
    typeof cursor === 'object' &&
    !Array.isArray(cursor) &&
    cursor != null
  ) {
    ;(cursor as AnyDoc)[last.name] = value
  }
  return out
}

/**
 * Extract translatable units for a list of dotted paths. Paths may
 * include `[*]` segments to mean "every entry in this array"; those
 * are expanded against the doc so the emitted unit ids are concrete
 * `[_key=="..."]` paths that can later be matched on apply.
 * Empty/missing values are skipped.
 */
export function extractStringFields(doc: AnyDoc, paths: string[]): TranslationUnit[] {
  const out: TranslationUnit[] = []
  for (const path of paths) {
    const concretePaths = expandWildcards(doc, path)
    for (const p of concretePaths) {
      const value = readPath(doc, p)
      if (typeof value === 'string' && value.trim().length > 0) {
        out.push({ id: p, sourceText: value })
      }
    }
  }
  return out
}

/**
 * A derived field reads a value from `readPath` on the source and
 * writes its translation to `writePath` on the target doc. Both paths
 * may share `[*]` wildcards in the same positions; the wildcard keys
 * resolved on the source are reused verbatim for the target path.
 *
 * This is how stop names work: the canonical name stays in `name`
 * (cloned from source), while the LLM-generated translation lands in
 * a dedicated `translation` field that the renderer shows in parens.
 */
export type DerivedFieldSpec = {
  readPath: string
  writePath: string
  /** Optional context hint forwarded to the LLM. */
  context?: string
}

export function extractDerivedFields(doc: AnyDoc, specs: DerivedFieldSpec[]): TranslationUnit[] {
  const out: TranslationUnit[] = []
  for (const spec of specs) {
    const concrete = expandWildcardPair(doc, spec.readPath, spec.writePath)
    for (const [readP, writeP] of concrete) {
      const value = readPath(doc, readP)
      if (typeof value === 'string' && value.trim().length > 0) {
        const unit: TranslationUnit = { id: writeP, sourceText: value }
        if (spec.context) unit.context = spec.context
        out.push(unit)
      }
    }
  }
  return out
}

/**
 * True when `unitId` is a concrete instance of `specPath`. `specPath`
 * may contain `[*]` segments that act as wildcards.
 */
export function specPathMatches(specPath: string, unitId: string): boolean {
  if (!specPath.includes('[*]')) return unitId === specPath
  const escaped = specPath
    .split('[*]')
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('\\[_key=="[^"]+"\\]')
  return new RegExp('^' + escaped + '$').test(unitId)
}

/** Re-apply translated string units. Returns a deep-cloned doc. */
export function applyStringFields(doc: AnyDoc, units: TranslationUnit[]): AnyDoc {
  let result = deepClone(doc)
  for (const unit of units) {
    result = writePath(result, unit.id, unit.sourceText)
  }
  return result
}

/**
 * Walk `doc` along `path`, expanding any `[*]` segments to the
 * matching `[_key=="..."]` paths against the doc's actual array
 * contents. Items without an `_key` are skipped (Sanity always emits
 * keys on array items). Returns the path verbatim if there's no `[*]`.
 */
export function expandWildcards(doc: AnyDoc, path: string): string[] {
  if (!path.includes('[*]')) return [path]
  const star = path.indexOf('[*]')
  const prefix = path.slice(0, star)
  const suffix = path.slice(star + '[*]'.length)
  const arr = readPath(doc, prefix)
  if (!Array.isArray(arr)) return []
  const out: string[] = []
  for (const item of arr) {
    if (item == null || typeof item !== 'object') continue
    const key = (item as { _key?: string })._key
    if (typeof key !== 'string') continue
    const concretePrefix = `${prefix}[_key=="${key}"]`
    for (const expanded of expandWildcards(doc, concretePrefix + suffix)) {
      out.push(expanded)
    }
  }
  return out
}

/**
 * Like `expandWildcards`, but expands `readPath` against the doc and
 * mirrors each resolved key into the matching `[*]` slot of
 * `writePath`. Returns `(concreteRead, concreteWrite)` pairs.
 */
export function expandWildcardPair(
  doc: AnyDoc,
  readPathTemplate: string,
  writePathTemplate: string,
): Array<[string, string]> {
  const readStar = readPathTemplate.indexOf('[*]')
  const writeStar = writePathTemplate.indexOf('[*]')
  if (readStar === -1 || writeStar === -1) return [[readPathTemplate, writePathTemplate]]
  const readPrefix = readPathTemplate.slice(0, readStar)
  const readSuffix = readPathTemplate.slice(readStar + '[*]'.length)
  const writePrefix = writePathTemplate.slice(0, writeStar)
  const writeSuffix = writePathTemplate.slice(writeStar + '[*]'.length)
  const arr = readPath(doc, readPrefix)
  if (!Array.isArray(arr)) return []
  const out: Array<[string, string]> = []
  for (const item of arr) {
    if (item == null || typeof item !== 'object') continue
    const key = (item as { _key?: string })._key
    if (typeof key !== 'string') continue
    const concrete = `[_key=="${key}"]`
    const nextRead = readPrefix + concrete + readSuffix
    const nextWrite = writePrefix + concrete + writeSuffix
    for (const pair of expandWildcardPair(doc, nextRead, nextWrite)) {
      out.push(pair)
    }
  }
  return out
}

type Segment =
  | { kind: 'prop'; name: string }
  | { kind: 'index'; index: number }
  | { kind: 'keyMatch'; key: string }

function parsePath(path: string): Segment[] {
  const out: Segment[] = []
  let i = 0
  let buf = ''
  const flushProp = () => {
    if (buf) {
      out.push({ kind: 'prop', name: buf })
      buf = ''
    }
  }
  while (i < path.length) {
    const ch = path[i]
    if (ch === '.') {
      flushProp()
      i++
    } else if (ch === '[') {
      flushProp()
      const close = path.indexOf(']', i)
      if (close === -1) throw new Error(`Unbalanced [ in path: ${path}`)
      const inner = path.slice(i + 1, close)
      const keyMatch = inner.match(/^_key=="(.+)"$/)
      if (keyMatch) {
        out.push({ kind: 'keyMatch', key: keyMatch[1] })
      } else {
        const idx = Number(inner)
        if (Number.isFinite(idx)) out.push({ kind: 'index', index: idx })
        else throw new Error(`Unsupported segment in path: [${inner}]`)
      }
      i = close + 1
    } else {
      buf += ch
      i++
    }
  }
  flushProp()
  return out
}

function deepClone<T>(value: T): T {
  if (value == null || typeof value !== 'object') return value
  if (Array.isArray(value)) return (value as unknown[]).map((v) => deepClone(v)) as unknown as T
  const out: AnyDoc = {}
  for (const [k, v] of Object.entries(value as AnyDoc)) out[k] = deepClone(v)
  return out as unknown as T
}
