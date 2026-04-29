# Cleanup — pre‑i18n dataset hygiene

First plan in the sequence. Runs **before** `plans/upgrades.md` and `plans/translations.md`. One small,
isolated PR that removes three stale documents from the production dataset so the i18n migration has
unambiguous input.

## Why this exists

Audit of the Apr 29 export surfaced three documents that don't belong in the dataset any more:

| `_id`                                  | Why it's stale                                                              |
| -------------------------------------- | --------------------------------------------------------------------------- |
| `drafts.siteSettings`                  | Older draft sibling missing `scoresEditionLine` + `scoresNoticeBody`; only carries an `aiCrawlPolicy` field that's not even in the active schema. The published `siteSettings` is the canonical state. |
| `drafts.1b2o827S21abcdyBtUtha0`        | Ghost draft of the published "Hoogeveen De Opgang" organ; `_type: 'post'` (dead schema type). All 23/23 content blocks byte‑identical to the published `organ` sibling. PR #12 backfill migrated published docs but didn't touch draft siblings. |
| `drafts.v2I8xbswIO3h0NWvyLCPIC`        | Ghost draft of the published "Orgelpad Vollenhove …" travelogue; `_type: 'blog'` (dead schema type). All 15/15 content blocks byte‑identical to the published `journal` sibling. Same root cause as above. |

Decision (locked): **discard all three.** Verified zero unique content in any of them.

## Sequence

```
fresh backup  →  dry-run audit  →  transactional delete  →  post-run audit  →  PR
```

## Tasks

### Step 1 — fresh backup (mandatory)

- [ ] Re‑run the export script to a new timestamped folder (do **not** overwrite the Apr 29 backup).
      Use the same approach captured in `/tmp/backup-bertwebbink-sanity.sh` from the Apr 29 run.
- [ ] Verify: `gzip -t`, doc count, type breakdown match the previous run except for the three docs
      that are about to be removed (i.e. `2× settings`, `1× post`, `1× blog` should all be present).
- [ ] Record the new backup path at the top of this file's "Done means" before merging the PR.

### Step 2 — write the cleanup script

Location: `scripts/cleanup-pre-i18n.ts`. Mirrors the patterns used by `scripts/sanity-backfill/`:
explicit allow‑list of ids, dry‑run mode, refuses to act if any safety check fails.

- [ ] Connects with `SANITY_API_WRITE_TOKEN` (sourced from `.env`, never logged)
- [ ] Hardcoded id list (the three above) — no parameterisation, no globbing; explicit only
- [ ] **Pre‑flight safety checks** that abort the run if any of these are violated:
  - Each target id must currently exist in the dataset
  - `drafts.siteSettings` must have `_type === 'settings'`
  - `drafts.1b2o827S21abcdyBtUtha0` must have `_type === 'post'` (not `organ` — confirms it's still
    the dead‑type ghost we're trying to delete)
  - `drafts.v2I8xbswIO3h0NWvyLCPIC` must have `_type === 'blog'`
  - Each ghost draft's `_id` minus the `drafts.` prefix must match an existing **published** doc with
    the corresponding new type (`organ` / `journal`) — confirms the published canonical version is
    safe before we delete the ghost
  - `siteSettings` (published) must exist with `_type === 'settings'`
- [ ] Dry‑run mode (`--dry-run`) prints the planned deletions and prefix‑lookup results, writes
      nothing
- [ ] Apply mode performs all three deletes inside a single `client.transaction()` so they're atomic
- [ ] Logs every step with structured fields (id, _type, action)
- [ ] Add to `package.json`: `"cleanup:pre-i18n": "tsx scripts/cleanup-pre-i18n.ts"`

### Step 3 — dry‑run

- [ ] `yarn cleanup:pre-i18n --dry-run`
- [ ] Confirm output lists exactly three intended deletes and reports zero safety violations
- [ ] Eyeball the output — sanity check (literally)

### Step 4 — apply

- [ ] `yarn cleanup:pre-i18n`
- [ ] Confirm transaction commits without error

### Step 5 — post‑run audit

- [ ] Re‑run the type breakdown query (the same one used on the Apr 29 backup) live against the
      dataset. Expect:
  - `settings` count = **1** (was 2)
  - `post` count = **0** (was 1)
  - `blog` count = **0** (was 1)
  - Every other type count unchanged (132 `organ`, 25 `journal`, 4 `score`, 6 other singletons,
    1 `sanity.previewUrlSecret`)
- [ ] Open Sanity Studio at `/admin`, click into `Settings`, confirm only one entry, all expected
      fields populated, no draft indicator
- [ ] Open the published `Hoogeveen De Opgang` organ, click "Discard changes" if visible — should be
      a no‑op (no draft to discard); confirm the action is greyed out or absent
- [ ] Same for the published `Orgelpad Vollenhove …` journal

### Step 6 — PR

- [ ] Branch: `chore/cleanup-pre-i18n`
- [ ] Files changed: only `scripts/cleanup-pre-i18n.ts` + `package.json` script entry +
      `plans/cleanup-pre-i18n.md` (this file, with the "Done means" backup paths filled in)
- [ ] PR description references the Apr 29 + Step 1 backup paths and lists the three deleted ids
- [ ] No CI changes, no lockfile changes
- [ ] Merge → tag `pre-i18n-cleanup`

## Future‑facing note (not blocking)

PR #12's backfill (`scripts/sanity-backfill/apply.ts`) migrated only published documents. Future
schema‑rename scripts should iterate **both** published and `drafts.*` siblings, or at minimum emit
a list of stale drafts left behind for explicit cleanup. Captured terse in `AGENTS.md` so the rule
survives.

## Done means

- [ ] Step 1 backup path:`~/sanity-backups/bertwebbink.nl/<TIMESTAMP>/production.tar.gz` (fill in)
- [ ] `drafts.siteSettings` no longer exists in the dataset
- [ ] `drafts.1b2o827S21abcdyBtUtha0` no longer exists in the dataset
- [ ] `drafts.v2I8xbswIO3h0NWvyLCPIC` no longer exists in the dataset
- [ ] Type breakdown live‑queried against the dataset matches the post‑run expectations above
- [ ] PR `chore/cleanup-pre-i18n` merged + tagged
- [ ] `plans/upgrades.md` Phase 0 unblocked

## Out of scope

- Deleting the published `Hoogeveen De Opgang` organ or the `Orgelpad Vollenhove` journal — both are
  good content and are the canonical versions
- Re‑running the PR #12 backfill or auditing other parts of the dataset — done, no further issues
- Anything in `plans/upgrades.md` or `plans/translations.md`
