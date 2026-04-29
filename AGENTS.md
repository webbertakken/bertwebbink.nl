# bertwebbink.nl

## Tooling

- Linter: **oxlint** (not ESLint). Config in `.oxlintrc.json`.
- Type checker: **tsgo** (`@typescript/native-preview`) where supported, plus `tsc` as fallback.
- Package manager: yarn 4.
- Plans for major work live under `plans/*.md` (one file per concern). OpenSpec is **not** used on
  this project. Order of execution: `cleanup-pre-i18n.md` → `upgrades.md` → `translations.md`.
- Sanity migration scripts that change a `_type` (rename, schema migration) **must** iterate both
  the published doc and any `drafts.*` sibling, or emit an explicit list of stale drafts left
  behind. Backfilling published‑only leaves ghost drafts in dead schema types (lesson from PR #12).
- Sanity development guidance: see `.pi/skills/sanity-best-practices/` (mirrored to
  `.claude/skills/` and `.agents/skills/`). The `localization.md`, `schema.md`, `groq.md`,
  `nextjs.md`, `migration.md`, `typegen.md`, and `visual-editing.md` references are the most
  relevant for the translations work.

## Translations

- Source language for **content** (Sanity documents — `journal`, `organ`, page singletons, etc.) is
  **Dutch (nl)**. All other locales are translations of the Dutch source.
- Source language for **code, UI strings, schema labels, design copy, and comments** is **English
  (en)**. Dutch is a translation of the English source for these.
- Supported locales (11): `nl`, `en`, `de`, `fr`, `es`, `it`, `pt`, `hi`, `ja`, `zh`, `ko`.
- URL strategy: **prefix every route** with the locale (`/nl/...`, `/en/...`, etc.). No "default
  locale without prefix" exception.
- Language picker: top-right of the nav, **endonyms only** (no flags). Auto-detect from
  `Accept-Language` on first visit, persist user override in a cookie.
- Translations of Sanity content are produced by a **"Translate to all locales" action** that calls
  a project-owned API route. Editors author in Dutch and trigger translation; manual post-edit of
  any locale must be supported.
- The translation mechanism must support **incremental re-translation**: when the Dutch source
  changes, the action updates existing translations using the previous source + previous translation
  as context, not a full overwrite.
- Publish flow: existing **Publish** stays per-locale (publishes only the current doc). A separate
  **"Publish to all locales"** action does: validate source → publish source → translate
  stale/missing siblings (diff-aware) → publish each translated sibling. Translated siblings are
  **auto-published** by default; a config flag exists to flip to drafts-only without code changes.
- LLM provider for translations: **Google Gemini 2.5 Flash** by default, behind a `Translator`
  interface with `GeminiTranslator`, `AnthropicTranslator`, and `OpenAITranslator` implementations.
  Provider chosen via `TRANSLATOR_PROVIDER` env var (default `gemini`); model overridable via
  `GEMINI_MODEL`. Never default to Pro — Flash is ~33× cheaper on output tokens and quality is
  fine for our shape of work. Gemini via Google AI Studio key; Anthropic via API key (no
  subscription path); OpenAI via API key.
- Sanity content model: **document‑per‑locale** (`@sanity/document-internationalization`) for
  `journal`, `organ`, and every singleton. **Field‑level** (`sanity-plugin-internationalized-array`)
  for `score` only.
- Locale list: code constant in `core/i18n/locales.ts`. No `locale` document type in Sanity. Both
  Sanity i18n plugins receive their language list derived from this constant.
- Singleton id pattern: symmetric `{type}-{locale}` for every locale (e.g. `about-nl`, `about-en`).
  No "default without suffix" exception.
