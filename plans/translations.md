# Translations

End‑to‑end plan for shipping multilingual content + UI on bertwebbink.nl.

## Goals

- Editors author Sanity content in **Dutch**; one button translates to the other 10 locales.
- Translations are **manually editable** post‑translation and **incrementally updated** when the Dutch source changes (LLM reasons over old source + old translation + new source).
- The hardcoded UI is authored in **English**; same pipeline seeds the other 10 locales.
- Visitors land in their detected locale, can switch via a top‑right picker (endonyms, no flags), and URLs are prefixed (`/{locale}/...`).
- No Sanity AI Assist, no SaaS translation services. Provider is pluggable; default is Google Gemini.

## Decisions (locked)

| Concern | Decision |
|---|---|
| Content source language | Dutch (`nl`) |
| UI / code / design source language | English (`en`) |
| Locales (11) | `nl`, `en`, `de`, `fr`, `es`, `it`, `pt`, `hi`, `ja`, `zh`, `ko` |
| URL strategy | Prefix every route with locale: `/{locale}/...` |
| Sanity model | Document‑per‑locale via `@sanity/document-internationalization` for `journal`, `organ`, and all singletons. **Field‑level** via `sanity-plugin-internationalized-array` for `score` only (catalog entry, locale‑independent PDF + 4 short translatable fields) |
| Locale list | Code constant in `core/i18n/locales.ts` (single source of truth; plugin's `supportedLanguages` derived from it) |
| Singleton id pattern | Symmetric `{type}-{locale}` for every locale, e.g. `about-nl`, `about-en`, …, `homePage-en`. No "default without suffix" exception. |
| Translation engine | LLM (not conventional MT) |
| Default provider | **Google — Gemini 2.5 Pro** |
| Pluggability | `Translator` interface + `GeminiTranslator` (default) + `AnthropicTranslator` + `OpenAITranslator` implementations, picked by `TRANSLATOR_PROVIDER` env |
| UI strings library | `next-intl` |
| Stale handling | (a) visual indicator in studio + (b) action always re‑runs all locales diff‑aware on press |
| UI strings authoring | Hand‑authored `messages/en.json`, seeded to other 10 via the same pipeline, human‑editable per locale |
| Translate button | Document Action in studio's three‑dot menu |
| Plugin extraction | **Deferred** — build internal first under `sanity/plugins/translate/`, extract later |
| `@sanity/assist` | **Remove** as part of this work |

## Cost

Google Gemini API by default. Gemini 2.5 Pro at $1.25/M in, $10/M out. Comparable rates per provider:

| Provider | Default model | Input ($/M tok) | Output ($/M tok) | Notes |
|---|---|---|---|---|
| Google (default) | Gemini 2.5 Pro | $1.25 | $10 | Strong JA/ZH/KO; free dev tier on AI Studio |
| Google | Gemini 2.5 Flash | $0.075 | $0.30 | Per‑locale override target if cost matters |
| Anthropic | Claude Sonnet 4.5 | $3 | $15 | Best at structured PT round‑trip |
| OpenAI | GPT‑4o | $2.50 | $10 | |

Figures below assume Gemini 2.5 Pro; ~6× cheaper than Sonnet 4.5, or ~30× cheaper if you switch to Gemini Flash.

- Full translation of one ~1.5k‑word post → all 10 target locales: **~$0.45**
- Incremental update (10–20% changed): **~$0.05–0.10**
- One‑time UI strings seed (~200 strings): **~$0.45**
- Annual estimate (50 posts, retranslated 2× /yr): **~$45/year**

Per‑locale model override (e.g. switch JA/ZH/KO to Haiku) lives in the config map; not used initially.

## High‑level architecture

```
                        ┌─────────────────────────────┐
                        │  Sanity Studio (/admin)     │
                        │                             │
                        │  Document Action            │
                        │  "Translate to all locales" │
                        └────────────┬────────────────┘
                                     │ POST { docId, targetLocales }
                                     ▼
                ┌────────────────────────────────────────┐
                │  /api/translate (Next.js route)        │
                │                                        │
                │  1. Verify Sanity session token         │
                │  2. Fetch source doc (NL) via client   │
                │  3. Fetch existing translations        │
                │  4. Walk Portable Text → JSON skeleton │
                │  5. Translator.translate() per locale  │
                │  6. Merge back into PT, set sourceRev  │
                │  7. Write/update sibling docs          │
                └────────────┬───────────────────────────┘
                             │
                             ▼
                ┌────────────────────────────┐         ┌──────────────────────┐
                │  Translator (interface)    │ ──────▶ │ GeminiTranslator     │  default
                │                            │         │ AnthropicTranslator  │
                │                            │         │ OpenAITranslator     │
                └────────────────────────────┘         └──────────────────────┘

Front of site:
                middleware.ts ──▶ under-construction gate ──▶ next-intl locale resolver
                                                                    │
                                                                    ▼
                                                  app/[locale]/(site)/...  
                                                                    │
                                                  GROQ filtered by language==$locale
```

---

## Track A — Sanity content translations

### A1. Install + base config

- [ ] `yarn add @sanity/document-internationalization`
- [ ] `yarn add sanity-plugin-internationalized-array` (used by `score` only — see A2.2)
- [ ] `yarn remove @sanity/assist`
- [ ] Remove `assist` import + plugin registration from `sanity.config.ts`
- [ ] Add `documentInternationalization({ supportedLanguages, schemaTypes })` to `plugins` in `sanity.config.ts`. `schemaTypes` lists every doc/singleton **except** `score`.
- [ ] Add `internationalizedArray({ languages, fieldTypes: ['string', 'text'] })` to `plugins` for `score`'s field‑level fields. `languages` derives from the same `LOCALES` constant.
- [ ] Define shared `LOCALES` constant in `core/i18n/locales.ts` (single source of truth for `documentInternationalization`, `internationalizedArray`, `next-intl` routing, and the language picker; **no `locale` document type in Sanity**, per skill note below):
  ```ts
  export const LOCALES = ['nl','en','de','fr','es','it','pt','hi','ja','zh','ko'] as const
  export const DEFAULT_LOCALE = 'nl' // content source
  export const UI_DEFAULT_LOCALE = 'en' // UI source
  export const LOCALE_ENDONYMS: Record<Locale, string> = {
    nl: 'Nederlands', en: 'English', de: 'Deutsch', fr: 'Français',
    es: 'Español',   it: 'Italiano', pt: 'Português', hi: 'हिन्दी',
    ja: '日本語',     zh: '中文',     ko: '한국어',
  }
  ```

### A2. Schema migrations

`@sanity/document-internationalization` adds a `language` field per type and links siblings via a `translation.metadata` document. Use document‑per‑locale for every translatable type **except `score`**; see A2.2 for the field‑level exception.

Document‑per‑locale types (registered with `documentInternationalization`):

- [ ] `journal` (document)
- [ ] `organ` (document)
- [ ] `journalPage` (singleton — see A2.1)
- [ ] `organsPage` (singleton)
- [ ] `scoresPage` (singleton)
- [ ] `about` (singleton)
- [ ] `elsewhere` (singleton)
- [ ] `privacy` (singleton)
- [ ] `settings` (singleton — only translatable fields: `title`, `description`, `wordmark`, `tagline`, `scoresNoticeBody`, `scoresEditionLine`)

Field‑level types (A2.2): `score` only.

Per document‑per‑locale type:

- [ ] Register with `documentInternationalization` in `sanity.config.ts`
- [ ] Add the plugin‑required `language` field to the schema (`type: 'string', readOnly: true, hidden: true`) per `localization.md` skill
- [ ] Add an Initial Value Template per locale via `templates: (prev) => [...]` (skill §5) so "New document" creates correctly‑languaged docs
- [ ] Update Studio structure (`sanity/structure/index.ts`) to group documents by translation rather than show 11× duplicates in the list

#### A2.1 Singletons

Singleton id pattern: **`{type}-{locale}`** for every locale, no exception. E.g. `about-nl`, `about-en`, `about-de`, …, `homePage-en`. This matches the symmetric pattern in `localization.md` skill §6 and is the cleanest fit for the locale‑aware Presentation resolvers.

- [ ] Helper: `createLocalizedSingleton(S, type, title, icon?)` (copy verbatim from skill §6 "Structure: Localized Singleton Helper") in `sanity/structure/index.ts`
- [ ] Apply helper to: `journalPage`, `organsPage`, `scoresPage`, `about`, `elsewhere`, `privacy`, `settings`
- [ ] Filter the seven singleton types out of the default `documentTypeListItems()` so they only appear under the localized helper
- [ ] Add per‑locale Initial Value Templates (one per `(singleton, locale)` pair) so the "New document" menu seeds the correct language
- [ ] Update Presentation `mainDocuments` resolver in `sanity.config.ts` to match locale‑prefixed routes (`/{locale}/`, `/{locale}/organs`, …), filtering by `_id == "{type}-" + $locale`
- [ ] Tests: helper emits one structure node per locale; GROQ `*[_id == $type + "-" + $locale][0]` resolves correctly for each singleton

#### A2.2 Field‑level for `score`

`score` is a catalog entry: a PDF + locale‑independent metadata (composer, year, edition number, pages, catalog ref) plus a small set of translatable fields. Per `localization.md` skill §4 ("structured" content → field‑level) and §7, this is field‑level via `sanity-plugin-internationalized-array`.

Field split:

| Field | Localised? | Type |
|---|---|---|
| `composer` | No (proper noun) | `string` |
| `work` | No by default (kept in original; see Q11) | `string` |
| `catalog` | No | `string` |
| `year` | No | `number` |
| `pages` | No | `number` |
| `editionNumber` | No | `number` |
| `pdfFile` | No | `file` |
| `isFeatured` | No | `boolean` |
| `era` | **Yes** | `internationalizedArrayString` |
| `forInstrument` | **Yes** | `internationalizedArrayString` |
| `edition` | **Yes** | `internationalizedArrayString` |
| `blurb` | **Yes** | `internationalizedArrayText` |

- [ ] Update `sanity/schemaTypes/documents/score.ts` to use `internationalizedArrayString` / `internationalizedArrayText` for the four localised fields
- [ ] Configure plugin: `internationalizedArray({ languages: () => LOCALES.map(...), fieldTypes: ['string', 'text'] })`
- [ ] Add `@sanity/language-filter` to hide non‑active locale tabs in the score editor (skill §9; only useful in field‑level mode)
- [ ] Tests: GROQ `coalesce(blurb[_key == $locale][0].value, blurb[_key == "nl"][0].value)` resolves for each locale

##### Note on the locale list

The `localization.md` skill §3 recommends a `locale` document type in Sanity. We deliberately **do not** follow that for this site — our 11 locales are fixed, the skill’s value (editors adding locales without a deploy) doesn’t apply, and a code constant gives us build‑time type safety + a single source of truth. Both Sanity plugins (`documentInternationalization`, `internationalizedArray`) take a `supportedLanguages` / `languages` callback, which we wire to derive from the same `LOCALES` constant. Honouring the skill’s underlying principle (no duplicated source of truth) without paying for the runtime indirection.

### A3. Data migration

All existing documents are currently un‑languaged Dutch.

- [ ] Write `scripts/migrate-add-language.ts`:
  - Connects with `SANITY_API_WRITE_TOKEN`
  - For document‑per‑locale types (`journal`, `organ`, all singletons): patches each doc with `language: 'nl'`
  - For singletons specifically: also renames `_id` from the legacy id (e.g. `siteAbout`, `siteJournalPage`, `siteSettings`) to the symmetric `{type}-nl` pattern (e.g. `about-nl`, `journalPage-nl`, `settings-nl`). Use a transactional create‑new + delete‑old + patch‑references sequence; never lose data mid‑rename
  - For `score` (field‑level): converts each flat field (`era`, `forInstrument`, `edition`, `blurb`) into an internationalised array with one entry `{ _key: 'nl', value: <existing flat value> }`
  - Idempotent (skips docs already migrated, detected by presence of `language` field on doc‑per‑locale types or array‑shape on `score` fields)
  - Logs every patch
- [ ] Update every reference to legacy singleton ids in code:
  - `sanity.config.ts` Presentation `mainDocuments` resolver filters
  - `sanity/lib/queries.ts` GROQ filters that hardcode `_id == "siteAbout"`, etc.
  - Any other call sites; grep for `"site` and `__i18n_`
- [ ] Add to `package.json`: `"migrate:i18n": "tsx scripts/migrate-add-language.ts"`
- [ ] Dry‑run mode (`--dry-run`) prints intended patches and id renames without writing
- [ ] Run against staging dataset first, verify count, then production

### A4. GROQ query updates

Every query in `sanity/lib/queries.ts` needs a `&& language == $locale` clause and a `$locale` parameter.

- [ ] `settingsQuery`
- [ ] `navSettingsQuery`
- [ ] `footerContactQuery`
- [ ] `organQuery`
- [ ] `organPagesSlugs` — must enumerate slugs for *all* locales (one entry per locale)
- [ ] `landingOrgansQuery`
- [ ] `landingStatsQuery`
- [ ] `landingCitiesQuery`
- [ ] `archiveOrgansQuery`
- [ ] `archiveOrgansCountQuery`
- [ ] `aboutQuery`
- [ ] `journalQuery`
- [ ] `journalPagesSlugs`
- [ ] `journalEntriesQuery`
- [ ] `journalStatsQuery`
- [ ] `journalPageQuery`
- [ ] `organsPageQuery`
- [ ] `scoresPageQuery`
- [ ] `llmsTxtIndexQuery` — emits one section per locale, or one llms.txt per locale at `/llms.{locale}.txt`
- [ ] `elsewhereQuery`
- [ ] `privacyQuery`
- [ ] `scoresQuery` — different shape: uses `coalesce(field[_key == $locale][0].value, field[_key == "nl"][0].value)` for the four localised fields (`era`, `forInstrument`, `edition`, `blurb`); other fields project as today
- [ ] `sitemapData` — emits one URL per (slug, locale) pair with `hreflang` alternates

Pass `$locale` from the route segment via `params.locale` in every server component.

### A5. Routing migration

Move every `app/(site)/...` route under `app/[locale]/(site)/...`. Existing routes:

- [ ] `app/[locale]/(site)/page.tsx` (journal landing)
- [ ] `app/[locale]/(site)/organs/page.tsx`
- [ ] `app/[locale]/(site)/organs/[slug]/page.tsx`
- [ ] `app/[locale]/(site)/journal/[slug]/page.tsx`
- [ ] `app/[locale]/(site)/about/page.tsx`
- [ ] `app/[locale]/(site)/elsewhere/page.tsx`
- [ ] `app/[locale]/(site)/scores/page.tsx`
- [ ] `app/[locale]/(site)/privacy/page.tsx`
- [ ] `app/[locale]/(site)/layout.tsx`
- [ ] Move `app/under-construction/` to stay locale‑agnostic (no prefix); accessible at `/under-construction` only
- [ ] Update `generateStaticParams` everywhere to emit one entry per (slug, locale) pair
- [ ] Update `app/sitemap.ts` to emit `<loc>` per locale + `<xhtml:link rel="alternate" hreflang="..."/>` siblings
- [ ] Update `app/robots.ts` (no functional change expected, just verify)
- [ ] Update `app/llms.txt` route to support per‑locale variants
- [ ] Update `<html lang>` in root layout to use `params.locale`
- [ ] Set `dir="rtl"` only when adding Arabic later (out of scope now, but leave the hook)

### A6. Translator interface + implementations

Location: `core/translator/`

The interface is shape‑agnostic: a `TranslationUnit` is just `{ id, sourceText }`. The walkers in A7 are what change between Portable Text and field‑level inputs — the translator itself never knows whether it’s translating a PT body or a `score.blurb` array.

- [ ] `core/translator/types.ts` — interfaces:
  ```ts
  export interface TranslationUnit {
    /** Stable, walker‑scoped path. PT example: `block[2].child[0]`. Field‑level example: `blurb`. */
    id: string
    sourceText: string
    /** Optional sibling context for the LLM (e.g. surrounding paragraph). */
    context?: string
  }
  export interface TranslateRequest {
    sourceLocale: Locale
    targetLocale: Locale
    units: TranslationUnit[]
    previousUnits?: TranslationUnit[]      // for diff‑aware
    previousTranslation?: TranslationUnit[] // for diff‑aware
    glossary?: Record<string, string>
    documentContext?: { type: string; title?: string; shape: 'portable-text' | 'field-level' }
  }
  export interface Translator {
    name: string
    translate(req: TranslateRequest): Promise<TranslationUnit[]>
  }
  ```
  `documentContext.shape` lets the prompt builder hint the LLM ("these units are independent catalog‑field strings, not paragraphs of running prose") without changing the wire format.
- [ ] `core/translator/gemini.ts` — `GeminiTranslator` (default)
  - Uses `@google/genai` SDK (Google AI Studio key for dev/prod, Vertex AI optional later)
  - Default model: `gemini-2.5-pro` for production, `gemini-2.5-flash` available as cheap option / per‑locale override
  - Uses `responseMimeType: 'application/json'` + `responseSchema` for guaranteed JSON output
  - Strong on JA/ZH/KO; the cost‑quality sweet spot for our shape of work
  - Per‑locale model override map in constructor options
- [ ] `core/translator/anthropic.ts` — `AnthropicTranslator`
  - Uses `@anthropic-ai/sdk`
  - Default model: `claude-sonnet-4-5` (pinned to a date‑stamped version on release; symbolic alias allowed in dev)
  - Uses tool‑use (structured JSON output) to guarantee schema compliance
  - Best fallback when Gemini structured output regresses on a specific doc
- [ ] `core/translator/openai.ts` — `OpenAITranslator`
  - Uses `openai` SDK
  - Default model: `gpt-4o`
  - Uses `response_format: { type: 'json_schema' }` for structured output
- [ ] `core/translator/factory.ts` — picks implementation from env `TRANSLATOR_PROVIDER` (`gemini` | `anthropic` | `openai`, default `gemini`), exports `getTranslator()`
- [ ] `core/translator/prompts.ts` — system prompt builders shared across providers (provider‑specific quirks isolated to each implementation)
- [ ] Unit tests for all three translators against a small fixture (mocked HTTP)

### A7. Round‑trip walkers

Walkers extract `TranslationUnit[]` from a Sanity value and re‑apply the translated units back into the same shape, preserving every system field (`_key`, `_type`, `_ref`, `markDefs`, `_strengthenOnPublish`, etc.). One walker per shape.

#### A7.1 Portable Text walker (for `journal.content`, `organ.content`, `about.letter`, `privacy.sections[].body`, etc.)

Goals: never lose `_key`, marks, markDefs, embedded `audio` / `video` / `image` / `embed` blocks, or links.

- [ ] `core/translator/walkers/portable-text.ts`:
  - [ ] `extractTranslationUnits(blocks)`: walks PT, returns `TranslationUnit[]` where `id` is a stable path like `block[2].child[0]`
  - [ ] Skips: image/audio/video/embed `_type`s except their `caption` / `alt` fields
  - [ ] Preserves: marks (rendered as `<em>`, `<strong>`, etc. inline tokens in the unit text, instructed to round‑trip in the prompt)
  - [ ] `applyTranslationUnits(blocks, units)`: rewrites the PT tree by id, preserving every `_key`, `_type`, `markDefs`
- [ ] Tests with golden fixtures:
  - [ ] Plain prose round‑trips
  - [ ] Marks (em, strong, code) preserved
  - [ ] Links + their `markDefs` preserved
  - [ ] Audio/video/image blocks left structurally untouched, only captions translated
  - [ ] Custom `embed` blocks left untouched
  - [ ] `_key`s identical before and after

#### A7.2 Plain field walker (for `title`, `excerpt`, `coverImage.alt`, `coverImage.caption`, `wordmark`, `tagline`, etc.)

- [ ] `core/translator/walkers/fields.ts`:
  - [ ] `extractStringFields(doc, paths)`: returns one `TranslationUnit` per path; `id` is the dotted path (e.g. `coverImage.alt`)
  - [ ] `applyStringFields(doc, units)`: writes back to the same paths, leaving the rest of the doc untouched
- [ ] Tests: missing field skipped (not translated to empty); array indices in paths supported (e.g. `disposition.couplings[2].name` if ever needed)

#### A7.3 Internationalised‑array walker (for `score.era`, `score.forInstrument`, `score.edition`, `score.blurb`)

This walker is what makes `score` work end‑to‑end on the same translator pipeline as everything else.

Field shape (per `sanity-plugin-internationalized-array`):

```ts
type InternationalisedArrayString = Array<{ _key: Locale; _type: 'internationalizedArrayStringValue'; value: string }>
```

- [ ] `core/translator/walkers/i18n-array.ts`:
  - [ ] `extractI18nArrayUnits(doc, paths, sourceLocale)`: for each configured path, finds the entry where `_key === sourceLocale`, emits one `TranslationUnit { id: "<path>", sourceText: entry.value }`
  - [ ] `applyI18nArrayUnits(doc, paths, units, targetLocale)`: writes/updates the entry where `_key === targetLocale` for each path. If the entry doesn’t exist yet it’s appended with `_key: targetLocale, _type: '<corresponding>Value', value: <translated>`
  - [ ] Idempotent: re‑applying the same units leaves the doc byte‑identical except for `_updatedAt`
  - [ ] Preserves all non‑target‑locale entries verbatim
- [ ] Tests:
  - [ ] Translating to a brand‑new locale appends one new entry per path
  - [ ] Translating to an existing locale updates that entry’s `value` only
  - [ ] No `_key` collisions; no entries with `_key` outside `LOCALES` ever produced
  - [ ] `score.composer` / `score.year` / `score.pdfFile` (non‑localised fields) untouched
  - [ ] Source‑locale entry never mutated

#### A7.4 Per‑type walker registry

A tiny dispatcher keeps the route logic clean.

- [ ] `core/translator/walkers/registry.ts` exports `walkersFor(type: string): { extract, apply }` returning the right composition of A7.1–A7.3 walkers per Sanity type:
  - `journal`, `organ`, all singletons → PT walker for body fields + plain field walker for `title`, `excerpt`, `alt`, `caption`, etc.
  - `score` → plain field walker for nothing (composer/work are non‑localised) + i18n‑array walker for `era`, `forInstrument`, `edition`, `blurb`
  - `settings` → plain field walker for `title`, `description`, `wordmark`, `tagline`, `scoresNoticeBody`, `scoresEditionLine`
- [ ] Tests: registry returns correct walker compositions for every translatable type

### A8. Diff‑aware updates

- [ ] In `/api/translate`, when target doc already exists:
  - Compute set of `TranslationUnit`s whose `sourceText` differs from the previous source's matching unit (by id)
  - Send only those units to the translator, with `previousUnits` + `previousTranslation` of the same set as context
  - For unchanged units, copy the previous translation verbatim
- [ ] When a unit's id no longer exists in the new source: drop the corresponding translation
- [ ] When a unit appears that wasn't in the previous source: translate fresh
- [ ] Store on the translated doc:
  - `_translationSourceRev`: the `_rev` of the source it was translated from
  - `_translationSourceUpdatedAt`: the source's `_updatedAt`
- [ ] Tests for: no‑op (nothing changed), single paragraph edit, paragraph insertion, paragraph deletion, full rewrite

### A9. API routes

Two routes back the two studio actions. Both share the same auth, validation, walker dispatch, and SSE plumbing.

#### A9.1 `/api/translate` (powers "Translate to all locales")

- [ ] `app/api/translate/route.ts`:
  - [ ] `POST { docId, targetLocales?: Locale[] }` — defaults to all non‑source locales
  - [ ] Verifies caller is an authenticated Sanity user (calls `https://api.sanity.io/v1/users/me` with caller's token from `Authorization` header)
  - [ ] Verifies the doc's `_type` is in the translatable allow‑list
  - [ ] Loads source + existing translation siblings (or, for `score`, the single doc) using `serverClient` (write token from env)
  - [ ] Dispatches via `walkersFor(type)` (A7.4)
  - [ ] For each target locale: extracts units, computes diff vs. previous (A8), calls `translator.translate(...)`, applies units back, writes
    - **Document‑per‑locale types** (`journal`, `organ`, all singletons): writes (creates or patches) the sibling doc with the correct `language` field; updates the `translation.metadata` doc to link siblings (per `@sanity/document-internationalization` 6.x model; no `__i18n_refs` field on docs themselves)
    - **Field‑level types** (`score`): patches the single doc — each path gets its `_key === targetLocale` entry created or updated
  - [ ] Sets per‑locale provenance (A8): `_translationSourceRev`, `_translationSourceUpdatedAt` on the sibling doc; for `score`, stored in a parallel `_translationProvenance: { [locale]: { sourceRev, updatedAt } }` object on the doc itself
  - [ ] Returns `{ translated: { [locale]: { docId, status: 'created' | 'updated' | 'unchanged' | 'skipped' | 'failed', error?: string } } }`
  - [ ] All errors logged with structured fields (locale, docId, type, provider, durationMs, tokenUsage)
  - [ ] Streams progress events (Server‑Sent Events) so studio can show "Translating French... done. Translating Italian..." live
- [ ] Rate‑limit: max 1 in‑flight translation per docId at a time (in‑memory mutex is fine for single‑instance Vercel deployment, can revisit if scaled)

#### A9.2 `/api/publish-all` (powers "Publish to all locales")

Wraps `/api/translate` with publish steps before and after. Designed to fail safely — see failure matrix in A10.2.

- [ ] `app/api/publish-all/route.ts`:
  - [ ] `POST { docId }`
  - [ ] Same auth + allow‑list checks as `/api/translate`
  - [ ] Reads `autoPublishTranslations` flag from `settings` singleton (default `true`); when `false`, behaves as a translate‑only request that leaves siblings as drafts
  - [ ] **Step 1 — validate source**: runs Sanity’s document validators on the source draft. Hard fail if any error; surfaces validation messages to the SSE stream and aborts before any publish
  - [ ] **Step 2 — publish source**: commits the source draft to published. If this fails, abort entirely (the rest is dependent on a published source). NL stays in draft, editor sees the error
  - [ ] **Step 3 — translate**: invokes the same machinery as `/api/translate` (factor the inner pipeline into a shared module so both routes use it). Per‑locale failures are captured but do not block other locales
  - [ ] **Step 4 — publish translated siblings** (document‑per‑locale types only; `score` is one doc, already published in step 2):
    - For each successfully‑translated sibling: run validators, then publish
    - Per‑locale validation failure → leave that locale as a draft, mark `status: 'translated_not_published'`, surface reason to SSE stream; other locales continue
    - Per‑locale publish failure (network, transient) → mark `status: 'translated_not_published'`, surface, others continue
  - [ ] Returns `{ source: 'published' | 'failed', translated: { [locale]: { docId, status, error? } } }` where `status ∈ 'published' | 'translated_not_published' | 'unchanged' | 'skipped' | 'failed'`
  - [ ] **Idempotent**: re‑running the route on the same docId picks up where it left off (already‑published siblings detected via doc id presence + `_translationSourceRev` match → skipped)
  - [ ] Logs every state transition with structured fields

### A10. Document Actions in Studio

Two new actions, registered alongside the built‑in `publish` (which stays per‑locale and unchanged). Built‑in `unpublish`, `duplicate`, `delete`, `discardChanges`, `restore` also stay untouched.

#### A10.1 "Translate to all locales" — translate‑only

- [ ] `sanity/actions/translate.tsx` — defines `translateAllAction`:
  - Visible on all translatable doc types
  - Hidden on non‑source‑language docs for document‑per‑locale types (only visible when editing the Dutch original); always visible on `score` since it's one doc
  - On click: opens a dialog showing per‑locale status (✓ up to date, ⚠ stale, ✗ not yet translated, ⛔ manual edit detected)
  - "Translate all stale + missing" button
  - Per‑locale "Translate this one" buttons
  - Calls `/api/translate` and renders SSE progress
  - On finish: refreshes the studio's doc cache so siblings appear immediately
- [ ] Tests: action visibility logic; dialog rendering with mocked status

#### A10.2 "Publish to all locales" — translate + publish

- [ ] `sanity/actions/publishAll.tsx` — defines `publishAllLocalesAction`:
  - Visible on all translatable doc types, only on the source‑language document (NL) for document‑per‑locale types; on `score`, always visible
  - Disabled when source draft is empty / has no diff vs. published
  - On click: opens a confirmation dialog summarising what will happen ("Publish source → translate 7 stale + 3 missing locales → publish 10 siblings")
  - On confirm: calls `/api/publish-all` and renders SSE progress with per‑step state
  - On finish: refreshes the studio's doc cache; surfaces a banner with any partial failures and a one‑click "Retry failed" button that re‑hits `/api/publish-all` (idempotent)
- [ ] Sanity config: register both actions via `document.actions` reducer in `sanity.config.ts`. Existing `publish` action stays first in the menu; `publishAllLocalesAction` is added next to it; `translateAllAction` lives in the secondary menu (three‑dot)
- [ ] Tests: visibility logic per type and per language; confirmation dialog renders the expected summary; partial‑failure banner shows correct retry semantics

#### A10.3 Failure matrix

What happens at each step when something goes wrong. "Surface" means: shown in SSE stream live, then in the post‑run banner, and logged with structured fields server‑side.

| Step | Failure mode | Source state | Sibling state | UX |
|---|---|---|---|---|
| 1. Validate source | Validator errors | Draft (unchanged) | Untouched | Abort; surface validator messages; no publish, no translate |
| 2. Publish source | Network / API error | Draft (unchanged) | Untouched | Abort; surface; offer retry |
| 2. Publish source | Concurrent edit conflict | Draft updated | Untouched | Abort; ask editor to refresh and retry |
| 3. Translate | LLM rate limit / 429 | Published | Mixed: some succeeded before limit | Surface per‑locale; failed locales marked `failed`; offer retry for failed only |
| 3. Translate | LLM bad output / schema mismatch | Published | Locale failed, others continue | Surface; failed locale marked `failed`; one‑click retry |
| 3. Translate | Provider down (5xx) | Published | All failed | Surface; one‑click retry once provider recovers; suggest swapping `TRANSLATOR_PROVIDER` |
| 4. Publish sibling | Validator errors on translated draft (e.g. required field landed empty) | Published | `translated_not_published` (draft kept) | Surface validator messages; editor fixes manually then publishes that locale |
| 4. Publish sibling | Network / API error | Published | `translated_not_published` | Surface; one‑click retry only that locale |

Design rules baked into the matrix:

- **Source publishes first**, so a translation regression never blocks a fix to NL going live.
- **Per‑locale failures never block other locales**.
- **Idempotent retries**: re‑hitting `/api/publish-all` resumes from where it failed without re‑doing successful work.
- **No silent failures** — every error path surfaces.

#### A10.4 `autoPublishTranslations` flag

- [ ] Add field to the `settings` singleton: `autoPublishTranslations: boolean`, default `true`
- [ ] When `false`: `/api/publish-all` performs steps 1–3 only, skips step 4. Translated siblings remain as drafts; the post‑run banner says "Drafts created in 10 locales. Review and publish each."
- [ ] When `true`: full flow as specified above
- [ ] Tests: flag toggles flow; flag‑off path leaves siblings as drafts; flag‑on path publishes them

### A11. Stale indicator

- [ ] In Studio: small red dot on the locale switcher tabs (provided by `documentInternationalization`) for any sibling whose `_translationSourceRev !== sourceDoc._rev`
- [ ] Implement via a custom `documentInternationalization` `languageField` decorator or a custom Studio component
- [ ] Tooltip shows "Source updated since this translation; click translate to update"

### A12. Glossary / do‑not‑translate

Organ‑specific Dutch terms must round‑trip untouched: `Hoofdwerk`, `Bovenwerk`, `Rugwerk`, `Pedaal`, `Borstwerk`, `Zwelwerk`, `tremulant`, `koppel`, `setzer`, plus builder names and place names.

- [ ] Add `glossary: array<{term, doNotTranslate?: boolean, translations?: {locale: string}}>` to the `settings` singleton (single global glossary for now)
- [ ] Translator passes glossary in every request as a `do not translate these terms; if a translation is given, use it` instruction
- [ ] Test: a paragraph containing `Hoofdwerk` in NL still says `Hoofdwerk` in EN/DE/JA output

### A13. Slugs

Each locale gets its own slug. Translator translates the slug string, with editor override.

- [ ] On first translation: translator generates `{locale}` slug from translated title
- [ ] Editor can override; subsequent re‑translations preserve manual overrides (detect: if the existing translated slug doesn't match `slugify(previousTranslatedTitle)`, treat as manual and keep)
- [ ] Slug uniqueness enforced per‑locale (existing `isUnique` check still works since plugin scopes by language)

---

## Track B — Hardcoded UI strings

### B1. Install next-intl

- [ ] `yarn add next-intl`
- [ ] `next.config.ts` — wrap with `createNextIntlPlugin('./i18n/request.ts')`
- [ ] Create `i18n/request.ts` (server config), `i18n/routing.ts` (locale list, default), `i18n/navigation.ts` (typed `Link`, `redirect`)

### B2. Compose middleware

The under‑construction gate and the locale resolver must compose cleanly.

- [ ] Refactor `middleware.ts`:
  1. If gate active and not bypassed → rewrite to `/under-construction` (no locale resolution, page is locale‑agnostic English)
  2. Else → run `next-intl` middleware (auto‑detects from `Accept-Language`, redirects `/` to `/{detected-locale}/`, persists choice in `NEXT_LOCALE` cookie)
- [ ] `ALWAYS_ALLOW` list keeps `/admin`, `/api`, `/_next`, `/favicon`, `/sitemap.xml`, `/robots.txt`, `/under-construction`, `/llms*.txt`
- [ ] Tests for middleware:
  - [ ] Gate active → rewrite regardless of locale
  - [ ] Gate inactive, no locale in URL → redirect to detected locale
  - [ ] Gate inactive, locale in URL → pass through
  - [ ] Bypass cookie still works through both layers
  - [ ] `/admin` always reachable
  - [ ] Sanity draft mode bypass still works

### B3. Extract hardcoded strings

Audit pass: every `.tsx` under `app/components/landing/` + every page under `app/(site)/...`. Strings to extract include but are not limited to:

- [ ] `Nav.tsx` — "Organs", "Scores", "About me", "Elsewhere", "Open menu", "Close menu", default "Bert Webbink", default "Organist"
- [ ] `Footer.tsx`
- [ ] `Hero.tsx`
- [ ] `JournalHero.tsx`
- [ ] `JournalList.tsx`
- [ ] `JournalArticle.tsx`
- [ ] `OrgansArchive.tsx` — "By city", filter labels, pagination
- [ ] `OrganArticle.tsx` — "Specification", "Manuals", "Stops", "Pitch", "Temperament", "Action", "Year of restoration", "Couplings", "Accessories", "Registers"
- [ ] `OrganBody.tsx`
- [ ] `OrganCard.tsx` — "Read more", date format, etc.
- [ ] `Specs.tsx` — every label
- [ ] `About.tsx`
- [ ] `Privacy.tsx`
- [ ] `Elsewhere.tsx`
- [ ] `Scores.tsx`
- [ ] `Crumbs.tsx` — "Home"
- [ ] `app/under-construction/page.tsx` — gate copy
- [ ] `Placeholder.tsx`
- [ ] `app/(site)/page.tsx` metadata description
- [ ] All page metadata (`title`, `description`) in every `page.tsx`
- [ ] Date format strings via `next-intl`'s formatters (no `date-fns` strings to translate, but `format(...)` calls need locale)

Output: `messages/en.json` (source) — flat namespaced keys, e.g.:

```json
{
  "Nav": { "organs": "Organs", "scores": "Scores", "about": "About me", "elsewhere": "Elsewhere" },
  "Specs": { "manuals": "Manuals", "stops": "Stops", ... }
}
```

- [ ] Run `tsc` after each component conversion to catch missed strings
- [ ] Run `oxlint` rule (custom or via grep) to forbid string literals containing letters in JSX text nodes outside of `<Trans>` / `t()` (advisory check)
- [ ] Type‑safe keys via `next-intl`'s `IntlMessages` type generation

### B4. Seed the other 10 locales

- [ ] `scripts/translate-ui-messages.ts`:
  - Reads `messages/en.json`
  - For each non‑English locale: reads existing `messages/{locale}.json` (if any), diffs against `en.json`, sends only changed/new keys to `Translator`, merges
  - Preserves manual overrides (key‑by‑key check: if previous EN value matches what's stored in a `_lastSeenSource` sidecar, the translation is auto and can be replaced; otherwise it's manual and skipped)
  - Sidecar file `messages/.last-seen-en.json` tracks the EN version each translation was made from
- [ ] `package.json`: `"translate:ui": "tsx scripts/translate-ui-messages.ts"`
- [ ] Initial run produces 10 starter files
- [ ] Manual review pass for `nl` (since Dutch is not the UI source, the editor will likely want to fine‑tune)

### B5. Language picker

- [ ] `app/components/landing/LanguagePicker.tsx`:
  - Top‑right of `Nav`, before the hamburger on mobile, after the desktop links on desktop
  - Trigger: current locale's endonym + small chevron (e.g. "Nederlands ▾")
  - Dropdown: list of all 11 endonyms; current locale highlighted; click switches locale
  - On select: uses `next-intl`'s `useRouter().replace(pathname, { locale })` to swap the URL prefix; `next-intl` writes the cookie automatically
  - Closes on Esc, outside click, route change (mirror existing `Nav.tsx` pattern)
  - Accessible: `role="listbox"`, `aria-activedescendant`, full keyboard nav (↑/↓/Enter/Esc)
  - Mobile: lives in the existing mobile panel as its own section
- [ ] Tests:
  - [ ] Renders endonym for each locale
  - [ ] Clicking a locale changes URL prefix
  - [ ] Cookie persistence works across navigation
  - [ ] No flags rendered (visual regression test)
  - [ ] Keyboard nav works
- [ ] Visual: place between desktop links and the (currently absent on desktop) hamburger; on mobile inside the panel

### B6. Auto‑detect

`next-intl`'s middleware already handles this, but verify:

- [ ] First visit, no cookie, `Accept-Language: de,en;q=0.9` → redirect to `/de/`
- [ ] Unsupported `Accept-Language` (e.g. `sw`) → fall back to `nl` (content default) or `en` (UI default)? **Decision needed — see open questions.**
- [ ] User picks a locale → cookie set, subsequent visits respect cookie
- [ ] Bot user agents → no cookie writes, serve based on `Accept-Language` only

---

## Track C — Cleanup

- [ ] Remove `@sanity/assist` from `package.json`
- [ ] Remove `assist` import + `assist()` plugin entry from `sanity.config.ts`
- [ ] Run `yarn` to update lockfile
- [ ] Verify Studio still loads, no console errors
- [ ] Update `sanity-typegen` output (`yarn typegen`)

---

## Track D — Plugin extraction (deferred)

After 2–3 months of internal use, extract `sanity/plugins/translate/` to a public package.

- [ ] Decide package name (e.g. `sanity-plugin-llm-translate`)
- [ ] Configurable schema type list
- [ ] Configurable `Translator` factory (default Gemini, but consumers bring their own)
- [ ] Plugin options API (glossary source, locale list, model overrides, route URL)
- [ ] Standalone repo with README, examples, tests
- [ ] License: MIT
- [ ] Publish to npm
- [ ] Replace internal usage in this repo with the published package

---

## Testing strategy

- [ ] **Unit**: PT round‑trip, field round‑trip, diff computation, glossary application, slug translation logic, locale negotiation, language picker behaviour
- [ ] **Integration (mocked LLM)**: full `/api/translate` pipeline against fixture docs with a fake `Translator` that returns deterministic output
- [ ] **Integration (real LLM)**: opt‑in (`TRANSLATE_E2E=1`), runs against a fixture doc end‑to‑end on Gemini, asserts shape only (not exact wording)
- [ ] **E2E (Playwright, optional)**: language picker switches URL + content; auto‑detect on first visit; under‑construction gate composes correctly
- [ ] All tests run under 200ms except the opt‑in real‑LLM integration

---

## Backup

Before any phase of this plan runs against production, a fresh Sanity dataset export must exist.
**An initial backup has already been taken**:

- Path: `~/sanity-backups/bertwebbink.nl/2026-04-29_02-00-18/production.tar.gz` (5.9 GB)
- Contents: 172 documents, 1842 assets (images + audio), gzip integrity verified
- Doc breakdown (pre‑cleanup): 132 `organ`, 25 `journal`, 4 `score`, 7 singletons, plus 3 stale docs handled by `plans/cleanup-pre-i18n.md` (1 `drafts.siteSettings`, 1 `post` ghost draft, 1 `blog` ghost draft) and 1 `sanity.previewUrlSecret`
- Restore: `sanity dataset import <file.tar.gz> production` (project `o98l2fej`)

Guardrails (mandatory):

- [ ] Re‑run the export immediately before A3 runs against production. Use a fresh timestamped folder; never overwrite an existing backup.
- [ ] Re‑run the export immediately before any `plans/upgrades.md` Sanity‑major upgrade phase merges to production.
- [ ] Re‑run the export immediately before `plans/cleanup-pre-i18n.md` Step 4 (apply) runs.
- [ ] Verify each new export with `gzip -t` + a doc count + a type breakdown (script: TODO add `scripts/backup-sanity.ts` modelled on `/tmp/backup-bertwebbink-sanity.sh`).
- [ ] After `plans/cleanup-pre-i18n.md` merges, the dataset will have **no** `post` or `blog` documents and **no** `drafts.siteSettings`. The A3 migration script does **not** need stale‑type skip logic for those ids; it can assume only the live schema types exist.

## Rollout plan

Phased to avoid a big‑bang merge.

1. [ ] **Phase 1 — foundation**: Track C (remove assist), A1 (install plugin), A2 (schema), A3 (migration), A4 (queries), A5 (routing). Ship behind a feature flag `NEXT_PUBLIC_I18N_ENABLED`. With flag off, site is identical to today.
2. [ ] **Phase 2 — UI strings**: B1, B2, B3 (extract), seeded with EN only (no other locales yet). Site renders English only behind the same flag.
3. [ ] **Phase 3 — translator core**: A6, A7, A8 (no studio integration yet). Tests only.
4. [ ] **Phase 4 — translate action**: A9, A10, A11, A12, A13. First real Sanity translations produced, only Dutch + English visible to public.
5. [ ] **Phase 5 — UI seed**: B4 produces all 10 non‑EN UI files. Manual review.
6. [ ] **Phase 6 — language picker + auto‑detect**: B5, B6. Flag flipped on; site goes multilingual.
7. [ ] **Phase 7 — bake**: monitor for issues, fix glossary entries, tune prompts. ~2 weeks.
8. [ ] **Phase 8 — plugin extraction**: Track D. Optional, after bake.

---

## Out of scope (explicit)

- Arabic / RTL support — revisit when adding the locale.
- Per‑locale draft/publish workflow refinements beyond what `documentInternationalization` ships.
- AI‑driven UI string suggestions in the studio.
- Translation memory / TM database (the diff‑aware update covers 95% of the value).
- Per‑document glossary overrides (global only for now).
- Fall‑back chain (`coalesce(en, nl)` etc.) — every locale is fully populated by the action; missing locale = bug, not a fallback case.
- Search/index changes (no full‑text search exists today).
- AMP / RSS per locale.

---

## Open questions

These need resolution before Phase 1 starts. None block the plan being written, but each forces a small implementation choice.

- [ ] **Q1.** When the visitor's `Accept-Language` matches no supported locale (e.g. Swahili browser), do we fall back to `nl` (content source) or `en` (UI source / lingua franca)? Recommendation: **`en`**. Lingua franca, broadest second‑language coverage.
- [ ] **Q2.** Should the under‑construction page itself be localised? It's currently English with hardcoded copy. Recommendation: **leave as English only** — it's a temporary state and not worth 11× the translation work.
- [x] **Q3.** Singleton id strategy. **Resolved**: symmetric `{type}-{locale}` per skill §6. See A2.1.
- [ ] **Q4.** Date formatting locale: should `nl` users see Dutch month names regardless of what the document says (since dates are not translated by the LLM, they're rendered)? Recommendation: **yes** — use `next-intl`'s `format.dateTime()` driven by the visitor's locale, not the document's.
- [ ] **Q5.** Studio editor language: do you want the *Sanity Studio chrome itself* in Dutch when you're editing Dutch docs? `@sanity/document-internationalization` does not localise studio chrome; this would mean Sanity's own i18n. Recommendation: **English studio chrome regardless** — keep it simple.
- [ ] **Q6.** Cost cap / abuse guard on `/api/translate`: should we enforce a daily token budget per Sanity user? Recommendation: **soft logging only initially**; revisit if costs surprise.
- [ ] **Q7.** Glossary location: `settings` singleton (per project) versus a dedicated `glossary` document type with a separate edit experience? Recommendation: **`settings` for v1**; promote to its own type only if the list grows past ~50 entries.
- [ ] **Q11.** `score.work` field — always kept in original (e.g. "Toccata in F"), or translated where conventional ("Toccata in fa")? Recommendation: **kept in original**; this is the cataloguing convention and avoids muddling search. If overrides are ever needed, promote `work` to `internationalizedArrayString` later — schema change is additive.
- [x] **Q8.** Should the `settings` singleton's `title` / `description` / OG image fields be locale‑aware? **Resolved**: yes — covered in A2 (the `settings` singleton goes through the same document‑per‑locale flow as every other singleton, and `settings-{locale}` carries the locale‑specific title, description, and OG image).
- [ ] **Q9.** Hreflang tag emission: emit on every page, or only on translation‑complete pages? Recommendation: **every page** — cleaner SEO, and incomplete locales should never reach prod (they'd be a rollout bug).
- [ ] **Q10.** When the editor manually edits a translated doc and *then* re‑runs translate: should the manual edits be preserved, or overwritten by the LLM? Recommendation: **preserved** — track per‑unit `lastEditedBy: 'human' | 'llm'`; only re‑translate units flagged `llm`. Adds complexity but matches editor expectations.

---

## File map (where things will live)

```
core/
  i18n/
    locales.ts              # LOCALES, DEFAULT_LOCALE, UI_DEFAULT_LOCALE, LOCALE_ENDONYMS
  translator/
    types.ts                # Translator, TranslateRequest, TranslationUnit
    prompts.ts              # system prompt builders (PT vs field-level shape hints)
    gemini.ts               # GeminiTranslator (default)
    anthropic.ts            # AnthropicTranslator
    openai.ts               # OpenAITranslator
    factory.ts              # getTranslator()
    walkers/
      portable-text.ts      # extract/apply for PT (A7.1)
      fields.ts             # extract/apply for plain string/text fields (A7.2)
      i18n-array.ts         # extract/apply for sanity-plugin-internationalized-array (A7.3)
      registry.ts           # walkersFor(type) dispatcher (A7.4)
    *.spec.ts               # tests

i18n/
  request.ts                # next-intl server config
  routing.ts                # next-intl routing config
  navigation.ts             # typed Link/redirect

messages/
  en.json                   # source
  nl.json
  de.json … ko.json
  .last-seen-en.json        # sidecar for translate-ui script

sanity/
  actions/
    translate.tsx           # "Translate to all locales" action (A10.1)
    publishAll.tsx          # "Publish to all locales" action (A10.2)
  plugins/
    translate/              # internal plugin module (future extract point)

scripts/
  migrate-add-language.ts
  translate-ui-messages.ts

app/
  [locale]/
    (site)/
      layout.tsx
      page.tsx
      organs/...
      journal/...
      ...
  api/
    translate/
      route.ts              # /api/translate (A9.1)
    publish-all/
      route.ts              # /api/publish-all (A9.2)
  under-construction/       # stays unprefixed
```

---

## Done means

- [ ] Visitor lands on `/de/` if their browser is German; sees the entire site in German.
- [ ] Editor opens a Dutch journal post, presses **"Publish to all locales"**, confirms, watches the SSE progress: source publishes, 10 locales translate, 10 siblings publish. Banner shows "All 10 locales published" or surfaces any per‑locale failures with a one‑click retry.
- [ ] Editor edits one paragraph in the Dutch source, presses **"Publish to all locales"** again, all 10 siblings get only that paragraph updated and re‑published; everything else is byte‑identical.
- [ ] Editor manually fixes a clunky French sentence; next "Publish to all locales" run preserves the manual fix (per Q10).
- [ ] Editor opens a `score`, presses **"Publish to all locales"**, the four localised array fields are filled in for every missing locale and the doc is published once. PDF is touched zero times.
- [ ] Editor flips `autoPublishTranslations` to `false` in settings, presses **"Publish to all locales"**, source publishes, siblings land as drafts, banner says "Drafts created in 10 locales".
- [ ] When the LLM provider returns an error mid‑run, the run continues for other locales, the failed locale is marked clearly, and pressing the action again resumes from the failure (idempotent).
- [ ] Built‑in **Publish** action still publishes only the current document (no surprise multi‑locale behaviour).
- [ ] Language picker top‑right works on desktop and mobile, no flags, switches URL prefix and persists.
- [ ] `yarn translate:ui` keeps message catalogues in sync after editing `messages/en.json`.
- [ ] Site costs <$5/month in Google Gemini API on normal usage (roughly 1/6 of the Sonnet figure).
- [ ] Lighthouse / SEO audit shows correct `hreflang` alternates, correct `<html lang>`, no duplicate content flags.
- [ ] All existing tests still pass; new pipeline has tests covering all three walker shapes (PT, plain field, i18n‑array) + diff‑aware updates + the publish‑all failure matrix + middleware composition.
