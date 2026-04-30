# Translations

Multilingual content + UI on bertwebbink.nl. 11 locales, document-per-locale content model,
LLM-driven translation pipeline, no Sanity AI Assist, no SaaS translation services.

## Decisions

| Concern                            | Decision                                                                                                                                                                                                                               |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Content source language            | Dutch (`nl`).                                                                                                                                                                                                                          |
| UI / code / design source language | English (`en`).                                                                                                                                                                                                                        |
| Locales (11)                       | `nl`, `en`, `de`, `fr`, `es`, `it`, `pt`, `hi`, `ja`, `zh`, `ko`.                                                                                                                                                                      |
| URL strategy                       | Prefix every route with locale: `/{locale}/...`. No "default locale without prefix" exception.                                                                                                                                         |
| Sanity content model               | Document-per-locale via `@sanity/document-internationalization` for `journal`, `organ`, and every singleton. **Field-level** via `sanity-plugin-internationalized-array` for `score` only.                                             |
| Locale list                        | Code constant in `core/i18n/locales.ts` — single source of truth for both Sanity i18n plugins, `next-intl` routing, and the language picker. **No `locale` document type in Sanity.**                                                  |
| Singleton id pattern               | Symmetric `{type}-{locale}` for every locale (`about-nl`, `about-en`, ..., `journalPage-en`). No "default without suffix" exception.                                                                                                   |
| Translation engine                 | LLM (not conventional MT).                                                                                                                                                                                                             |
| Default provider                   | Google Gemini, model `gemini-2.5-flash` (~33× cheaper output tokens than Pro; quality is fine for our shape of work).                                                                                                                  |
| Pluggability                       | `Translator` interface + `GeminiTranslator` (default) + `AnthropicTranslator` + `OpenAITranslator`. Picked by `TRANSLATOR_PROVIDER` env (default `gemini`). Model overridable via `GEMINI_MODEL` / `ANTHROPIC_MODEL` / `OPENAI_MODEL`. |
| Stale handling                     | Visual indicator badge in Studio + action always re-runs all locales on press. Orchestrator does not short-circuit on a matching `_translationSourceRev`, so walker-spec expansions automatically reach existing siblings.             |
| UI strings library                 | `next-intl`. Hand-authored `messages/en.json`; other 10 locales seeded via `yarn translate:ui`. Dutch (`messages/nl.json`) authored by hand because it's the content default.                                                          |
| Translate trigger                  | Studio Document Action: "Publish (auto-translated)" for translatable types — primary action. Built-in single-locale Publish stays as relabeled fallback ("Publish only this language").                                                |
| Plugin extraction                  | Deferred. Build internal first under `sanity/plugins/translate/`, extract later if value emerges.                                                                                                                                      |
| `@sanity/assist`                   | Removed. Not part of the pipeline.                                                                                                                                                                                                     |
| Glossary location                  | `settings` singleton for v1. Promote to its own document type if the list ever grows past ~50 entries.                                                                                                                                 |
| Manual edits vs re-translation     | Per-unit `human` vs `llm` tracking deferred to v2. Current flow preserves manual slug overrides; per-unit tracking only matters once editors actually report unwanted overwrites.                                                      |

## Cost (measured)

Default model is `gemini-2.5-flash` (output $0.30/M tokens). Earlier estimates were on Pro ($10/M
output) — output dominates the bill 8:1 because Gemini's internal "thinking" tokens count as output.

| Operation                                      | Approx cost          |
| ---------------------------------------------- | -------------------- |
| Full translation, ~1.5k word post → 10 locales | ~$0.03 (Flash)       |
| Incremental update (10–20 % changed)           | ~$0.005 (Flash)      |
| One-time UI strings seed (~200 strings)        | $0.81 measured (Pro) |
| Annual estimate (50 posts, 2× retranslated)    | ~$3 (Flash)          |

## High-level architecture

```
                        ┌─────────────────────────────┐
                        │  Sanity Studio (/admin)     │
                        │  "Publish (auto-translated)"│
                        └────────────┬────────────────┘
                                     │ POST { docId, targetLocales }
                                     │ Authorization: Bearer <studio-token>
                                     ▼
                ┌────────────────────────────────────────┐
                │  /api/publish-all (Next.js route)      │
                │  1. Verify Sanity user token           │
                │  2. Fetch source doc + settings        │
                │  3. Publish source draft (if any)      │
                │  4. Translate stale/missing siblings   │
                │  5. Publish translated siblings        │
                │  6. revalidateTag per touched docId    │
                └────────────┬───────────────────────────┘
                             │
                             ▼
                ┌────────────────────────────┐         ┌──────────────────────┐
                │  Translator (interface)    │ ──────▶ │ GeminiTranslator     │  default
                │                            │         │ AnthropicTranslator  │
                │                            │         │ OpenAITranslator     │
                └────────────────────────────┘         └──────────────────────┘

Public site:
   middleware.ts ──▶ next-intl locale resolver ──▶ app/[locale]/(site)/...
                                                            │
                                                  GROQ filtered by language == $locale
```

