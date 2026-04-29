import type { TranslationUnit } from './types'

/**
 * Diff-aware partitioning.
 *
 * Given the freshly extracted source units and the previous (source,
 * translation) pair, returns:
 *
 *   - `changed`: source units whose `sourceText` differs from the
 *     previous source's matching unit (by id), or which are new.
 *   - `unchanged`: source units whose text matches the previous source.
 *     For these, callers should reuse the previous translation verbatim.
 *
 * The result is independent of the LLM \u2014 it just classifies units.
 */
export function diffUnits(
  current: TranslationUnit[],
  previousSource: TranslationUnit[] | undefined,
  previousTranslation: TranslationUnit[] | undefined,
): {
  changed: TranslationUnit[]
  reuseTranslated: TranslationUnit[]
  removedIds: string[]
} {
  const prevSrcById = new Map((previousSource ?? []).map((u) => [u.id, u.sourceText]))
  const prevTransById = new Map((previousTranslation ?? []).map((u) => [u.id, u.sourceText]))
  const currentIds = new Set(current.map((u) => u.id))

  const changed: TranslationUnit[] = []
  const reuseTranslated: TranslationUnit[] = []

  for (const unit of current) {
    const prevSrc = prevSrcById.get(unit.id)
    const prevTrans = prevTransById.get(unit.id)
    if (prevSrc != null && prevTrans != null && prevSrc === unit.sourceText) {
      // Source text identical to previous \u2014 reuse the previous translation.
      reuseTranslated.push({ id: unit.id, sourceText: prevTrans })
    } else {
      changed.push(unit)
    }
  }

  // Anything in previousTranslation that's no longer in current is dropped.
  const removedIds: string[] = []
  for (const id of prevTransById.keys()) {
    if (!currentIds.has(id)) removedIds.push(id)
  }

  return { changed, reuseTranslated, removedIds }
}

/**
 * Compose a final translation set from a translator's (changed-only)
 * output plus the reused-from-previous units. Returned in the order of
 * the original source units.
 */
export function combineTranslations(
  source: TranslationUnit[],
  fromTranslator: TranslationUnit[],
  reused: TranslationUnit[],
): TranslationUnit[] {
  const byId = new Map<string, string>()
  for (const u of fromTranslator) byId.set(u.id, u.sourceText)
  for (const u of reused) byId.set(u.id, u.sourceText)
  return source.map((u) => ({
    id: u.id,
    sourceText: byId.get(u.id) ?? u.sourceText,
  }))
}
