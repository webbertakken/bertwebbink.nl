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
  if (last.kind === 'prop' && typeof cursor === 'object' && !Array.isArray(cursor) && cursor != null) {
    ;(cursor as AnyDoc)[last.name] = value
  }
  return out
}

/** Extract translatable units for a list of dotted paths. Empty/missing values are skipped. */
export function extractStringFields(doc: AnyDoc, paths: string[]): TranslationUnit[] {
  const out: TranslationUnit[] = []
  for (const path of paths) {
    const value = readPath(doc, path)
    if (typeof value === 'string' && value.trim().length > 0) {
      out.push({ id: path, sourceText: value })
    }
  }
  return out
}

/** Re-apply translated string units. Returns a deep-cloned doc. */
export function applyStringFields(
  doc: AnyDoc,
  units: TranslationUnit[],
): AnyDoc {
  let result = deepClone(doc)
  for (const unit of units) {
    result = writePath(result, unit.id, unit.sourceText)
  }
  return result
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
