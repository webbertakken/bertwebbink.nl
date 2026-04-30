# bertwebbink.nl

## Tooling

- Linter: **oxlint** (not ESLint). Config in `.oxlintrc.json`.
- Type checker: **tsgo** (`@typescript/native-preview`) where supported, plus `tsc` as fallback.
- Package manager: yarn 4.
- OpenSpec is **not** used on this project. Plans (when one is needed) live as a single checkboxed
  markdown file under `plans/*.md`.
- Sanity migration scripts that change a `_type` (rename, schema migration) **must** iterate both
  the published doc and any `drafts.*` sibling, or emit an explicit list of stale drafts left
  behind. Backfilling published-only leaves ghost drafts in dead schema types (lesson from PR #12).
- Sanity development guidance: see `.pi/skills/sanity-best-practices/` (mirrored to
  `.claude/skills/` and `.agents/skills/`). The `localization.md`, `schema.md`, `groq.md`,
  `nextjs.md`, `migration.md`, `typegen.md`, and `visual-editing.md` references are the most
  relevant for the translations work.

## Caching

- ISR + on-demand `revalidateTag` invalidation. See @docs/architecture/caching-strategy.md.

## Search

- Sanity-backed (`sanityFetch`), GROQ `match` with `score()` boosting. No second index. See
  @docs/architecture/search.md.

## Translations

- **Content** source language is **Dutch (`nl`)**. **Code, UI strings, schema labels, design copy,
  and comments** source language is **English (`en`)**.
- 11 locales: `nl`, `en`, `de`, `fr`, `es`, `it`, `pt`, `hi`, `ja`, `zh`, `ko`. URL strategy:
  **prefix every route** with the locale; no "default locale without prefix" exception.
- Locale list: code constant in `core/i18n/locales.ts`. No `locale` document type in Sanity.
- Sanity content model: **document-per-locale** (`@sanity/document-internationalization`) for
  `journal`, `organ`, and every singleton; **field-level** (`sanity-plugin-internationalized-array`)
  for `score` only.
- Singleton id pattern: symmetric `{type}-{locale}` for every locale (`about-nl`, `about-en`, etc.).
  No "default without suffix" exception.
- Pipeline architecture, walker contract, LLM provider config, cost, and resolved design questions:
  see @docs/architecture/translations.md.

## Decisions and deferrals

- @docs/decisions/upgrade-deferrals.md — active version pins and revisit triggers.
