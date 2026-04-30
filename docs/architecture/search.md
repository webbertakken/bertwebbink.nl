# Search

Site-wide visitor-facing search. Locale-aware, real-time after publish, zero new infrastructure.
Backed by Sanity (`sanityFetch` from `defineLive`) — no second index, no SaaS, no webhooks.

## Decisions

| Concern                | Decision                                                                                                                                                                                                                                                           |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Backend                | Sanity, via `sanityFetch`. No new service, no second index.                                                                                                                                                                                                        |
| Query mechanism        | GROQ `match` operator with `score()` boosting. Prefix matching via trailing `*`.                                                                                                                                                                                   |
| Freshness              | Inherited from `<SanityLive />` — search results update in real time when content publishes, no extra revalidation routes.                                                                                                                                         |
| Route                  | `/{locale}/search?q=...`. Server component, dynamic rendering. No `/api/search`.                                                                                                                                                                                   |
| Locale scope           | Document-level types use `language == $locale`. `score` is field-level i18n with no `language` field, so the filter is `(_type == "score" \|\| language == $locale)`. Score's localised fields read via `field[language == $locale][0].value` with Dutch fallback. |
| Searchable types       | `journal`, `organ`, `score`, `about`, `elsewhere`, `privacy`. Excluded: `journalPage`, `organsPage`, `scoresPage`, `settings` (UI chrome).                                                                                                                         |
| Result URLs            | next-intl typed `Href` objects, rendered via `<Link>` from `@/i18n/navigation`. next-intl resolves the per-locale URL automatically (`/de/blog/...`, `/ja/オルガン/...`).                                                                                          |
| Score URLs             | Score has no detail page — returns `{ pathname: '/scores', hash: 'ed-NN' }`. The `/scores` page renders `id="ed-NN"` anchors on each row.                                                                                                                          |
| Title for score        | Synthesised in GROQ as `composer + " — " + work` (matches Studio preview).                                                                                                                                                                                         |
| Snippet                | First ~200 chars of flattened body via `pt::text(...)[0...200]`. Score's snippet is `blurb[language == $locale][0].value` (plain string).                                                                                                                          |
| Stega                  | `stega: false` on the search query and on `generateMetadata` — slugs flowing into URL building must be clean.                                                                                                                                                      |
| Result limit           | Top 50 by score. No pagination — revisit if it ever matters.                                                                                                                                                                                                       |
| Min query length       | 2 characters. Below that: empty state, no Sanity request.                                                                                                                                                                                                          |
| Token sanitisation     | NFC-normalise → lowercase → strip punctuation → split on whitespace → append `*` to each token → join with space. `match` uses AND across tokens. NFC is critical for Devanagari/Arabic/Thai/CJK queries.                                                          |
| Search box placement   | Magnifying-glass icon in `Nav`, expanding inline on click. Submit navigates to `/{locale}/search?q=...`.                                                                                                                                                           |
| Highlighting           | Word-boundary `<mark>` wrap on matched tokens in title + snippet. HTML-escaped server-side.                                                                                                                                                                        |
| Robots                 | `robots: { index: false, follow: false }` — search result pages must never be indexed.                                                                                                                                                                             |
| Fuzzy / typo tolerance | Out of scope. GROQ `match` is prefix-only. Upgrade path documented under "Future".                                                                                                                                                                                 |
| i18n strings           | `messages/{locale}.json` under `Search.*`, `Metadata.search.*`, `Nav.openSearch`.                                                                                                                                                                                  |

## Architecture

```
app/[locale]/(site)/search/page.tsx        ← server component, reads ?q=, sanityFetch
app/components/landing/SearchBox.tsx       ← client component in <Nav>, expand-on-click input
app/components/search/SearchResults.tsx    ← renders list + empty/no-results states
app/components/search/highlight.ts         ← pure: wrap matched tokens in <mark>
core/search/sanitise.ts                    ← pure: input → groq-safe token string
core/search/url.ts                         ← pure: (result) → next-intl Href
sanity/lib/queries.ts                      ← `searchQuery` (defineQuery export)
messages/{locale}.json                     ← Search.*, Metadata.search.*, Nav.openSearch
app/components/landing/Nav.tsx             ← slots SearchBox next to LanguagePicker
app/components/landing/Scores.tsx          ← `id="ed-NN"` anchors on each row
```

## GROQ query (canonical shape)

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

## Gotchas

- **Field key is `language`, not `_key`** for `internationalizedArray*` values — this project's
  convention, mirrored in `scoresQuery`.
- **NFC normalisation is mandatory** before tokenising. The slug pipeline emits NFC; queries must
  too, or non-Latin scripts won't match.
- **Apostrophes are separators**, not strippable characters. `bach's` should tokenise as `bach*`
  (treated as a separator), not `bachs*` (no matches in the corpus). Sanitiser handles both ASCII
  `'` and curly `’`.
- **Stega must be off** on the search fetch. Slugs flowing through stega-encoded GROQ would carry
  zero-width characters into URL `href`s.
- **Score has no detail page.** Returning `{ pathname: '/scores', hash: 'ed-NN' }` requires the
  scores page to render anchor ids on each row (already implemented).

## Future / out of scope

Documented but not built:

- **Fuzzy / typo tolerance.** If analytics show meaningful zero-result queries that are typos, swap
  the GROQ `match` body in the route handler for an in-memory MiniSearch index built from the same
  projection. Frontend contract stays identical.
- **Search analytics.** A tiny POST endpoint logging `{ query, locale, resultCount }` (anonymised)
  would tell us whether fuzzy is worth adding.
- **Facets / filters.** Type filter, date range, location facets. Add only on real user need.
- **Typeahead.** A thin route handler returning JSON would reuse the GROQ query and sanitiser.
- **Disposition search.** Searching within `disposition.couplings[*].registers[*].stops[*].name`
  would be valuable for organ enthusiasts. Defer until v1 has shipped and we see real query patterns
  — adding it expands the GROQ surface significantly.
- **Studio-side improvements.** Sanity Studio already has its own search; out of scope.
