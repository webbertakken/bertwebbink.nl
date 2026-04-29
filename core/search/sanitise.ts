/**
 * Turn a raw user search query into a GROQ `match`-safe token string.
 *
 * Steps:
 *   1. NFC-normalise (mirrors the project's slug normalisation; matters for
 *      Devanagari / Arabic / Thai / decomposed Latin)
 *   2. Lowercase
 *   3. Split on whitespace
 *   4. Strip everything that isn't a letter, digit, or combining mark
 *      (apostrophes, punctuation, currency, etc. are dropped)
 *   5. Drop tokens shorter than 2 characters
 *   6. Append `*` to each token (prefix matching), join with a single space
 *
 * Returns `null` if the result would be empty \u2014 callers should short-circuit
 * the Sanity request in that case.
 */

const MIN_TOKEN_LENGTH = 2

const NON_TOKEN_CHARS = /[^\p{L}\p{N}\p{M}]+/gu

/**
 * Tokenise raw user input into the bare lowercase tokens that drive both
 * the GROQ `match` query and the result-side highlighter. Returns an empty
 * array when nothing is searchable.
 *
 * Punctuation (including apostrophes) is treated as a token separator,
 * not stripped within a token. So `bach's` → `['bach']` (the trailing `s`
 * is dropped by the min-length filter), which correctly matches content
 * containing the word "Bach".
 */
export function extractTokens(input: string): string[] {
  if (typeof input !== 'string') return []

  const trimmed = input.trim()
  if (trimmed === '') return []

  const normalised = trimmed.normalize('NFC').toLowerCase()

  return normalised
    .replace(NON_TOKEN_CHARS, ' ')
    .split(/\s+/)
    .filter((token) => token.length >= MIN_TOKEN_LENGTH)
}

export function sanitiseQuery(input: string): string | null {
  const tokens = extractTokens(input)
  if (tokens.length === 0) return null
  return tokens.map((token) => `${token}*`).join(' ')
}
