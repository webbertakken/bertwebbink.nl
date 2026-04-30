# Caching strategy

How the public site stays cheap and fast on Vercel: ISR for everything that can be static, on-demand
cache invalidation when an editor publishes, dynamic rendering only where genuinely required.

## Why this shape

`next-sanity/live`'s `sanityFetch` calls `await draftMode()` and `await cookies()` internally on
every invocation. In Next 15+/16 those are "hard" dynamic-rendering signals — any page that calls
`sanityFetch` is opted into per-request server rendering by default, regardless of `revalidate`.

We override that with `export const dynamic = 'force-static'` plus `export const revalidate = 3600`
on the public landing pages, so:

- Pages render at build time (Sanity returns published content; `draftMode()` is `false` in the
  static-generation context).
- Vercel CDN caches the resulting HTML with a 1 h ISR window and a 1 y expiry.
- When an editor enables draft-mode preview (Presentation tool / Visual Editing), Vercel's
  draft-mode bypass kicks in — the request is rendered dynamically with the editor's draft data. No
  special handling needed.
- Anonymous traffic always hits cached HTML. Zero serverless function invocations on idle pages.

The 1 h window is a safety net, not the freshness mechanism. Real freshness comes from on-demand
`revalidateTag` calls fired the moment an editor publishes.

## Routes and rendering modes

| Route                         | Mode                         | Notes                                                  |
| ----------------------------- | ---------------------------- | ------------------------------------------------------ |
| `/[locale]`                   | Static (1 h ISR, 1 y expire) | `force-static` + `revalidate`                          |
| `/[locale]/about`             | Static (1 h ISR, 1 y expire) | "                                                      |
| `/[locale]/elsewhere`         | Static (1 h ISR, 1 y expire) | "                                                      |
| `/[locale]/privacy`           | Static (1 h ISR, 1 y expire) | "                                                      |
| `/[locale]/scores`            | Static (1 h ISR, 1 y expire) | "                                                      |
| `/[locale]/journal/[slug]`    | Static (per slug)            | `generateStaticParams`                                 |
| `/[locale]/organs/[slug]`     | Static (per slug)            | `generateStaticParams`                                 |
| `/[locale]/organs`            | **Dynamic**                  | Reads `searchParams.city` for filter UI                |
| `/[locale]/search`            | **Dynamic**                  | Reads `searchParams.q`                                 |
| `/[locale]/(site)/layout.tsx` | Static (1 h ISR)             | Nav + footer Sanity fetches need a `revalidate` window |

Routes marked **Dynamic** are intentional — `searchParams` is a legitimate dynamic input. Converting
them to ISR would require client-side filtering over a static base list, which is a UX/architecture
call, not a caching one.

## Cache tags

`next-sanity/live`'s `sanityFetch` automatically attaches per-document tags of the form
`sanity:<docId>` to every fetch. When a query touches several documents (e.g. a journal listing),
every involved document id gets a tag. Calling `revalidateTag('sanity:<docId>')` therefore busts
every Vercel ISR cache entry whose underlying GROQ touched that document — surgical and free of
manual tag bookkeeping.

The lib also attaches a coarse `sanity` tag to every fetch as a fallback "bust everything
Sanity-backed" lever. We don't use it; per-doc is enough.

## Invalidation paths

There are two places content changes happen, and each has its own invalidation hook.

### 1. Single-document Publish (Studio UI)

Editors publishing a single document via the standard Sanity Studio Publish button (or the relabeled
"Publish only this language" fallback for translatable types) trigger a Studio-side document action
wrapper.

- **Wrapper:** `sanity/actions/withRevalidate.tsx` → `withRevalidatePublish`
- **Wired in:** `sanity.config.ts` `document.actions` callback, applied to every action whose
  `action === 'publish'` for every doc type.
- **Flow:**
  1. Editor clicks Publish.
  2. Inner publish action runs (writes draft → published in Sanity).
  3. Wrapper polls `*[_id == $id][0]._rev` until it differs from the rev captured before the click
     (or 10 s timeout).
  4. Wrapper POSTs `{ docIds: [id] }` to `/api/revalidate` with the editor's Studio session token as
     a Bearer header.
  5. `/api/revalidate` validates the token against `https://api.sanity.io/v1/users/me`, then calls
     `revalidateTag('sanity:<id>', 'default')`.

Failures are silent: a `console.warn` is emitted, but neither the editor's UI nor the publish itself
is interrupted. Worst case is the page stays cached for up to the 1 h ISR window.

### 2. "Publish to all locales" (translatable docs)

The primary editor action for translatable types (`journal`, `organ`, page singletons) is "Publish
(auto-translated)" — `publishAllLocalesAction` — which POSTs to `/api/publish-all`. That route runs
server-side in our Next.js process, so it can call `revalidateTag` directly without any HTTP
roundtrip.

