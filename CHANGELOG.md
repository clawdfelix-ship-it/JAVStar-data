# Changelog

All notable changes to JAVStar-data.

## [Unreleased] — 2026-07-18

### Fixed

- **`/api/last-update` 500 error** — endpoint was querying `GREATEST(created_at, updated_at)` on the `events` table, which only has `created_at`. Now queries each table with its own valid column set, and per-table failures are isolated so one broken table can't take down the whole endpoint.

### Added

- **`scripts/backfill-agency.ts`** — populates missing `agency` field on actresses by parsing 所属事務所 rows from minnano-av.com profile pages.
  - Args: `--batch`, `--limit`, `--concurrency`, `--dry-run`
  - Rate limit: 800–1500ms jittered per worker
  - Selects stalest rows first (`ORDER BY updated_at ASC NULLS FIRST`)
  - Initial run: 17 filled from first 30 rows (~57% hit rate; remainder are retired/inactive actresses with no agency data upstream)

- **Hourly cron** (Hermes): every 45 min processes 30 rows quietly. Full backfill of the ~3000 remaining rows expected to complete in ~3 days.

### Changed

- **Repo layout**
  - 71 `scraped-*.json` files + `merged-actresses.json` + `failed-events.json` + `unresolved-events.xlsx` → `data/raw/` (gitignored)
  - 17 one-off `.ts` import/fix/scrape/check scripts + all `.ts.bak` files → `archive/legacy-imports/` (gitignored)
  - Root now contains only build config: `package.json`, `package-lock.json`, `tsconfig.json`, `vercel.json`, `next-env.d.ts`
- `.gitignore` — added `archive/` and cleaned duplicate `.env.*.local` line

### Data (production Neon Postgres)

- Actresses: **5,214** (2,179 with agency after this pass; 3,035 pending backfill)
- Events: **1,317**
- Top agencies by count: LINX (195) · T-POWERS (186) · Bambi Promotion (143) · マインズ (120) · LIGHT (113)

### Verified

- Prod endpoint `/api/last-update` returns 200 with valid timestamps for events / actresses / dvd_ranking / new_releases.
- Deploy `82c8ceb` (api fix) and `24e6239` (repo cleanup) both live on Vercel.

---

## Prior history

See `git log` prior to `aa1f67c` for NIPPON COLORS light-theme migration and earlier feature work.
