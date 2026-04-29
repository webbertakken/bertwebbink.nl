# Search

Site-wide search for bertwebbink.nl. Visitor-facing, locale-aware, immediate-after-publish, zero
new infrastructure.

## Why

The journal will grow over time, and visitors need a way to find an organ, a journal entry, or a
score by a keyword that isn't covered by the curated index pages. Browsing IA covers most cases;
search covers the long tail.

## Decisions (locked)

| Concern | Decision |
|---|---|
| Backend | Sanity, via the existing `sanityFetch` (`defineLive`). No new service, no second index. |
| Query mechanism | GROQ `match` operator with `score()` boosting. Prefix matching via trailing `*`. |
| Freshness | Inherited from existing `<SanityLive />` — search results update in real time when content is published, no webhooks, no revalidation routes. |
| Route | `/{locale}/search?q=...`. Server component, dynamic rendering. No `/api/search` route. |
| Locale scope | Document-level types use `language == $locale`; `score` is field-level i18n with no `language` field, so the filter is `(_type == "score" || language == $locale)`. Score's localised fields (`forInstrument`, `edition`, `blurb`) read via `field[language == $locale][0].value` with Dutch (`nl`) fallback. **Note:** field key is `language`, not `_key` — this project's convention, mirrored in `scoresQuery`. |
| Slug filter | Add `defined(slug.current)` for `journal` and `organ` (mirrors all existing list queries). Singletons resolve by `_id`, score has no slug — no slug filter needed for those. |
| Searchable types | `journal`, `organ`, `score`, `about`, `elsewhere`, `privacy`. **Excluded:** `journalPage`, `organsPage`, `scoresPage`, `settings` (UI chrome, no human content). |
| Result shape | `{ _id, _type, title, slug, snippet, _score }`. URL building stays in TS (`core/search/url.ts`) for testability. |
| Result URLs | Returned as **next-intl typed `Href` objects** — `{ pathname: '/journal/[slug]', params: { slug } }` etc. Rendered via `<Link>` from `@/i18n/navigation` so next-intl resolves to the per-locale URL automatically (`/de/blog/...`, `/ja/オルガン/...`). Score has **no detail page** — returns `{ pathname: '/scores', hash: 'ed-01' }`. Singletons (`about`, `elsewhere`, `privacy`) use their respective pathnames. **Same builder shape works pre- and post-localised-pathnames merge.** |
| Title for score | Synthesised in GROQ as `composer + " — " + work` (matches the Studio preview). All other types use their own `title`. |
| Snippet | First ~200 chars of flattened body (`pt::text(...)[0...200]`). Score's snippet is `blurb[_key == $locale][0].value` (no `pt::text` — `internationalizedArrayText.value` is a plain string). Matched terms wrapped in `<mark>` client-side. |
| Stega | Search query fetched with `stega: false` (results are not a Visual Editing target; slugs must be stega-clean for URLs). `generateMetadata` also uses `stega: false`. |
| Result limit | Top 50 by score, no pagination (revisit if it ever matters). |
| Min query length | 2 characters. Below that, render the empty state, don't hit Sanity. |
| Token sanitisation | NFC-normalise (matches the project's slug normalisation), lowercase, strip punctuation, split on whitespace, append `*` to each token, join with space. `match` uses AND across tokens. NFC matters for Devanagari/Arabic/Thai/CJK queries to align with stored content. |
| Empty / no-results states | Distinct copy per state, translated via existing `next-intl` pipeline. |
| Search box placement | **Magnifying-glass icon in `Nav`**, expanding inline to an input on click. Submitting navigates to `/{locale}/search?q=...`. Rationale: discoverable, matches the site's restrained aesthetic, no command-palette weirdness. |
| Highlighting | Yes, simple word-boundary `<mark>` wrap on the matched tokens in title + snippet. No fancy ranking display. |
| Fuzzy / typo tolerance | **Out of scope.** GROQ `match` is prefix-only. Upgrade path (MiniSearch / Algolia) documented under "Future" — defer until search analytics show it actually matters. |
| i18n | Strings in `messages/{locale}.json` under PascalCase namespaces: `Search.*` (page UI), `Metadata.search.{title,description}` (matches existing Metadata convention), `Nav.openSearch` (aria-label for the icon button). English authored, other 10 locales seeded by `yarn translate:ui`. |

## Open questions

None blocking — all design decisions above are defaults that can be challenged in review. Flag
during implementation if any of the following surface:

- Query latency at the Live Content API for cross-type unions on the free tier — measure during
  task 4 and revisit limits if needed.
- Score result anchor links require the `/scores` page to render `id="ed-{editionNumber}"` on each
  row. Audit confirms missing in `app/components/landing/Scores.tsx` (task 6.2).

## Cross-branch coordination

This plan was rebased on `origin/main` after the translations + slug-translation work landed.
`feat/translate-disposition` is in-flight with two commits relevant to this plan:

- **Localised pathnames** (`a216bd6`) — introduces per-locale URL segments via
  `i18n/routing.ts` + `i18n/pathnames.json`. The plan's URL builder uses next-intl typed `Href`
  objects so it works **both before and after** that branch merges. Once it merges, add a
  `/search` entry to `i18n/routing.ts` and `i18n/pathnames.json` (task 5.5) so the search route
  itself is locale-translatable.
- **Disposition translation** (`4630c6a`) — register names + stop notes translate in place
  per-locale; organ doc-level i18n already covers it. **No search query change needed.**
  Searching within `disposition.couplings[*].registers[*]` is parked under "Future / out of
  scope" — organ enthusiasts may want to find specific stops, but it's not v1.

## Architecture

```
app/[locale]/(site)/search/page.tsx        ← server component, reads ?q=, calls sanityFetch
app/components/landing/SearchBox.tsx        ← client component in <Nav>, expand-on-click input
app/components/search/SearchResults.tsx     ← renders list + empty/no-results states
app/components/search/highlight.ts          ← pure: wrap matched tokens in <mark>
app/components/search/highlight.spec.ts
core/search/sanitise.ts                     ← pure: input → groq-safe token string
core/search/sanitise.spec.ts
core/search/url.ts                          ← pure: (result, locale) → href
core/search/url.spec.ts
sanity/lib/queries.ts                       ← add `searchQuery` defineQuery export
messages/en.json                            ← add Search.*, Metadata.search.*, Nav.openSearch
app/components/landing/Nav.tsx              ← slot SearchBox next to LanguagePicker
app/components/landing/Scores.tsx           ← add id="ed-{NN}" anchors to score rows
```

### Query shape (sketch)

```groq
*[
  _type in ["journal", "organ", "score", "about", "elsewhere", "privacy"] &&
  (
    (_type == "score") ||
    (_type in ["about", "elsewhere", "privacy"] && language == $locale) ||
    (_type in ["journal", "organ"] && language == $locale && defined(slug.current))
  ) &&
  (
    title match $q ||
    pt::text(content) match $q ||
    pt::text(letter) match $q ||
    pt::text(intro) match $q ||
    excerpt match $q ||
    work match $q ||
    composer match $q ||
    catalog match $q ||
    builder match $q ||
    location.city match $q ||
    location.country match $q ||
    location.building match $q ||
    forInstrument[language == $locale][0].value match $q ||
    edition[language == $locale][0].value match $q ||
    blurb[language == $locale][0].value match $q
  )
]
| score(
    boost(title match $q, 5),
    boost(work match $q, 5),
    boost(composer match $q, 4),
    boost(excerpt match $q, 2),
    boost(blurb[language == $locale][0].value match $q, 2)
  )
| order(_score desc, _updatedAt desc)
[0...50]
{
  _id, _type, _score,
  "title": select(
    _type == "score" => composer + " — " + work,
    coalesce(title, "Untitled")
  ),
  "slug": slug.current,
  "editionNumber": editionNumber,
  "snippet": coalesce(
    pt::text(content)[0...200],
    pt::text(letter)[0...200],
    pt::text(intro)[0...200],
    excerpt,
    coalesce(blurb[language == $locale][0].value, blurb[language == "nl"][0].value)
  )
}
```

Fetched via `sanityFetch({ query, params, stega: false })`. URL construction stays in TypeScript
(`core/search/url.ts`) — easier to test and keeps the GROQ projection simple.

## Tasks

TDD throughout: write the failing test, make it pass, tick the box, move on.

### 1. Token sanitiser (pure function)

- [x] **1.1** Write `core/search/sanitise.spec.ts` covering:
      - empty string → `null`
      - single token → `"bach*"`
      - multi-token → `"bach* symphony*"`
      - punctuation strip → `"bach's & co."` → `"bachs* co*"`
      - case-fold to lowercase
      - min-length 2 short-circuits to `null` (a single `"a"` returns null)
      - whitespace-only input → `null`
      - CJK input passes through (per-char tokens, each with `*`)
      - unicode apostrophes (`’`) handled like ASCII
      - **NFC normalisation**: NFD-input (e.g. `é` decomposed) is NFC-folded (é) before
        tokenising. Mirrors the project's slug normalisation (`fix(slug): emit NFC` lesson).
- [x] **1.2** Implement `sanitiseQuery(input: string): string | null` in `core/search/sanitise.ts`
      until tests pass. Use `String.prototype.normalize('NFC')` for the normalisation step.

### 2. Result URL builder (pure function)

Returns a next-intl typed `Href` object (or `null`), not a string. The result is rendered via
`<Link>` from `@/i18n/navigation` which handles locale-prefix and per-locale path translation
automatically. Pattern matches existing components (`JournalList.tsx`, `OrganCard.tsx`).

- [ ] **2.1** Write `core/search/url.spec.ts` covering:
      - `journal` with slug → `{ pathname: '/journal/[slug]', params: { slug } }`
      - `organ` with slug → `{ pathname: '/organs/[slug]', params: { slug } }`
      - `score` with editionNumber → `{ pathname: '/scores', hash: 'ed-01' }` (zero-padded to 2)
      - `score` without editionNumber → `{ pathname: '/scores' }` (no hash)
      - singletons `about`/`elsewhere`/`privacy` → `{ pathname: '/about' }` etc.
      - `journal`/`organ` missing slug → returns `null` (caller filters out)
      - unknown `_type` → returns `null`
      - **No `locale` parameter** — next-intl `<Link>` handles locale at render time.
- [ ] **2.2** Implement `searchResultHref(result)` in `core/search/url.ts`. Type the return as
      next-intl's `Href` (import from `next-intl/routing` or use the inferred type from
      `@/i18n/routing`). Functions stays pure — no React, no next-intl runtime hooks.

