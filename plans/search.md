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
| Locale scope | Document-level types use `language == $locale`; `score` is field-level i18n with no `language` field, so the filter is `(_type == "score" || language == $locale)`. Score's localised fields (`forInstrument`, `edition`, `blurb`) read via `field[_key == $locale][0].value` with Dutch (`nl`) fallback per AGENTS.md. |
| Searchable types | `journal`, `organ`, `score`, `about`, `elsewhere`, `privacy`. **Excluded:** `journalPage`, `organsPage`, `scoresPage`, `settings` (UI chrome, no human content). |
| Result shape | `{ _id, _type, title, slug, snippet, _score }`. URL building stays in TS (`core/search/url.ts`) for testability. |
| Result URLs | `journal/{slug}`, `organs/{slug}`, `about`, `elsewhere`, `privacy` use `/{locale}/{path}`. Score has **no detail page** — link is `/{locale}/scores#ed-{editionNumber}`; the scores page adds matching ids on each row. |
| Title for score | Synthesised in GROQ as `composer + " — " + work` (matches the Studio preview). All other types use their own `title`. |
| Snippet | First ~200 chars of flattened body (`pt::text(...)[0...200]`). Score's snippet is `blurb[_key == $locale][0].value` (no `pt::text` — `internationalizedArrayText.value` is a plain string). Matched terms wrapped in `<mark>` client-side. |
| Stega | Search query fetched with `stega: false` (results are not a Visual Editing target; slugs must be stega-clean for URLs). `generateMetadata` also uses `stega: false`. |
| Result limit | Top 50 by score, no pagination (revisit if it ever matters). |
| Min query length | 2 characters. Below that, render the empty state, don't hit Sanity. |
| Token sanitisation | Lowercase, strip punctuation, split on whitespace, append `*` to each token, join with space. `match` uses AND across tokens. |
| Empty / no-results states | Distinct copy per state, translated via existing `next-intl` pipeline. |
| Search box placement | **Magnifying-glass icon in `Nav`**, expanding inline to an input on click. Submitting navigates to `/{locale}/search?q=...`. Rationale: discoverable, matches the site's restrained aesthetic, no command-palette weirdness. |
| Highlighting | Yes, simple word-boundary `<mark>` wrap on the matched tokens in title + snippet. No fancy ranking display. |
| Fuzzy / typo tolerance | **Out of scope.** GROQ `match` is prefix-only. Upgrade path (MiniSearch / Algolia) documented under "Future" — defer until search analytics show it actually matters. |
| i18n | Strings in `messages/{locale}.json` under a `search.*` namespace. English authored, other 10 locales seeded by the existing translations pipeline. |

## Open questions

None blocking — all design decisions above are defaults that can be challenged in review. Flag
during implementation if any of the following surface:

- Query latency at the Live Content API for cross-type unions on the free tier — measure during
  task 4 and revisit limits if needed.
