# Caching strategy

Goal: stop running a serverless function for every visit to the public site. Pages
should be edge-cached HTML by default, regenerated only when content actually
changes.

## Context

Current state (as of `next build` after PR #28):

| Route | Status |
|---|---|
| `/[locale]/journal/[slug]` | static (has `generateStaticParams`) |
| `/[locale]/organs/[slug]` | static (has `generateStaticParams`) |
| `/[locale]` (home) | dynamic — Sanity-backed, no `revalidate` |
| `/[locale]/about` | dynamic |
| `/[locale]/elsewhere` | dynamic |
| `/[locale]/privacy` | dynamic |
| `/[locale]/scores` | dynamic |
| `/[locale]/organs` | dynamic — uses `searchParams` (legitimate) |
| `/[locale]/search` | dynamic — uses `searchParams` (legitimate) |

Root cause: `next-sanity/live`'s `sanityFetch` calls `await draftMode()` and
`await cookies()` internally. Every page using it is opted into dynamic rendering
unless it carries `generateStaticParams` or `export const revalidate = N`.

Strategy: ISR with a long time-window safety net (1 hour) plus on-demand
invalidation via `revalidateTag` triggered by:

1. The existing `/api/publish-all` route, for the "Publish to all locales" flow
   (translatable docs — primary editor action).
2. A new `/api/revalidate` route, called from a Studio action that wraps the
   built-in single-locale Publish, for fallback / non-translatable docs.

Both paths use the editor's Sanity bearer token (same auth pattern as
`/api/publish-all`) — no Sanity webhook, free plan stays free.

`next-sanity/live` already attaches `sanity:*` cache tags to every fetch, so
`revalidateTag('sanity:<docId>')` busts surgically without extra plumbing.

## Tasks

### 1. Add ISR window to the 5 statically-named public pages

Default time-window of 3600 s (1 h). Acts as a safety net; the webhook/action
provides instant freshness on actual edits.

- [x] Add `export const revalidate = 3600` to `app/[locale]/(site)/page.tsx`.
- [x] Add `export const revalidate = 3600` to `app/[locale]/(site)/about/page.tsx`.
- [x] Add `export const revalidate = 3600` to `app/[locale]/(site)/elsewhere/page.tsx`.
- [x] Add `export const revalidate = 3600` to `app/[locale]/(site)/privacy/page.tsx`.
- [x] Add `export const revalidate = 3600` to `app/[locale]/(site)/scores/page.tsx`.
- [x] Run `yarn build` and confirm those 5 routes flip from `ƒ` to `●` (or
      `◐`/ISR equivalent) in the route table.
- [x] Leave `organs` and `search` dynamic — `searchParams` use is legitimate.

### 2. New `/api/revalidate` route

Lightweight endpoint callable from the Studio (and optionally migration scripts)
to bust ISR cache for one or more documents. Reuses the bearer-token auth pattern
from `/api/publish-all`.

- [x] **Failing test first** — write `app/api/revalidate/route.spec.ts` covering:
  - 401 when `Authorization` header is missing.
  - 401 when bearer token fails Sanity user check (`/v1/users/me` returns non-2xx).
  - 400 when body has no `docIds` array or empty array.
  - 200 + calls `revalidateTag('sanity:<id>')` exactly once per id when valid.
  - Mock `next/cache`'s `revalidateTag` and `fetch` for the user-check.
- [x] Implement `app/api/revalidate/route.ts`:
  - `POST` only, JSON body `{ docIds: string[] }`.
  - Auth: `Bearer <sanity-user-token>`, validated via `https://api.sanity.io/v1/users/me`
        (extract the helper from `publish-all` if it grows worth sharing — otherwise
        copy and accept the duplication, keep it simple).
  - For each id, call `revalidateTag(\`sanity:${id}\`)` from `next/cache`.
  - Return `{ revalidated: string[] }`.
- [x] All `revalidate` route tests green.

### 3. Bust cache from `/api/publish-all`

The translation-publish flow already runs server-side in our Next.js process —
no HTTP needed, just call `revalidateTag` directly after each successful commit.

- [x] **Failing test first** — add `app/api/publish-all/route.spec.ts` covering:
  - `revalidateTag('sanity:<sourceDocId>')` is called exactly once after the
        source document publishes successfully.
  - `revalidateTag('sanity:<siblingDocId>')` is called once per locale that
        publishes successfully.
  - No `revalidateTag` call for siblings whose translation `status` is `failed`
        or `skipped`, or whose publish step throws.
  - When `autoPublishTranslations` is `false`, no sibling `revalidateTag` calls
        (drafts only).
  - Mock the Sanity client, the translator, and `revalidateTag`.
