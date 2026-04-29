# Upgrades

Second plan in the sequence. Runs **after** `plans/cleanup-pre-i18n.md` (data hygiene) and
**before** `plans/translations.md` (i18n work). Brings the toolchain up to date so the i18n work
happens on a modern, supported stack.

## Why this exists separately

- `@sanity/document-internationalization@6.x` declares `"sanity": "^5"` as a peer dep. We're on
  `sanity@3.91.0`. The plugin literally won't install until we upgrade.
- `next-sanity@12` declares `"next": "^16.0.0-0"`.
- Three Sanity majors and three `next-sanity` majors of breaking changes between us and the latest.
- Mixing this with the i18n migration would make every bug ambiguous ("upgrade or i18n?").

## Target end state

| Tool / package                          | Current  | Target                          | Notes                                       |
| --------------------------------------- | -------- | ------------------------------- | ------------------------------------------- |
| `next`                                  | 15.5.15  | `^16.2.4`                       | Current latest                              |
| `react`, `react-dom`                    | ^19.0.0  | `^19.2.5`                       | Required by Sanity 5 + `next-sanity@12`     |
| `@types/react`, `@types/react-dom`      | ^18.3.x  | `^19.x`                         | Currently mismatched against React 19       |
| `sanity`                                | 3.91.0   | `^5.22.0`                       | Two majors                                  |
| `@sanity/vision`                        | 3.91.0   | `^5.22.0`                       | Tracks `sanity`                             |
| `next-sanity`                           | 9.8.42   | `^12.3.1`                       | Three majors; needs Next 16                 |
| `@sanity/client`                        | 7.4.0    | `^7.22.0`                       | Minor                                       |
| `@sanity/icons`                         | 3.7.0    | `^3.7.4`                        | Patch                                       |
| `@sanity/image-url`                     | 1.1.0    | `^2.1.1`                        | One major                                   |
| `@sanity/uuid`                          | 3.0.2    | `^3.0.2`                        | Already current                             |
| `@sanity/types` (new)                   | —        | `^5.22.0`                       | For type-only consumers                     |
| `sanity-plugin-asset-source-unsplash`   | 3.0.3    | `^7.0.5`                        | Four majors                                 |
| `sanity-plugin-media`                   | 3.0.3    | `^4.2.0`                        | One major                                   |
| `@sanity/assist`                        | 4.2.0    | **removed**                     | Done in `plans/translations.md` Track C     |
| `typescript` (`tsc`)                    | 5.8.3    | `^5.9.x` (kept as fallback)     | Stays installed for IDE/library type-checks |
| `@typescript/native-preview` (`tsgo`)   | —        | `^7.0.0-dev.20260425.1` (or newer) | New: 10× faster typecheck in CI/local       |
| `oxlint`                                | —        | `^1.62.0`                       | Replaces ESLint                             |
| `eslint`, `eslint-config-next`          | 8.57.x   | **removed**                     |                                             |
| Node                                    | 24.1.0   | keep                            | Volta-pinned                                |

## Reference target

`~/Repositories/wordpress-to-sanity-migrator` already runs on this exact stack (Next 16, React 19.2,
oxlint, tsgo, `@sanity/client` 7.22, `@sanity/types` 5.22). Where in doubt, copy its config (lint
runner, tsconfig flags, oxlintrc).

## Sanity major-version highlights

Read the full changelogs before each phase. Headlines from the skill (`sanity-best-practices`) +
release notes:

- **3.x → 4 (Jul 2025)**
  - Strict schema validation tightened; some previously-lenient definitions error out
  - Studio chrome refactor; some custom layout APIs renamed
  - Plugin API surface trimmed; older plugin versions stop loading
- **4 → 5 (Dec 2025)**
  - App SDK direction: Studio is now one of multiple "apps" in Sanity's runtime
  - Live Content API revised; `next-sanity` 11/12 follows
  - Peer-deps tightened to React 19.2 + styled-components 6.1.15
  - Presentation Tool config shape changed in places
- **`next-sanity` 9 → 10 → 11 → 12**
  - 10: split server/client entrypoints; draft-mode helpers reshuffled
  - 11: aligned to Sanity 5; Live Content public API stabilised
  - 12: requires Next 16

## Order of operations

Sequenced to keep each PR small and reversible. Each numbered phase = one PR.

### Phase 0 — branch + baseline

