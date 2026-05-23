# JAVStar-data Architecture Report

**Generated:** 2026-05-24  
**Analyzer:** SoftwareArchitect  
**Project Path:** `~/clones/JAVStar-data/`

---

## Executive Summary

JAVStar-data is a **Next.js 15 data platform** that aggregates Japanese AV actress information from minnano-av.com (profiles) and av-event.jp (events), ranking actresses by yearly event count with a weighted voting system. The platform is built with SQLite + Drizzle ORM, uses Tailwind CSS with a "NIPPON COLORS" aesthetic, and targets Hong Kong fans with Traditional Chinese content.

The current database contains only **10 actresses** and **12 events** — the scrapers ran at some point but the dataset is critically incomplete. The core ranking/listing infrastructure is functional, but the compare page, scheduler integration, and most scraper pipelines are not operational. The project has good code organization but significant data-scale and architecture issues.

---

## What Works

- ✅ **Next.js 15 App Router** with proper server/client component separation (server fetches DB, client handles UI)
- ✅ **SWR-based data fetching** with custom hooks (`useActresses`, `useEvents`, `useStats`) — includes caching, dedup, retry
- ✅ **Database schema is clean** with proper FK constraints, indexes on `events(datetime)`, `events(actress_id)`, and `votes` unique constraint per IP
- ✅ **Virtual list component** for events — handles large lists efficiently
- ✅ **NIPPON COLORS design system** with Tailwind tokens — well-structured CSS variables and Froala-style component classes

---

## What Doesn't Work

- ❌ **Only 10 actresses / 12 events in DB** — scrapers collected seed data but never ran at scale
- ❌ **14 failed event scrapes** with empty `actress_id`/`actress_name` — events were scraped but name extraction failed
- ❌ **0 votes in DB** — voting system never activated
- ❌ **Compare page missing entirely** — listed in SPEC.md and sidebar but no route at `/compare`
- ❌ **Scheduler not integrated** — `node-cron` in package.json but no evidence of production cron jobs
- ❌ **Frontend/schema column mismatch** — Actress interface expects `age`, `zodiac`, `cup`, `agency`, `hobby`, `debut_year`, `tags` but DB schema only has `birthday`, `height`, `bust`, `waist`, `hip`, `debut_date`
- ❌ **DMM/JavLibrary scraper** exists (`javlibrary.ts`) but no evidence of it running successfully
- ❌ **Global sort-then-paginate** in API is O(n) memory — won't scale past ~1K actresses

---

## Data Assessment

### Scale
| Table | Count |
|-------|-------|
| actresses | 10 |
| events | 12 |
| votes | 0 |
| actress_events_count | (empty or minimal) |

### Schema Summary
```
actresses(id, name_ja, name_cn, birthday, height, bust, waist, hip, debut_date, avatar_url, created_at, updated_at)
events(id, actress_id FK→actresses, title, venue, prefecture, datetime, event_type, url, created_at)
votes(id, actress_id FK→actresses, ip_address, voted_at) — UNIQUE(actress_id, ip_address)
dvd_ranking(id, rank, video_code, title, actress, maker, cover_url, detail_url, is_new, rank_change, source, created_at, updated_at)
```

### Data Quality Issues
1. **Tiny dataset** — 10 actresses is not representative; ranking is meaningless
2. **Failed events not linked** — 14 events in `failed-events.json` have empty `actress_id` and `actress_name`
3. **DB columns missing from frontend** — `age`, `zodiac`, `cup`, `agency`, `hobby`, `debut_year`, `tags` are referenced in `HomeClient.tsx` Actress interface but not in DB schema
4. **No `actress_events_count` population** — the table exists but has no data

---

## Code Quality Assessment

### Frontend Architecture
- **Good:** Server/client component split correctly uses `fetchActressServer()` in server component, passes to `<ActressClient />`
- **Good:** SWR hooks (`useActresses`, `useEvents`, `useStats`) provide clean data layer separation
- **Good:** Custom hooks like `useSearch`, `useVirtualScroll` show investment in DX
- **Concern:** VirtualList with fixed `itemHeight={140}` — fragile if EventCard renders variable-height content (long titles, missing fields)
- **Concern:** `DailyActressBox` fetches random page (1-10) of 100 items per render — poor cache behavior, wasteful
- **Concern:** TypeScript interfaces in `HomeClient.tsx` don't match actual DB schema columns

### API Design
- **Good:** RESTful design with proper pagination (`page`, `limit`, `offset`)
- **Good:** `revalidate = 60` for caching
- **Good:** Global sort-before-paginate ensures correct ranking across all pages
- **Issue:** Fetches ALL actresses into memory then sorts — O(n) memory, won't scale
- **Issue:** No rate limiting or query validation beyond basic parseInt defaults
- **Issue:** `POST /api/actresses` allows任何人 to create actress entries — no auth check

### Scraper Architecture
- **Good:** Separate modules per source (`av-event.ts`, `minnano.ts`, `javlibrary.ts`)
- **Good:** Uses Cheerio + node-fetch, with rate limiting delays
- **Good:** `scheduler.ts` exists with node-cron configuration
- **Issue:** No evidence of scheduled scraping in production
- **Issue:** `failed-events.json` shows name extraction failures — scraper parsing is brittle

---

## Priority Issues (Top 5)

