import { Fragment, type ReactNode } from 'react'

/**
 * Wrap occurrences of any `token` in `text` with `<mark>`, returning a
 * React fragment.
 *
 * Behaviour:
 *   - Empty/null text returns `null`.
 *   - No tokens returns the text unchanged.
 *   - Matching is case-insensitive.
 *   - Each token matches at the *start* of a word and extends across any
 *     trailing letters/digits/marks (mirrors GROQ `match` prefix behaviour:
 *     `bach` highlights `Bachs`, but `ach` does NOT highlight `Bach`).
 *   - Tokens are escaped before being interpolated into the regex; regex
 *     metacharacters in user input are inert.
 *   - HTML in the input text is rendered literally because the output is
 *     a React node tree, not a raw HTML string \u2014 no manual escaping needed.
 *
 * Word characters (for boundary detection and prefix extension) are
 * `\\p{L}\\p{N}\\p{M}` \u2014 letters, digits, combining marks. CJK characters
 * are letters, so a single CJK token highlights any occurrence (which is
 * the desired behaviour given the lack of inter-character boundaries).
 */

const WORD_CHAR = /[\p{L}\p{N}\p{M}]/u

function escapeRegExp(input: string): string {
  return input.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&')
}

export function highlight(text: string, tokens: readonly string[]): ReactNode {
  if (!text) return null

  const safeTokens = tokens.filter((t) => t.length > 0)
  if (safeTokens.length === 0) return text

  const pattern = safeTokens.map(escapeRegExp).join('|')
  const re = new RegExp(`(?:${pattern})[\\p{L}\\p{N}\\p{M}]*`, 'giu')

  const parts: ReactNode[] = []
  let lastIndex = 0
  let key = 0

  for (const match of text.matchAll(re)) {
    const idx = match.index ?? 0

    // Word-boundary check: the previous character must not be a word char.
    const prev = idx > 0 ? text[idx - 1] : ''
    if (prev && WORD_CHAR.test(prev)) continue

    if (idx > lastIndex) parts.push(text.slice(lastIndex, idx))
    parts.push(<mark key={key++}>{match[0]}</mark>)
    lastIndex = idx + match[0].length
  }

  if (parts.length === 0) return text
  if (lastIndex < text.length) parts.push(text.slice(lastIndex))

  return (
    <>
      {parts.map((part, i) => (
        <Fragment key={i}>{part}</Fragment>
      ))}
    </>
  )
}