- [ ] Create branch `chore/upgrade-stack` off `main`
- [ ] Snapshot `yarn why` for every package in the table above (so we can compare resolutions later)
- [ ] Run `yarn build`, `yarn check-types`, `yarn test`, `yarn dev` once and confirm clean baseline
- [ ] Confirm visual: `/`, `/organs`, `/organs/[slug]`, `/journal/[slug]`, `/about`, `/elsewhere`,
      `/scores`, `/privacy`, `/admin` — manual smoke (screenshot each)
- [ ] Confirm Studio: opens, `presentation` works, `vision` works, draft mode toggle works

### Phase 1 — React 19.0 → 19.2 + matching types

Low-risk minor bump, prerequisite for everything below.

- [ ] `yarn up react@^19.2.5 react-dom@^19.2.5`
- [ ] `yarn up -D @types/react@^19 @types/react-dom@^19`
- [ ] `yarn check-types`
- [ ] `yarn test`
- [ ] Smoke /admin + public site
- [ ] Commit

### Phase 2 — Next 15 → 16

Big bump, but isolated from Sanity by being its own PR.

- [ ] Read Next 16 upgrade guide; note breaking changes (most relevant for this repo: middleware
      runtime defaults, `next/font` updates, server actions tightening)
- [ ] `yarn up next@^16.2.4 eslint-config-next@^16.x` (eslint-config still pinned for now; replaced
      in Phase 7)
- [ ] Run `npx @next/codemod@latest` for any auto-applicable codemods
- [ ] Verify `next.config.ts` against new schema
- [ ] Verify `middleware.ts` (under-construction gate) still functions identically
- [ ] Verify `app/(site)/...` server components still render
- [ ] Verify `app/llms.txt` and `app/sitemap.ts` and `app/robots.ts` routes
- [ ] `yarn build` clean
- [ ] Smoke pages + /admin
- [ ] Commit

### Phase 3 — Sanity 3 → 4

Intermediate stop. Avoid jumping straight to 5 in case a 4-only deprecation is easier to fix in
isolation.

- [ ] Read Sanity 4 release notes
- [ ] `yarn up sanity@^4 @sanity/vision@^4`
- [ ] `yarn up @sanity/client@^7.22 @sanity/icons@^3.7.4 @sanity/image-url@^2`
- [ ] `yarn up sanity-plugin-asset-source-unsplash@^7 sanity-plugin-media@^4`
- [ ] Run `yarn typegen` and `yarn extract-types` — confirm output unchanged in schema, diff
      surface checked
- [ ] Open `/admin` — confirm Studio loads, no console errors
- [ ] Confirm: structure, document list, opening a journal post, opening an organ post, presentation
      tool preview, draft-mode toggle
- [ ] Fix any Studio API breakages (likely: small import path changes, deprecated component renames)
- [ ] Commit

### Phase 4 — Sanity 4 → 5 + `@sanity/types` + `next-sanity` 9 → 11.5

Big phase. Group together because `next-sanity` 11+ requires Sanity 5.

- [ ] Read Sanity 5 release notes thoroughly (App SDK, Live Content changes)
- [ ] Read `next-sanity` 10 → 11 migration notes
- [ ] `yarn up sanity@^5.22 @sanity/vision@^5.22`
- [ ] `yarn add @sanity/types@^5.22`
- [ ] `yarn up next-sanity@^11.5` (sticks with Next 16-compatible 11.5 first; bump to 12 in
      Phase 5 once stable)
- [ ] Update `sanity.config.ts` for any Presentation Tool config shape changes
- [ ] Update `sanity/lib/live.ts` if Live Content API shape changed
- [ ] Update `sanity/lib/queries.ts` if `defineQuery` import path moved
- [ ] Update `app/api/draft-mode/enable/route.ts` if helper signature changed
- [ ] Run `yarn typegen` and confirm `sanity.types.ts` regenerates cleanly
- [ ] Open `/admin` — full Studio smoke
- [ ] Open public site — every route
- [ ] Confirm Visual Editing overlay still works on `/`, `/organs/[slug]`, `/journal/[slug]`
- [ ] Commit

### Phase 5 — `next-sanity` 11.5 → 12

Final `next-sanity` bump, runs only after everything above is green.

- [ ] `yarn up next-sanity@^12.3.1`
- [ ] Re-verify draft mode + Live Content + Presentation Tool
- [ ] `yarn build` clean
- [ ] Commit

### Phase 6 — TypeScript native (tsgo)