- **Route:** `app/api/publish-all/route.ts`
- **When tags are revalidated:**
  - `sanity:<sourceDocId>` after the source draft commits successfully. (Skipped when the source was
    already published — nothing changed.)
  - `sanity:<siblingDocId>` after each translated sibling's commit succeeds, only when the
    per-locale translation status was `ok` and `autoPublishTranslations` is on.
  - No tag is revalidated for siblings whose translation `failed` or was `skipped`, or whose publish
    step threw, or which are kept as drafts.

This means a single "Publish to all locales" click ends up busting up to 11 tags (source + 10
translated siblings) in one go. Cache pressure is proportional only to actual content change.

## Auth model

Both `/api/publish-all` and `/api/revalidate` use the same auth pattern: the editor's Sanity bearer
token is forwarded in `Authorization: Bearer ...` and validated by hitting Sanity's `/v1/users/me`.
Any logged-in Studio user can trigger either endpoint; anonymous traffic gets a 401.

This sidesteps Sanity's webhook system entirely — we stay on the free plan, no shared-secret env
vars to manage, no webhook configuration to drift.

## Migration scripts

The standalone scripts in `scripts/` (e.g. `migrate-add-language.ts`, `translate-content.ts`,
`cleanup-pre-i18n.ts`) run as plain Node processes outside Next.js. They cannot import
`revalidateTag` directly. If a script makes large content changes that need to surface immediately,
the script should `fetch('https://<deployment>/api/revalidate', ...)` at the end with a bearer
token. In practice, migrations run rarely and an editor manually clicking Publish on any document is
enough to trigger surgical revalidation afterwards.

## Debugging

### "Why is this page still showing old content?"

1. Check the `x-vercel-cache` response header in the browser devtools Network tab.
   - `HIT` — served from Vercel CDN cache. Triggering a publish should have busted this; see step 2.
   - `STALE` — served from cache, background regeneration in flight. Refresh in a few seconds.
   - `MISS` / `BYPASS` — fresh render. If the content is still old, the Sanity data layer cached it;
     see step 3.
   - `REVALIDATED` — explicit on-demand revalidation just landed.
2. Check Vercel function logs around the publish time:
   - `withRevalidatePublish` posts to `/api/revalidate`. Did it run?
   - `/api/revalidate` should log nothing on success but returns `{ revalidated: ['sanity:<id>'] }`
     in the response body.
3. Manually trigger a revalidation:
   ```sh
   curl -X POST https://<deployment>/api/revalidate \
     -H "Authorization: Bearer <your-sanity-personal-token>" \
     -H "Content-Type: application/json" \
     -d '{"docIds": ["<doc-id>"]}'
   ```

### "Editor preview shows stale content"

Draft-mode preview should always render dynamically — Vercel's draft-mode cookie bypasses the static
cache. If preview is stuck, check that `/api/draft-mode/enable` was hit (sets the cookie) and that
the editor is viewing the deployment URL with the cookie present.

### "I published and nothing changed for 1 hour"

That means the Studio document action wrapper didn't fire (or the `/api/revalidate` call failed).
The 1 h ISR window then becomes the fallback freshness mechanism. Open the browser console while
publishing to see if `withRevalidatePublish` warned about a missing token, a `_rev` timeout, or a
network error.

## When to revisit

- If Vercel function-invocation costs creep up: check whether a new page was added without
  `dynamic = 'force-static'` + `revalidate`. Run `yarn build` and confirm the route table shows `●`
  for it.
- If editors complain about staleness: lower the ISR window from 3600 to, say, 600. Don't go below
  60 — at that point you're paying for regeneration on every visit anyway.
- If Sanity's CDN sync-tags ever change semantics: re-verify per-doc invalidation is still surgical.
  The current behaviour relies on `next-sanity/live`'s `sanity:<id>` tags propagating through
  reference graphs.

## Files

- `app/[locale]/(site)/page.tsx` — homepage / journal listing (static)
- `app/[locale]/(site)/about/page.tsx` — static
- `app/[locale]/(site)/elsewhere/page.tsx` — static
- `app/[locale]/(site)/privacy/page.tsx` — static
- `app/[locale]/(site)/scores/page.tsx` — static
- `app/[locale]/(site)/layout.tsx` — `revalidate` for nav/footer
- `app/api/revalidate/route.ts` — on-demand cache invalidation endpoint
- `app/api/publish-all/route.ts` — multi-locale publish + inline revalidation
- `sanity/actions/withRevalidate.tsx` — Studio document action wrapper
- `sanity.config.ts` — wires the wrapper into every doc type's publish action
