# Follow-ups

Items deferred during the landing-page redesign. Tackle when ready; nothing here blocks the redesign itself.

## Editable-in-Sanity copy
Currently hardcoded in `app/components/landing/*`. Candidates for a `landingPage` (or expanded `settings`) singleton:
- Post detail: "Field note" eyebrow, "min read" suffix, "Plate I" caption tag, "— end of the journal —" prev/next end-state
- Post detail: lead paragraph (currently rendered as a regular paragraph). Could be a custom block style "lead" added to `blockContent`, opt-in by editor
- Post detail crumbs: "All organs" label
- Top-left editorial meta: "Vol. {year - 2017} · No. 6" + "A field journal"
- Top-right editorial meta: "N 52° 30′ · E 5° 55′" + "The low countries"
- Nav site title + "Organist" tagline
- Nav items (`Organs`, `Scores`, `About me`)
- "Recent visits" section title
- "{n} of {total} · updated weekly" copy
- "By city" sidebar heading
- "All organ posts →" link label
- Footer link labels (Privacy, Links, Contact)

## About page
- Repertoire cards (3 cards × 4 pieces) are educated guesses based on Dutch organ tradition. Replace with Bert's real repertoire focus when known.
- Timeline has placeholder years (`—`) for several entries; refine with real dates as they're confirmed.
- Quick facts "Opleiding" / "Organist" rows truncate visually on narrow viewports — consider splitting into more rows or shortening values.
- Portrait image is empty (placeholder stripe). Upload a real portrait via Studio when one is available.
- Postal address row reads only "Bert Webbink, Vriezenveen" — add street + postcode if Bert wants postal contact public.
- Press quotes section was intentionally omitted (no real reviews on file). Add a `pressQuotes` array to the `about` schema and a section in `<About />` if/when there are real quotes.

## Scores page
- Italic key portions in work titles (e.g. *g-moll*, *E-flat*) currently render as plain text. Could swap `work` to a small portable-text field with italic mark, or accept a Markdown-like syntax.
- "Preview" button is intentionally dropped — add back when an in-browser PDF viewer is wired (PDF.js / react-pdf).
- Notice copy and "Edition Webbink · {year}" hardcoded — candidate for `settings` once we have a singleton.
- Wire `data-sanity` on more score fields if useful (catalog, era, edition, year).

## Footer links
Currently placeholders (`#`):
- Privacy → real privacy policy page
- Links → curated outbound links page (or remove)
- Contact → real contact page or `mailto:`

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
- `tone: warm | cool | sage | stone` on `post` to drive `Placeholder` color when no `coverImage`
- Per-post `placeholderLabel` override (defaults to title fragment)
- Make Nav active state derive from current route instead of hardcoded `active="organs"`

## Cleanup once admin / studio routes get restyled
Existing palette tokens (`--color-brand`, cyan scale) and starter components (`GetStartedCode`, `SideBySideIcons`, `Onboarding`) remain in the codebase but are unused on the new landing. Remove when no surface uses them.
