# Follow-ups

Items deferred during the landing-page redesign. Tackle when ready; nothing here blocks the redesign
itself.

## Scores page

- Italic key portions in work titles (e.g. _g-moll_, _E-flat_) currently render as plain text. Could
  swap `work` to a small portable-text field with italic mark, or accept a Markdown-like syntax.
- "Preview" button is intentionally dropped — add back when an in-browser PDF viewer is wired
  (PDF.js / react-pdf).
- Notice copy and "Edition Webbink · {year}" hardcoded — candidate for the `settings.chrome` group.

## Sanity content backfill — status

Done via `scripts/sanity-backfill/` (parser + WP-HTML fallback + targeted fixups). Live coverage on
the 132 organ docs:

- `location.{city, country, building}`: **132 / 132** ✅
- `disposition.{registers, manuals, stops, couplings, accessories}`: **128 / 132**

Remaining manual touch items (parser cannot resolve):

- **4 photo-only posts have no disposition source data anywhere** (WP HTML confirmed empty too):
  Haaksbergen OLV van Lourdeskerk, Rijssen Zuiderkerk, Schuinesloot Herv. kapel, Rijssen
  Noorderkerk. Editor entry required.
- **14 multi-organ posts** got their _first_ instrument; secondary instruments still need entering.
  Schema currently allows only one disposition per organ doc — see _Schema limitation_ below.
- **A few oddly-formed couplings** in Dedemsvaart Hervormde kerk that the editor may want to tidy:
  `Manuaalkoppel, gedeeld in bas/discant – 1870` could be split into name + note.

Not done in this pass (deferred to editor):

- `builder`, `year` — not in any post's `content[]`; needs editor input or external research.
- `disposition.pitch`, `.temperament`, `.action`, `.restoredYear` — same.
- `coverImage.caption` — schema field exists; backfill a one-line caption per post when convenient.

Media badges (audio/video) are derived from `content[]` blocks via GROQ — no manual tagging needed.

### Schema limitation: multi-organ posts

14 posts cover a church visit where Bert played multiple instruments (e.g. Warnsveld Martinuskerk:
main Naberorgel + small Blankorgel; Leens Petruskerk: 3 organs). The current `organ` schema models
one `disposition` per doc, so only the first instrument was patched. Options for later:

- Extend the schema with `instruments: [{name, disposition}]`. Cleanest model; requires UI + query
  updates.
- Split into separate `organ` docs per instrument. Distorts the editorial structure (one visit →
  multiple posts) and changes URLs.
- Status quo + manual editor entry for the secondary instruments.

Affected posts: Almelo Sint Georgiusbasiliek (3), Leens Petruskerk (3), Almelo Grote- of Sint
Georgkerk, Arnhem St Walburgiskerk, Bathmen Dorpskerk, Bennekom Oude- of Alexanderkerk, Delden Oude
Blasius, Delden Sint Blasiuskerk, Emmen Grote- of Pancratiuskerk, Hattem Grote of st. Andreaskerk,
Heerde Johanneskerk, Oldenzaal St. Plechelmusbasiliek, Tzum Johanneskerk, Warnsveld Martinuskerk.

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

Existing palette tokens (`--color-brand`, cyan scale) and starter components (`GetStartedCode`,
`SideBySideIcons`, `Onboarding`) remain in the codebase but are unused on the new landing. Remove
when no surface uses them.