### 3. Highlight wrapper (pure function)

- [ ] **3.1** Write `app/components/search/highlight.spec.ts` covering: single token highlights
      whole-word and prefix occurrences; multiple tokens; case-insensitive match; preserves
      surrounding text; HTML-escapes input (no XSS); no tokens → returns text unchanged; CJK input
      where each char is a "token" still wraps correctly; returns React fragments, not raw HTML
      strings.
- [ ] **3.2** Implement `highlight(text, tokens)` in `app/components/search/highlight.ts`.

### 4. Search query

- [ ] **4.1** Add `searchQuery` to `sanity/lib/queries.ts` per the architecture sketch above. Wrap
      in `defineQuery` for TypeGen. Use a unique name (`searchQuery`) — TypeGen silently
      overwrites duplicates (per `typegen.md`).
- [ ] **4.2** TypeGen runs via the project's `predev` / `prebuild` hooks (`yarn extract-types &&
      yarn typegen`). Run `yarn typegen` once after adding the query to confirm
      `SearchQueryResult` lands in `sanity.types.ts` cleanly.
- [ ] **4.3** Smoke-test the query against the dev dataset with three queries (single-word Latin,
      multi-word, CJK substring) using Sanity Vision or a quick scratch script. Verify the score
      branch returns results (i.e. confirm the `(_type == "score" || language == $locale)` filter
      actually includes scores).

### 5. Search page

- [ ] **5.1** Create `app/[locale]/(site)/search/page.tsx` as a server component. Reads `q` from
      `searchParams`, sanitises via `sanitiseQuery`, calls `sanityFetch({ query: searchQuery,
      params: { locale, q }, stega: false })`. The `stega: false` is required so slugs flowing
      into URL building are clean.
- [ ] **5.2** Render via `<SearchResults>`: distinct empty (`q` missing/below min), no-results
      (`q` valid, zero hits), and results-list states.
- [ ] **5.3** Set page metadata via `generateMetadata` using next-intl `getTranslations` (no
      Sanity strings needed). Title is `Metadata.search.title` + query echo;
      `robots: { index: false, follow: false }` — search results pages must never be indexed.
- [ ] **5.4** Verify `<SanityLive />` is mounted in `app/layout.tsx` (it is — line 110). One-line
      check, no setup needed.
- [ ] **5.5** **Conditional on `feat/translate-disposition` having merged**: add `/search` to
      `i18n/routing.ts` `pathnames` and `i18n/pathnames.json`. Use locale-translated segments
      (e.g. `/de/suche`, `/ja/検索`). Either run `yarn translate:pathnames` or hand-author the 11
      strings (small enough). If localised pathnames haven't merged yet, `/search` works as a
      literal route in every locale and this task is deferred to a follow-up.

### 6. Search results component

- [ ] **6.1** Create `app/components/search/SearchResults.tsx` (server component, no client JS
      needed). Renders one `<li>` per result with: type badge (translated), highlighted title,
      highlighted snippet, **`<Link>` from `@/i18n/navigation`** with the typed `Href` from
      `searchResultHref(result)`. Filter out any result where `searchResultHref` returns `null`
      (defensive — drafts or malformed docs).
- [ ] **6.2** Add `id="ed-{editionNumber}"` (zero-padded to 2 digits) to each score row in
      `app/components/landing/Scores.tsx`. **Audit confirmed missing as of plan rebase — must be
      added.** The component renders `<ScoreCard>` items; the anchor id goes on the outermost
      element of each card (audit the `ScoreCard` and `Featured` sub-components on lines ~140
      onwards). Smooth-scroll behaviour from `:target` is fine — no JS needed.
- [ ] **6.3** Empty state copy: "Try a search" (translated). No-results copy: "No matches for
      'xyz'" with the query echoed (HTML-escaped). Translations follow next-intl conventions.

### 7. Search box in Nav

- [ ] **7.1** Create `app/components/landing/SearchBox.tsx` as a small client component:
      magnifying-glass button → click expands inline input → submit navigates to
      `/{locale}/search?q=...` via the next-intl-aware router. Press `Esc` to close. `/` shortcut
      to focus is **out of scope** — keeps the component simpler, can add later.
- [ ] **7.2** Slot into `Nav.tsx` adjacent to `LanguagePicker`: desktop at lines 106-107
      (`<div className="hidden md:block">` block), mobile inside the drawer near line 168
      (`<div className="border-t border-rule-soft px-3 py-3">`). Match the same visibility
      breakpoint pattern (`hidden md:block` for desktop, in-drawer for mobile).
- [ ] **7.3** Accessibility: `<form role="search">`, input has translated `aria-label` (or visible
      label), icon button has `aria-label={t('Nav.openSearch')}`, icon is `aria-hidden`,
      focus-visible style matches site convention (`focus-visible:outline-accent` or whatever the
      project uses — grep for existing usage in `LanguagePicker`).

### 8. i18n strings

- [ ] **8.1** Add to `messages/en.json` (PascalCase namespaces, matching project convention):
      - `Search.heading` — page heading
      - `Search.placeholder` — input placeholder
      - `Search.submit` — submit button text/aria
      - `Search.empty` — "Type to search" before any query
      - `Search.noResultsFor` — ICU string with `{query}` variable
      - `Search.typeLabels.journal|organ|score|about|elsewhere|privacy` — result type badges
      - `Metadata.search.title` and `Metadata.search.description` — page `<head>` strings
      - `Nav.openSearch` — aria-label for the magnifying-glass button
- [ ] **8.2** Run `yarn translate:ui` to seed the other 10 locales (per the existing translations
      pipeline). Verify nl/de/ja look reasonable; manual edit if a string reads oddly. The `.last-
      seen-en.json` file will pick up the new keys automatically.

### 9. Visual + manual verification (do not skip)

- [ ] **9.1** Run dev server. Type a query in two locales (`/nl/search?q=bach`, `/en/search?q=bach`)
      and confirm results differ correctly per locale.
- [ ] **9.2** With a search page open in the browser (results already shown), publish a new
      `journal` entry whose title contains the current query. Confirm it appears **without page
      reload** — proves Live Content API integration works for `/search` too.
- [ ] **9.3** Confirm `score` results show up: search for a composer name that exists only in a
      score (e.g. `Buxtehude` if no journal/organ mentions them). Click the result link → verifies
      the anchor lands on the right row.
- [ ] **9.4** Test queries with: punctuation (`Bach's`), curly apostrophes, multiple words
      (`organ symphony`), CJK input (`バッハ` if a `ja` doc with that text exists), zero results
      (`zzzzzz`), single-char (must short-circuit, no Sanity request).
