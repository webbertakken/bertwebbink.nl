import type { ReactNode } from 'react'

/**
 * Tag renderers for next-intl's `t.rich()`, e.g.
 * `t.rich('heading', { em: emphasis })` for a message like `Notes <em>on</em> organs`.
 *
 * Defined at module level so renders pass stable functions instead of
 * declaring new ones each time.
 */

/** `<em>` in the regular weight, for display headings set in a light face. */
export const emphasis = (chunks: ReactNode) => <em className="italic font-normal">{chunks}</em>

/** `<em>` that keeps the surrounding weight. */
export const italic = (chunks: ReactNode) => <em className="italic">{chunks}</em>

/** Upright monospace span for code-like fragments inside italic copy. */
export const inlineCode = (chunks: ReactNode) => (
  <span className="not-italic font-mono text-sm text-ink">{chunks}</span>
)

/**
 * Renders `text` in place of the tag's content, upright and in ink. For
 * messages that wrap an interpolated value, e.g. `<city>{city}</city>`.
 */
export const highlighted = (text: ReactNode) =>
  function renderHighlighted() {
    return <span className="not-italic font-normal text-ink">{text}</span>
  }
