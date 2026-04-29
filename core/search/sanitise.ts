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

export function sanitiseQuery(input: string): string | null {
  if (typeof input !== 'string') return null

  const trimmed = input.trim()
  if (trimmed === '') return null

  const normalised = trimmed.normalize('NFC').toLowerCase()

  const tokens = normalised
    .split(/\s+/)
    .map((token) => token.replace(NON_TOKEN_CHARS, ''))
    .filter((token) => token.length >= MIN_TOKEN_LENGTH)

  if (tokens.length === 0) return null

  return tokens.map((token) => `${token}*`).join(' ')
}
