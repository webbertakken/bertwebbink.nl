# Known issues

Issues that were surfaced during the translations rollout but are
intentionally left as-is. Each entry states the symptom, the cause,
and the fix path if/when the time comes.

## Slug collisions on translation

24 (locale, slug) pairs share a URL because two distinct Dutch source
docs translate to the same target-language title. Examples:

- `Daarle Hervormde kerk` + `Daarle Gereformeerde kerk` → both
  `/{locale}/organs/daarle-reformed-church` in EN, DE, FR, ES, IT, PT,
  HI, JA, ZH, KO
- `Apeldoorn Grote Kerk` (× 2 distinct nl docs) → both
  `/{locale}/organs/apeldoorn-grote-kerk`
- ~22 others, mostly journal entries with generic titles like "Sound
  recordings"

The slug-uniqueness logic in `core/translator/slug.ts` (`-2`, `-3`, …
suffixes) is in place for **future** translations but doesn't
retroactively rewrite already-stored slugs. Triggered by re-running
the translator against the source doc — `--only-disposition` does NOT
touch slugs.

**Fix path**: full re-translation of the affected organs/journals
(~€0.50). `scripts/dedup-organs.ts` lists the colliding groups under
the "legitimate slug collision" diagnostic.

## Journal entries not re-translated since the marker-prompt fix

25 journal posts were last fully re-translated **before** the
`{{...}}` vs `<mN>...</mN>` marker prompt was clarified (PR #23).
Their Portable Text bodies could carry stale `<mN>` tags from that
era.

`scripts/fix-marker-leaks.ts` swept every translation doc for stray
`<mN>` markers in plain string fields and rewrote them to `{{...}}`
verbatim, so the user-visible damage from the original prompt is
gone. Portable Text bodies (`content`, `letter`) are deliberately
skipped by that script because their `<mN>` markers are managed by
the PT walker as part of the round-trip.

There's no evidence of leaked markers in journal bodies today, but a
fresh re-run with the corrected prompt would be belt-and-braces.

**Fix path**: `yarn translate:content --type journal`. ~€0.50.

## Stale dev-server messages module after rapid restart

`next-intl` occasionally caches the previous `messages/{locale}.json`
in the dev server when the file is rewritten by
`scripts/translate-ui-messages.ts` and the server is restarted while
a translation is in flight. Symptom: dev process logs
`INVALID_MESSAGE: MALFORMED_ARGUMENT (...)` for keys that look fine
in the JSON. Resolves on a clean restart.

**Fix path**: not worth wiring HMR for; happens once per UI-string
re-seed. Live workflow restarts the dev server anyway.