- [ ] **9.5** View page source on `/{locale}/search?q=bach` and confirm no Stega invisible chars
      leaked into result anchor `href`s (a quick `grep -P '[\u0080-\u009F]'` on the rendered HTML).
- [ ] **9.6** Verify `<head>` has `noindex, nofollow` on the search page in production build.
- [ ] **9.7** Lighthouse / quick a11y check on the search page and the expanded search box.

### 10. Quality gates and PR

- [ ] **10.1** Run `/quality-checks` (oxlint, tsgo/tsc, vitest). All green.
- [ ] **10.2** Open a PR. Link this plan in the description. Bullet-point summary of what the
      PR adds; explicitly note "no new infrastructure / no new dependencies."

## Verification (Done means)

- Visiting `/{locale}/search?q=...` returns locale-correct results from Sanity, ordered by score.
- Publishing a doc updates the open search page in real time without a reload.
- All 11 locales have translated UI strings for search.
- No new runtime dependencies added (no MiniSearch, no Fuse, no Algolia client).
- `oxlint`, `tsc`, `vitest` all pass.

## Out of scope / future upgrades

Document but do not build:

- **Fuzzy / typo tolerance.** If search analytics later show meaningful zero-result queries that
  are typos, swap the GROQ `match` body in the route handler for an in-memory MiniSearch index
  built from the same projection. Frontend contract stays identical.
- **Search analytics.** A tiny POST endpoint that logs `{ query, locale, resultCount }`
  (anonymised) would tell us whether fuzzy is worth adding. Not now.
- **Facets / filters.** Type filter, date range, location facets. Add only if a real user need
  surfaces.
- **Typeahead.** Currently submit-on-Enter. If we later want a dropdown of live results as the
  user types, add a thin route handler returning JSON; the GROQ query and sanitiser are reused.
- **Studio-side improvements for editors.** Sanity Studio already has its own search; out of
  scope for this plan.
- **Disposition search.** Searching within `disposition.couplings[*].registers[*].stops[*].name`
  (e.g. "Bordun", "Vox Celeste") would be valuable for organ enthusiasts. Defer until v1 has
  shipped and we see real query patterns. Adding it expands the GROQ query surface
  significantly — the simplicity rule wins for now.