The translator interface is shape-agnostic: a `TranslationUnit` is just
`{ id, sourceText, context? }`. Walkers (PT, plain field, i18n-array) extract units from a Sanity
value and re-apply the translated units back into the same shape, preserving every system field
(`_key`, `_type`, `_ref`, `markDefs`, `_strengthenOnPublish`, etc.). The translator never knows
whether it's translating Portable Text or a `score.blurb` array.

## Walker contract

| Walker               | Used for                                                                                       |
| -------------------- | ---------------------------------------------------------------------------------------------- |
| Portable Text walker | `journal.content`, `organ.content`, `about.letter`, `privacy.sections[].body`, etc.            |
| Plain field walker   | Top-level translatable strings on doc-per-locale types (`journal.title`, `organ.excerpt`, ...) |
| i18n-array walker    | `score.forInstrument`, `score.edition`, `score.blurb` (`internationalizedArray*` types)        |

Marks in Portable Text round-trip via inline `<m1>…</m1>` markers — round-trip preservation is
enforced in the prompt and verified in unit tests.

## Auth model

`/api/translate` and `/api/publish-all` validate the editor's Sanity bearer token by hitting
`https://api.sanity.io/v1/users/me`. Same pattern reused by `/api/revalidate` (see
`docs/architecture/caching-strategy.md`). No shared-secret env vars; no Sanity webhooks. Free plan
stays free.

## File map

```
core/
  i18n/locales.ts                         # LOCALES, DEFAULT_LOCALE, UI_DEFAULT_LOCALE, LOCALE_ENDONYMS
  translator/
    types.ts                              # Translator, TranslateRequest, TranslationUnit
    prompts.ts                            # system prompt builders (PT vs field-level shape hints)
    gemini.ts                             # GeminiTranslator (default)
    anthropic.ts                          # AnthropicTranslator
    openai.ts                             # OpenAITranslator
    factory.ts                            # getTranslator()
    walkers/
      portable-text.ts                    # extract/apply for PT
      fields.ts                           # extract/apply for plain string/text fields
      i18n-array.ts                       # extract/apply for sanity-plugin-internationalized-array
      registry.ts                         # walkersFor(type) dispatcher

i18n/
  request.ts                              # next-intl server config
  routing.ts                              # next-intl routing config
  navigation.ts                           # typed Link/redirect
  pathnames.json                          # per-locale URL segment translations

messages/
  en.json                                 # source
  nl.json
  de.json … ko.json                       # 9 LLM-seeded
  .last-seen-en.json                      # sidecar for translate-ui script

sanity/
  actions/
    publishAll.tsx                        # "Publish (auto-translated)"
    relabelPublish.tsx                    # relabels built-in single-locale Publish
    withRevalidate.tsx                    # wraps Publish to bust ISR cache
  plugins/translate/                      # internal plugin module (future extract point)

scripts/
  migrate-add-language.ts                 # one-time backfill (already run)
  translate-ui-messages.ts                # `yarn translate:ui`

app/
  [locale]/(site)/...                     # all public routes locale-prefixed
  api/
    translate/route.ts                    # per-locale translation endpoint
    publish-all/route.ts                  # multi-locale publish + revalidation
```

## Resolved questions

These were open at design time; locking them here so future work doesn't re-litigate.

- **Q1: `Accept-Language` doesn't match any supported locale.** Fall back to `en` (lingua franca;
  `routing.defaultLocale = UI_DEFAULT_LOCALE`).
- **Q2: Localise the under-construction page?** No — temporary state, not worth 11× translation
  work. (Page itself has since been deleted; gate is gone.)
- **Q3: Singleton id strategy.** Symmetric `{type}-{locale}` for every locale.
- **Q4: Date formatting.** `next-intl`'s `useFormatter().dateTime()` driven by visitor locale.
- **Q5: Studio editor language.** English chrome regardless of doc language. Keeps editor experience
  consistent.
- **Q6: Cost cap on `/api/translate`.** Soft logging only initially. Token usage captured via
  `translator:usage` SSE events. Revisit if monthly costs surprise.
- **Q7: Glossary location.** `settings` singleton. Promote to a doc type if list ever grows past ~50
  entries.
- **Q8: `settings` title/description/OG image locale-aware?** Yes — `settings` goes through the same
  document-per-locale flow as every other singleton.
- **Q9: Hreflang.** Emitted on every page (next-intl middleware) and in `app/sitemap.ts` per-locale.
- **Q11: `score.work` field.** Kept in original. Cataloguing convention; avoids muddling search.
  Promote to `internationalizedArrayString` later if overrides ever needed (additive change).

## Out of scope

- Arabic / RTL support — revisit when adding the locale; root layout will need `dir="rtl"`
  conditional.
- Per-locale draft/publish workflow refinements beyond what `documentInternationalization` ships.
- AI-driven UI string suggestions in Studio.
- Translation memory / TM database — diff-aware update covers 95 % of the value.
- Per-document glossary overrides (global only for now).
- Fall-back chain (`coalesce(en, nl)` etc.) — every locale is fully populated by the action; missing
  locale = bug, not a fallback case.
- AMP / RSS per locale.
