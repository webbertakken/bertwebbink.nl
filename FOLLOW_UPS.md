# Follow-ups

Items deferred during the landing-page redesign. Tackle when ready; nothing here blocks the redesign itself.

## Editable-in-Sanity copy
Still hardcoded in `app/components/landing/*`. Owner explicitly deferred these for now — only the highest-impact ones (nav wordmark + tagline, hero corner subtitles) were lifted into Sanity. The rest stays as design defaults until Bert needs to edit them:
- Post detail: "Field note" eyebrow, "min read" suffix, "Plate I" caption tag, "— end of the journal —" prev/next end-state
- Post detail: lead paragraph (currently rendered as a regular paragraph). Could be a custom block style "lead" added to `blockContent`, opt-in by editor
- Post detail crumbs: "All organs" label
- Top-right editorial meta coordinates ("N 52° 25′ · E 6° 38′") — hardcoded by request
- Nav item labels (`Organs`, `Scores`, `About me`, `Elsewhere`)
- Organs landing: "Recent visits", "{n} of {total} · updated weekly", "By city", "All organs →"
- Footer link labels (Privacy, Elsewhere, Contact)

## Scores page
- Italic key portions in work titles (e.g. *g-moll*, *E-flat*) currently render as plain text. Could swap `work` to a small portable-text field with italic mark, or accept a Markdown-like syntax.
- "Preview" button is intentionally dropped — add back when an in-browser PDF viewer is wired (PDF.js / react-pdf).
- Notice copy and "Edition Webbink · {year}" hardcoded — candidate for the `settings.chrome` group.

## Sanity content backfill
After deploying the extended `post` schema, existing posts will fail validation on the new required `location` field. Backfill:
- `location.{city, country, building}` on every existing post (only the 5 most recent are done; ~160 to go)
- `disposition.{registers, manuals, stops, ...}` — same situation, only the 5 most recent backfilled by hand. The remaining ~160 have disposition data in `content[]` as freeform text and need a parser-based migration script (split on "Dispositie", per-keyboard sections, comma-separated stops with optional `(discant)` / `- year` notes). Pitch / temperament / action / restoredYear are not in any post and need editor input or external research.
- Optional: `builder`, `year` where known (none backfilled yet)
- Cover image `caption` field is now in the schema; backfill a one-line caption per post when convenient.

Media badges (audio/video) are derived from `content[]` blocks via GROQ — no manual tagging needed.

## Internationalisation
Site copy is currently English. Audience is presumably Dutch.
- Add a translation strategy (next-intl, or duplicate Sanity fields per locale)
- Translate hardcoded landing copy
- Translate Sanity `post` content fields (title, excerpt, content)

## Design system extensions
Likely-needed additions surfacing from the design:
- `tone: warm | cool | sage | stone` on `organ` to drive `Placeholder` color when no `coverImage`
- Per-organ `placeholderLabel` override (defaults to building name)

## Cleanup once admin / studio routes get restyled
Existing palette tokens (`--color-brand`, cyan scale) and starter components (`GetStartedCode`, `SideBySideIcons`, `Onboarding`) remain in the codebase but are unused on the new landing. Remove when no surface uses them.