Add `tsgo` as primary type-checker, keep `tsc` as fallback.

- [ ] `yarn add -D @typescript/native-preview`
- [ ] Replace `package.json` script: `"check-types": "tsgo --noEmit"`
- [ ] Add `"check-types:tsc": "tsc --noEmit"` as documented fallback
- [ ] Run `yarn check-types` — fix any issues `tsgo` catches that `tsc` missed (or vice versa)
- [ ] Update CI workflow (if applicable) to use `tsgo`
- [ ] Document in `AGENTS.md` (already added) and `DEVELOPMENT.md`
- [ ] Commit

### Phase 7 — oxlint replaces ESLint

Mirror the migrator's `scripts/lint.mjs` runner pattern (it works around the gitignore-chase issue).

- [ ] `yarn remove eslint eslint-config-next`
- [ ] Delete `.eslintrc`, `.eslintignore`
- [ ] `yarn add -D oxlint`
- [ ] Copy `.oxlintrc.json` from migrator and adjust plugins/rules for this repo
- [ ] Copy `scripts/lint.mjs` from migrator (keep gitignore workaround documented at the top)
- [ ] Update `package.json` script: `"lint": "node scripts/lint.mjs"`
- [ ] Add lint-staged config from migrator if husky is wanted (out of scope unless asked)
- [ ] Run `yarn lint` — fix what surfaces (oxlint is stricter than `next lint` in places)
- [ ] Verify `next build` still emits no eslint warnings (Next 16 will skip eslint when not
      configured)
- [ ] Commit

### Phase 8 — verification

- [ ] `yarn build` clean
- [ ] `yarn check-types` clean (under tsgo)
- [ ] `yarn lint` clean (under oxlint)
- [ ] `yarn test` clean
- [ ] Manual smoke of every public route, in light + dark, in two browsers
- [ ] Manual smoke of `/admin` — open + edit a journal doc, open + edit an organ doc, presentation
      tool preview, draft mode toggle
- [ ] Open a Sanity Vision query — confirm GROQ still works
- [ ] Confirm `sanity.types.ts` is byte-stable across re-runs of `yarn typegen`
- [ ] Run `yarn dlx publint` (or similar) on the project to surface any new peer warnings — none
      expected
- [ ] Compare bundle size before/after (informational)

### Phase 9 — merge + tag

- [ ] Open PR; CI green
- [ ] Self-review against `plans/upgrades.md` checkboxes — every box ticked
- [ ] Squash-merge to `main`
- [ ] Tag `pre-i18n` (or similar) for rollback safety
- [ ] Begin `plans/translations.md` Phase 1

## Risk register

| Risk                                                    | Mitigation                                                          |
| ------------------------------------------------------- | ------------------------------------------------------------------- |
| Sanity 5 Studio chrome breaks custom `StudioLayout.tsx` | Re-write against new layout API; the file is small                  |
| Presentation Tool route resolvers change shape          | Update `sanity.config.ts` `mainDocuments` per release notes         |
| `next-sanity` 12's draft-mode helper signature changes  | Trial-fix in feature branch; revert to 11.5 if blocking             |
| Plugin (`media`, `unsplash`) APIs changed               | Plugin configs are tiny; rewrite is cheap                           |
| `tsgo` catches new errors `tsc` missed                  | Fix or temporarily ignore via `// @ts-expect-error` with TODO       |
| oxlint reports issues `eslint-config-next` allowed      | Auto-fix where possible; for the rest, fix or rule-disable per file |
| Visual Editing overlay regressions                      | Manual smoke before merge                                           |
| React 19.2 SSR hydration regressions in Sanity Studio   | Catch in Phase 1 before further bumps                               |

## Out of scope (explicit)

- Replacing styled-components with anything else (Sanity 5 still uses it)
- Tailwind v4 changes (already on Tailwind 4)
- Vercel platform changes
- Changing the Volta-pinned Node version
- Replacing yarn 4
- Anything translation-related — that's `plans/translations.md`

## Done means

- [ ] All packages match the target table
- [ ] All scripts (`build`, `check-types`, `lint`, `test`, `dev`, `start`, `typegen`,
      `extract-types`) pass
- [ ] `/admin` and the public site behave identically to before the upgrade
- [ ] No new console warnings or peer-dep warnings
- [ ] PR merged, tag created
- [ ] `plans/translations.md` Phase 1 unblocked
