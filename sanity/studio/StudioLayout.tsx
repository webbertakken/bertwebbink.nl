import type { LayoutProps } from 'sanity'

/**
 * Custom Sanity Studio CSS.
 *
 * Widens the document edit pane and removes the form's narrow max-width so
 * the PortableText editor on long posts (organ dispositions + audio +
 * images) has more horizontal room. Sanity's default pane sizing assumes
 * short forms; here we prefer the document pane to take most of the
 * available width.
 */
const STUDIO_CSS = `
  /* Make the right-most (document) pane occupy the lion's share of the
     studio width while keeping the structure list usable on the left. */
  [data-ui="Pane"]:last-child {
    flex: 4 1 720px;
    max-width: none;
  }

  /* Drop the inner max-width on the form layout so block content stretches
     to the pane edges. The form wraps fields in containers that cap width
     for readability — useful for short text, restrictive for PortableText. */
  [data-testid="pane"] form,
  [data-testid="pane"] form > div,
  [data-ui="DocumentPanel"] form,
  [data-ui="DocumentPanel"] form > div {
    max-width: none;
  }

  /* PortableText editor surface itself — give it more breathing room. */
  [data-testid="pt-editor"],
  [data-testid="pt-editor"] [contenteditable="true"] {
    max-width: none;
  }
`

export function StudioLayout(props: LayoutProps) {
  return (
    <>
      <style>{STUDIO_CSS}</style>
      {props.renderDefault(props)}
    </>
  )
}