### 1. Critical: Empty Dataset (Only 10 actresses, 12 events)
**What:** Database has severely incomplete data — the core value proposition (ranking by event activity) is meaningless.  
**Why:** A ranking platform with 10 actresses is just a list. No fan would use this.  
**Fix:** Run full scraper pipeline to populate database. This is the #1 blocker for any meaningful launch. Effort: **full-day** (requires VPN, handling blocks, running scrapers at scale).

### 2. Critical: Failed Events Not Linked to Actresses
**What:** 14 events in `failed-events.json` have no `actress_id` or `actress_name`.  
**Why:** These represent real upcoming events (June 2026) that fans would want — currently wasted data.  
**Fix:** Improve name extraction regex/parsing in `av-event.ts` scraper, or manually map the failed events. Effort: **half-day** to fix parser, **1h** to manually fix known events.

### 3. High: Missing `compare` Page
**What:** SPEC.md lists `/compare` as a core page; sidebar references it; but route doesn't exist.  
**Why:** Broken navigation + incomplete feature set per spec.  
**Fix:** Build `app/compare/page.tsx` — likely needs actress selector UI + side-by-side comparison view. Effort: **half-day**.

### 4. High: Frontend/DB Schema Mismatch
**What:** `HomeClient.tsx` Actress interface expects `age`, `zodiac`, `cup`, `agency`, `hobby`, `debut_year`, `tags` but DB `actresses` table doesn't have these columns.  
**Why:** Runtime will show `undefined` for all these fields; UI will be broken for any actress without explicit null guards.  
**Fix:** Add missing columns to DB schema via migration, update scrapers to populate them. Effort: **1h** (migration + schema), **half-day** (scraper updates).

### 5. Medium: API Sort is O(n) Memory
**What:** `GET /api/actresses` loads ALL actresses into Node.js memory, enriches them, sorts, then slices for pagination.  
**Why:** Works fine at 10 actresses; will crash or hang at 10,000. The "correct" approach is SQL-based sorting with `ORDER BY` + `LIMIT/OFFSET`.  
**Fix:** Push scoring computation into SQL (or a materialized view), use SQL `ORDER BY` directly. Effort: **1h** (SQL refactor).

---

## TODO Progress vs SPEC.md

| SPEC.md TODO Item | Status |
|-------------------|--------|
| Initialize Next.js project | ✅ Done |
| Set up SQLite + Drizzle ORM | ✅ Done |
| Implement av-event.jp scraper | ⚠️ Partial (runs but leaves 14 failures) |
| Implement minnano-av.com scraper | ⚠️ Partial (file exists, unclear if it ran) |
| Build API routes | ✅ Done (GET /api/actresses, POST, event routes) |
| Frontend ranking page | ✅ Done |
| Frontend actress detail page | ✅ Done |
| Frontend events list page | ✅ Done |
| Set up node-cron scheduler | ❌ Not integrated in production |
| Deploy config | ⚠️ Has Vercel config, no evidence of working production cron |
| Voting system (backend) | ⚠️ DB table exists, API route exists (`/api/actresses/[id]/vote`), but 0 votes cast |
| Voting system (frontend) | ❌ Not implemented in UI |
| `/compare` page | ❌ Missing |
| `/events` page | ✅ Done |
| SEO metadata | ✅ Done (JSON-LD, OpenGraph, Twitter cards) |
| DVD ranking section | ✅ Done (`DvdRankingSection.tsx`) |
| New releases section | ✅ Done (`NewReleasesSection.tsx`) |
| Daily actress box | ✅ Done (`DailyActressBox.tsx`) |

---

## Recommended Next Steps

### 1. Run Full Scraper Pipeline (Full-day effort)
Fix the broken name extraction in `av-event.ts`, then run the full scrape to populate 10,000+ actresses and thousands of events. This is the #1 value driver. Without data, nothing else matters.

### 2. Add Missing DB Columns (Half-day effort)
Run a Drizzle migration to add `age`, `zodiac`, `cup`, `agency`, `hobby`, `debut_year`, `tags` columns. Update scrapers to populate them. Fix the TypeScript interfaces to match reality.

### 3. Build `/compare` Page (Half-day effort)
Create `app/compare/page.tsx` with actress multi-select and side-by-side comparison view (profile stats, event history, timeline). This was a SPEC.md commitment.

### 4. Refactor API to SQL-level Sorting (1h effort)
Push the weighted scoring into SQL using computed columns or a view. Replace in-memory sort with `ORDER BY final_score DESC LIMIT X OFFSET Y`. This enables proper pagination without loading all data into memory.

### 5. Integrate Scheduler / Cron (Half-day effort)
Wire up `scheduler.ts` with proper environment setup for production. Either deploy node-cron as a sidecar process, or switch to Vercel Cron (if on Vercel Pro). Add `/api/cron/update` endpoint protection with a secret token.

---

## Supplementary Notes

- **Deploy target:** Vercel (inferred from `vercel.json` reference and URL `jav-star-data.vercel.app`). Vercel's serverless functions don't support long-running cron + node-cron natively — consider Vercel Cron or a separate worker process.
- **Neon Postgres in deps:** `@neondatabase/serverless` and `@types/pg` in package.json suggest consideration of Postgres, but production DB is SQLite. This is technical debt — pick one.
- **SWR vs React Query:** SWR is used throughout. Consider migrating to React Query v5 for better long-term maintenance, or stick with SWR if it's working.
- **14 failed events** in `failed-events.json` are all June 2026 events — they represent real upcoming activities and should be rescued.