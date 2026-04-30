# Upgrade deferrals

Active version pins and the upstream conditions that need to change before they can be lifted.
Delete entries from this file the moment they're resolved.

## `next-sanity` pinned at `^11.5`

**Resolves to:** `11.6.13` at time of pin.

**Why pinned:** `next-sanity@12.3.1` + `next@16.2.4` + Turbopack fails to compile any `/api` route
that uses `defineEnableDraftMode`. Turbopack tries to resolve
`next/dist/server/route-modules/app-route/vendored/contexts/app-router-context.js`, which doesn't
exist in Next 16 — the file is under `app-page`, not `app-route`.

The workaround `serverExternalPackages: ['next-sanity']` fixes the route compile but breaks the
Studio import (`next-sanity/studio` is a client component; making the package server-external
prevents the client bundle from picking it up).

**Revisit when:**

- `next-sanity@13` ships, or
- a 12.x patch lands that fixes the Turbopack path mismatch.

**How to retry:**

```sh
yarn up next-sanity@latest
yarn build   # fails immediately if the bug persists
```

If it builds: re-verify draft mode, Live Content updates, and the Presentation Tool, then delete
this entry.