- [x] Add `revalidateTag(\`sanity:${docId}\`)` after `commitDraft` for the source.
- [x] Add `revalidateTag(\`sanity:${r.docId}\`)` inside the sibling loop after a
      successful `commitDraft`, only when `r.status` was `ok` and `autoPublish`
      is true.
- [x] All publish-all tests green.

### 4. Studio document action: wrap Publish to fire revalidation

Wraps the built-in `publish` action for **all** doc types so that publishing a
single document from the Studio busts ISR cache for that document. The wrapper
detects publish completion by watching for `published._rev` to change, with a
10 s timeout fallback.

For translatable types this stacks on top of `relabelSingleLocalePublish` so the
fallback single-locale Publish still bears the warning label.

- [x] **Failing test first** — `sanity/actions/withRevalidate.spec.tsx` covering:
  - Wrapper preserves the original action's identifier (`action` field) and
        passes through `label`/`title` from the inner action.
  - When `onHandle` is invoked, the inner action's `onHandle` is called.
  - After the wrapped action's `onHandle` resolves and the document's `_rev`
        changes, `fetch('/api/revalidate', ...)` is called with the doc id and
        the editor's bearer token.
  - If `_rev` doesn't change within the timeout, no revalidation is fired and
        the wrapper logs (no throw — silent timeout).
  - Mock `useClient`, `fetch`, and the inner action.
- [x] Implement `sanity/actions/withRevalidate.tsx`:
  - Function: `withRevalidatePublish(original: DocumentActionComponent): DocumentActionComponent`.
  - Inside the wrapper: capture initial `published?._rev`, delegate to original
        `onHandle`, then poll `client.observable.listen` (or `client.fetch` with
        a small interval) until `_rev` changes or 10 s elapses.
  - On change: `fetch('/api/revalidate', { method: 'POST', headers: { Authorization: \`Bearer ${token}\` }, body: JSON.stringify({ docIds: [id] }) })`.
  - On timeout: `console.warn` and stop. No user-visible error — failure mode is
        "next visitor waits up to 1 h" which is the ISR safety net.
- [x] Wire it into `sanity.config.ts`'s `document.actions` callback:
  - For translatable types: `withRevalidatePublish(relabelSingleLocalePublish(action))`.
  - For all other types: `withRevalidatePublish(action)`.
  - Apply only to actions whose `action === 'publish'`.
- [x] All `withRevalidate` tests green.

### 5. Verify end-to-end

- [x] `yarn lint` clean.
- [x] `yarn check-types` clean.
- [x] `yarn test` clean (all 436+ tests, plus new tests from steps 2–4).
- [x] `yarn build` shows the 5 ISR routes as static, build succeeds, no warnings
      about dynamic API misuse.
- [x] (best-effort manual sanity check, post-deploy): hit a public page twice
      and confirm second response is edge-cached (`x-vercel-cache: HIT`).

### 6. Document and remove the plan

- [x] Write `docs/caching-strategy.md` describing the **implemented** strategy:
  - Summary of why ISR + on-demand invalidation was chosen.
  - The two invalidation paths (publish-all direct, single-doc via Studio action
        → `/api/revalidate`).
  - The 1 h safety net and what it protects against.
  - How to debug a stale page (`x-vercel-cache` header, manual revalidate via
        `/api/revalidate`).
  - List of currently-dynamic routes and why (`searchParams` use).
  - Pointer from project `AGENTS.md` to this doc.
- [x] Add `@docs/caching-strategy.md` reference to project `AGENTS.md` under a
      relevant section (e.g. a new "Caching" entry, or under Tooling).
- [x] Delete `plans/caching-strategy.md`.

## Open questions

None blocking. Defaults chosen:

- ISR window: **3600 s** (1 h). Easy to bump up later if Vercel bill / freshness
  shifts the trade-off.
- Tag granularity: **`sanity:<docId>`** only. Coarser `sanity` tag exists but
  per-doc is more surgical and the lib already attaches per-doc tags.
- Auth: **bearer token via Sanity user check**. Same pattern as `publish-all`,
  no shared-secret env var to manage.
