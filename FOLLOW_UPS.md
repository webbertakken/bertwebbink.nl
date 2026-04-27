# Follow-ups

Items deferred during the landing-page redesign. Tackle when ready; nothing here blocks the redesign
itself.

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

## Launch countdown gate

Prod should stay behind the under-construction gate until **30 April, 12:00 CET**, then auto-lift
with no manual flip required.

Current state: `middleware.ts` gates everything when `UNDER_CONSTRUCTION` is set, with a bypass
cookie (`?bypass=happy birthday`). Manual on/off only.

Desired: time-based auto-lift. Either

- replace the env var with a `LAUNCH_AT` ISO timestamp (gate active while `Date.now() < launchAt`),
  or
- keep `UNDER_CONSTRUCTION` and add `LAUNCH_AT` as an additional auto-disable rule.

The `/under-construction` page itself should show a live countdown to the launch moment so editors
and testers see exactly when it lifts.

## Image lightbox

Every image on every public page should be clickable to open a full-screen modal viewer (with
close-on-Escape, close-on-backdrop, swipe/arrow-key navigation between images on the same page).

Touchpoints:

- Cover images: `OrganArticle` + `JournalArticle`
- In-body images: the `image` block in `OrganBody`'s portable-text renderer
- Card / list thumbnails: `OrganCard`, `JournalList`, `About`

Keep the implementation accessible (focus trap, `aria-label`, restore focus on close) and SSR-safe
(don't ship a heavyweight library client-only without weighing the bundle cost — a small hand-rolled
dialog is probably fine).