- Score result anchor links require the `/scores` page to render `id="ed-{editionNumber}"` on each
  row. If that's not already there, add it as part of task 6 (small, local change to the existing
  scores list).

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
messages/en.json                            ← add search.* namespace; pipeline propagates
```

### Query shape (sketch)

```groq
*[
  _type in ["journal", "organ", "score", "about", "elsewhere", "privacy"] &&
  (_type == "score" || language == $locale) &&
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
    forInstrument[_key == $locale][0].value match $q ||
    edition[_key == $locale][0].value match $q ||
    blurb[_key == $locale][0].value match $q
  )
]
| score(
    boost(title match $q, 5),
    boost(work match $q, 5),
    boost(composer match $q, 4),
    boost(excerpt match $q, 2),
    boost(blurb[_key == $locale][0].value match $q, 2)
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
    coalesce(blurb[_key == $locale][0].value, blurb[_key == "nl"][0].value)
  )
}
```

Fetched via `sanityFetch({ query, params, stega: false })`. URL construction stays in TypeScript
(`core/search/url.ts`) — easier to test and keeps the GROQ projection simple.

## Tasks

TDD throughout: write the failing test, make it pass, tick the box, move on.

### 1. Token sanitiser (pure function)

- [ ] **1.1** Write `core/search/sanitise.spec.ts` covering: empty string → `null`; single token →
      `"bach*"`; multi-token → `"bach* symphony*"`; punctuation strip → `"bach's & co."` →
      `"bachs* co*"`; case-fold to lowercase; min-length 2 short-circuits to `null`; whitespace-only
      input → `null`; CJK input passes through unchanged (per-char tokens, each with `*`); unicode
      apostrophes (`’`) handled like ASCII.
- [ ] **1.2** Implement `sanitiseQuery(input: string): string | null` in `core/search/sanitise.ts`
      until tests pass.

### 2. Result URL builder (pure function)

- [ ] **2.1** Write `core/search/url.spec.ts` covering: `journal` → `/{locale}/journal/{slug}`;
      `organ` → `/{locale}/organs/{slug}`; `score` → `/{locale}/scores#ed-{editionNumber}` (zero-
      padded to 2 digits to match existing UI convention); singletons (`about`, `elsewhere`,
      `privacy`) → `/{locale}/{type}`; missing slug on `journal`/`organ` → returns `null` (caller
      filters out); missing `editionNumber` on `score` → falls back to `/{locale}/scores`; unknown
      `_type` → returns `null`.
- [ ] **2.2** Implement `searchResultUrl(result, locale)` in `core/search/url.ts`.

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
- [ ] **5.3** Set page metadata via `generateMetadata` using `sanityFetch({ ..., stega: false })`
      if any Sanity-backed strings are used (otherwise plain next-intl). Title is locale-translated
      `Search` + query echo; `robots: { index: false, follow: false }` — search results pages
      must never be indexed.
- [ ] **5.4** Verify `<SanityLive />` is mounted in `app/layout.tsx` (it is — line 110). One-line
      check, no setup needed.

### 6. Search results component

- [ ] **6.1** Create `app/components/search/SearchResults.tsx` (server component, no client JS
      needed). Renders one `<li>` per result with: type badge (translated), highlighted title,
      highlighted snippet, anchor to the URL from `searchResultUrl`. Filter out any result where
      `searchResultUrl` returns `null` (defensive — drafts or malformed docs).
- [ ] **6.2** Add `id="ed-{editionNumber}"` (zero-padded to 2 digits) to each row in the existing
      scores list page if not already present. Required for `score` result anchors to actually
      land on the right entry. Audit `app/[locale]/(site)/scores/page.tsx` (and its row component)
      first; only change if missing.
- [ ] **6.3** Empty state copy: "Try a search" (translated). No-results copy: "No matches for
      'xyz'" with the query echoed (HTML-escaped). Translations follow next-intl conventions.

### 7. Search box in Nav

- [ ] **7.1** Create `app/components/landing/SearchBox.tsx` as a small client component:
      magnifying-glass button → click expands inline input → submit navigates to
      `/{locale}/search?q=...` via the next-intl-aware router. Press `Esc` to close, `/` shortcut
      to focus (optional, skip if it complicates the component).
- [ ] **7.2** Slot into `Nav.tsx` near the existing language picker (right side). Match existing
      typography and spacing.
- [ ] **7.3** Accessibility: `<form role="search">`, label translated, button has `aria-label`,
      icon is `aria-hidden`, focus-visible style matches site convention.

### 8. i18n strings

- [ ] **8.1** Add `search.*` namespace to `messages/en.json`: `placeholder`, `submit`, `pageTitle`,
      `empty`, `noResultsFor`, `typeLabels.journal`, `typeLabels.organ`, `typeLabels.score`,
      `typeLabels.about`, `typeLabels.elsewhere`, `typeLabels.privacy`.
- [ ] **8.2** Run the existing translations pipeline to seed the other 10 locales. Verify nl/de/ja
      look reasonable; manual edit if a string reads oddly.

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
