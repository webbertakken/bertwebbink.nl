import type { TranslationUnit } from '../types'

type PortableTextSpan = {
  _key?: string
  _type: 'span'
  text: string
  marks?: string[]
}

type PortableTextBlock = {
  _key?: string
  _type: 'block'
  style?: string
  children?: PortableTextSpan[]
  markDefs?: Array<Record<string, unknown>>
  listItem?: string
  level?: number
}

type AnyBlock = PortableTextBlock | { _key?: string; _type: string; [k: string]: unknown }

const TRANSLATABLE_LEAF_FIELDS = new Set(['caption', 'alt'])

/**
 * Extract translatable units from a Portable Text array.
 *
 * - Block-level prose: each span's text becomes one unit, but adjacent
 *   spans inside a single block are joined into a single unit with
 *   inline `<m1>...</m1>`-style markers preserving marks. This keeps
 *   the LLM honest about not splitting / merging sentences.
 * - Embedded media blocks (audio/video/image/embed/file): only the
 *   `caption` / `alt` fields are translatable; the structural type is
 *   left untouched.
 */
export function extractPortableTextUnits(blocks: AnyBlock[] | null | undefined): TranslationUnit[] {
  if (!blocks) return []
  const units: TranslationUnit[] = []
  blocks.forEach((block, blockIndex) => {
    if (block._type === 'block' && Array.isArray((block as PortableTextBlock).children)) {
      const merged = mergeSpansToText(block as PortableTextBlock)
      if (merged.text.trim()) {
        units.push({
          id: `block[${blockIndex}]`,
          sourceText: merged.text,
        })
      }
    } else {
      // Object/embed block \u2014 translate caption/alt fields only.
      for (const [key, value] of Object.entries(block)) {
        if (!TRANSLATABLE_LEAF_FIELDS.has(key)) continue
        if (typeof value === 'string' && value.trim()) {
          units.push({ id: `block[${blockIndex}].${key}`, sourceText: value })
        }
      }
    }
  })
  return units
}

/**
 * Re-apply translated units to the original Portable Text tree, returning
 * a deep-cloned copy. Preserves every `_key`, `_type`, `markDefs` etc.
 * Untranslated units (no entry in `units`) are kept verbatim.
 */
export function applyPortableTextUnits(
  blocks: AnyBlock[] | null | undefined,
  units: TranslationUnit[],
): AnyBlock[] {
  if (!blocks) return []
  const byId = new Map(units.map((u) => [u.id, u.sourceText]))
  return blocks.map((block, blockIndex) => {
    if (block._type === 'block' && Array.isArray((block as PortableTextBlock).children)) {
      const id = `block[${blockIndex}]`
      const translated = byId.get(id)
      if (translated == null) {
        return cloneBlock(block as PortableTextBlock)
      }
      return rebuildBlockFromText(block as PortableTextBlock, translated)
    }
    const cloned: AnyBlock = { ...(block as Record<string, unknown>) } as AnyBlock
    for (const key of TRANSLATABLE_LEAF_FIELDS) {
      const id = `block[${blockIndex}].${key}`
      const translated = byId.get(id)
      if (translated != null) (cloned as Record<string, unknown>)[key] = translated
    }
    return cloned
  })
}

/** Internal: render a block's children into a single string with `<mN>` wrappers. */
function mergeSpansToText(block: PortableTextBlock): {
  text: string
  spans: Array<{ marks: string[]; index: number }>
} {
  // Caller (`extractPortableTextUnits`) guarantees children is an array.
  const children = block.children as PortableTextSpan[]
  const text: string[] = []
  const spans: Array<{ marks: string[]; index: number }> = []
  for (let idx = 0; idx < children.length; idx++) {
    const span = children[idx]
    const marks = span.marks ?? []
    spans.push({ marks, index: idx })
    if (marks.length === 0) {
      text.push(span.text)
    } else {
      const tag = `m${idx + 1}`
      text.push(`<${tag}>${span.text}</${tag}>`)
    }
  }
  return { text: text.join(''), spans }
}

/** Internal: parse `<mN>...</mN>` segments back out of a translated string. */
function rebuildBlockFromText(original: PortableTextBlock, translated: string): PortableTextBlock {
  const children: PortableTextSpan[] = []
  const re = /<m(\d+)>([\s\S]*?)<\/m\d+>|([^<]+)/g
  let match: RegExpExecArray | null
  while ((match = re.exec(translated))) {
    if (match[1] != null && match[2] != null) {
      const idx = Number(match[1]) - 1
      const sourceSpan = original.children?.[idx]
      const marks = sourceSpan?.marks ?? []
      children.push({
        _key: sourceSpan?._key ?? `span-${idx}`,
        _type: 'span',
        text: match[2],
        marks: marks.length > 0 ? marks : undefined,
      })
    } else if (match[3]) {
      const last = children[children.length - 1]
      if (last && (!last.marks || last.marks.length === 0)) {
        last.text += match[3]
      } else {
        children.push({
          _key: original.children?.find((c) => !c.marks || c.marks.length === 0)?._key ?? undefined,
          _type: 'span',
          text: match[3],
        })
      }
    }
  }
  // Normalise: remove `marks` key when empty.
  for (const c of children) if (!c.marks || c.marks.length === 0) delete c.marks
  return {
    ...original,
    children: children.length > 0 ? children : original.children,
  }
}

function cloneBlock(block: PortableTextBlock): PortableTextBlock {
  return {
    ...block,
    children: block.children?.map((c) => ({ ...c })),
    markDefs: block.markDefs?.map((m) => ({ ...m })),
  }
}
