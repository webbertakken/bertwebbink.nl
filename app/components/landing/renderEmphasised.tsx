import { stegaClean } from '@sanity/client/stega'

/**
 * Replace `{{...}}` segments in a Sanity-authored string with `<em>...</em>`,
 * keeping surrounding text plain.
 *
 * Strips stega encoding *before* splitting. Sanity Live's stega encoding
 * sprinkles invisible Unicode characters across a string to carry source
 * metadata; splitting a stega-encoded string with a regex slices that
 * payload mid-sequence, which (a) drifts SSR output from client output
 * causing hydration warnings, and (b) makes the Visual Editor's DOM
 * walker fail with `Encoded data has invalid length` when it later tries
 * to decode those fragments. Cleaning first sidesteps both.
 *
 * Trade-off: the rendered text is no longer stega-tagged, so the Visual
 * Editor's "click on heading to edit" overlay won't attach to these
 * nodes. The field remains editable from the desk panel, and
 * `data-sanity` attributes can be added at the call site if inline-edit
 * is needed for a specific render.
 */
export function renderEmphasised(text: string | null | undefined) {
  if (!text) return null
  const clean = stegaClean(text) ?? ''
  const parts = clean.split(/(\{\{[^}]+\}\})/g)
  return parts.map((part, i) => {
    if (part.startsWith('{{') && part.endsWith('}}')) {
      return (
        <em key={i} className="font-normal italic">
          {part.slice(2, -2)}
        </em>
      )
    }
    return <span key={i}>{part}</span>
  })
}

/**
 * Lightweight inline italic renderer using single-asterisk markdown
 * (`*g-moll*`, `*E-flat*`). Designed for compact strings like score
 * work titles where `{{double braces}}` would feel heavy. Same
 * stega-cleaning rationale as `renderEmphasised`.
 */
export function renderInlineItalic(text: string | null | undefined) {
  if (!text) return null
  const clean = stegaClean(text) ?? ''
  const parts = clean.split(/(\*[^*]+\*)/g)
  return parts.map((part, i) => {
    if (part.length >= 2 && part.startsWith('*') && part.endsWith('*')) {
      return (
        <em key={i} className="font-normal italic">
          {part.slice(1, -1)}
        </em>
      )
    }
    return <span key={i}>{part}</span>
  })
}
