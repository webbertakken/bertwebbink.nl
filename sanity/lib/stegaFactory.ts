import { dataAttr } from './utils'

/**
 * Build a stega attribute factory pinned to a particular `(id, type)`.
 * Components pass the resulting `attr(path)` callable down to their
 * sub-components so per-locale ids work without context plumbing.
 */
export function stegaAttrFor(id: string, type: string) {
  return (path: string) => dataAttr({ id, type, path }).toString()
}

export type StegaAttr = ReturnType<typeof stegaAttrFor>
