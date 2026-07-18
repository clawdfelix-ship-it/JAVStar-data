/**
 * Backfill missing `agency` field on actresses.
 *
 * Strategy:
 *   1. Fetch all actresses where agency is NULL or empty.
 *   2. For each, hit minnano-av.com profile page (id already stored) and parse
 *      the 「所属事務所」 row from the profile table.
 *   3. UPDATE actresses SET agency = ... WHERE id = ...
 *
 * Run modes:
 *   - `--batch 30`  : process only first 30 pending rows (safe for cron)
 *   - `--limit N`   : cap total processed this run
 *   - `--concurrency 3` : parallel workers (default 3, be gentle)
 *   - `--dry-run`   : parse + print but do NOT write DB
 *
 * Rate limiting: 800-1500 ms jittered delay between requests per worker.
 * Failures (404, timeout, no agency row) are logged but do not abort the batch.
 *
 * Env: DATABASE_URL (Neon Postgres, non-pooling recommended for writes)
 */

import { neon } from '@neondatabase/serverless';
import * as cheerio from 'cheerio';

const DB_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL_NON_POOLING;
if (!DB_URL) {
  console.error('❌ DATABASE_URL or POSTGRES_URL_NON_POOLING required');
  process.exit(1);
}
const sql = neon(DB_URL);

// ---- CLI args ----
const args = process.argv.slice(2);
function argInt(flag: string, def: number): number {
  const i = args.indexOf(flag);
  if (i < 0) return def;
  const v = parseInt(args[i + 1], 10);
  return Number.isFinite(v) ? v : def;
}
const BATCH = argInt('--batch', 30);
const LIMIT = argInt('--limit', BATCH);
const CONCURRENCY = argInt('--concurrency', 3);
const DRY_RUN = args.includes('--dry-run');

// ---- profile parser ----
const PROFILE_BASE = 'https://www.minnano-av.com/actress.php?actress_id=';

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

async function fetchProfile(id: string): Promise<string | null> {
  const url = `${PROFILE_BASE}${encodeURIComponent(id)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, {
      headers: { 'user-agent': UA, 'accept-language': 'ja,en;q=0.8' },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Parse the profile page for agency.
 * minnano-av layout: <td><span>所属事務所</span><p><a>Agency Name</a></p></td>
 * Fallback: any <td> whose <span> label contains 所属/事務所/プロダクション.
 */
function extractAgency(html: string): string | null {
  const $ = cheerio.load(html);
  let agency: string | null = null;

  $('td').each((_: number, td: any) => {
    const label = $(td).find('span').first().text().trim();
    if (!label) return;
    if (label.includes('所属') || label.includes('事務所') || label.includes('プロダクション')) {
      // Prefer <p> value (may contain <a> or plain text)
      const p = $(td).find('p').first();
      const val = (p.length ? p.text() : $(td).text().replace(label, '')).trim().replace(/\s+/g, ' ');
      if (val && val !== '-' && val !== '不明' && val.length < 100) {
        agency = val;
        return false; // break
      }
    }
  });

  return agency;
}

// ---- worker pool ----
function jitter(min: number, max: number): number {
  return Math.floor(min + Math.random() * (max - min));
}

interface Pending {
  id: string;
  name_ja: string;
}

async function processOne(row: Pending): Promise<{ id: string; agency: string | null; err?: string }> {
  const html = await fetchProfile(row.id);
  if (!html) return { id: row.id, agency: null, err: 'fetch failed' };
  const agency = extractAgency(html);
  if (!agency) return { id: row.id, agency: null, err: 'no agency row' };

  if (!DRY_RUN) {
    try {
      await sql`UPDATE actresses SET agency = ${agency}, updated_at = NOW() WHERE id = ${row.id}`;
    } catch (e: any) {
      return { id: row.id, agency, err: `db: ${e?.message ?? e}` };
    }
  }
  return { id: row.id, agency };
}

async function main() {
  console.log(
    `▶ backfill-agency  batch=${BATCH}  limit=${LIMIT}  concurrency=${CONCURRENCY}  dry=${DRY_RUN}`,
  );

  const rows = (await sql`
    SELECT id, name_ja
    FROM actresses
    WHERE (agency IS NULL OR agency = '')
    ORDER BY updated_at ASC NULLS FIRST
    LIMIT ${LIMIT}
  `) as unknown as Pending[];

  console.log(`  → picked ${rows.length} pending actresses`);
  if (rows.length === 0) {
    console.log('  ✓ nothing to do');
    return;
  }

  let idx = 0;
  let filled = 0;
  let missed = 0;
  const failures: string[] = [];

  async function worker(workerId: number) {
    while (idx < rows.length) {
      const row = rows[idx++];
      const r = await processOne(row);
      if (r.agency && !r.err) {
        filled++;
        console.log(`  [${workerId}] ${row.id.padEnd(8)} ${row.name_ja}  →  ${r.agency}`);
      } else {
        missed++;
        failures.push(`${row.id} (${row.name_ja}): ${r.err ?? 'unknown'}`);
      }
      // gentle pacing
      await new Promise(res => setTimeout(res, jitter(800, 1500)));
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, (_, i) => worker(i + 1)));

  console.log(`\n▶ done  filled=${filled}  missed=${missed}  total=${rows.length}`);
  if (failures.length > 0) {
    console.log(`  misses (first 10):`);
    failures.slice(0, 10).forEach(f => console.log(`   - ${f}`));
  }
}

main().catch(e => {
  console.error('fatal:', e);
  process.exit(1);
});
