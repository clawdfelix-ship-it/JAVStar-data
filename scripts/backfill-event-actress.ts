/**
 * Backfill events.actress_id by fuzzy-matching event.title against actresses.name_ja
 *
 * Strategy (conservative — false positive > false negative):
 *   1. Only consider actresses with name_ja length >= 3 (avoids matching "AV", "DVD")
 *   2. For each event with actress_id='unknown', scan its title for any actress name
 *   3. Score each match: longer name = higher score; earlier position = higher score
 *   4. If we get a unique winner, UPDATE events.actress_id
 *   5. Also insert into event_actresses (M:N) — one event can feature multiple actresses
 *
 * Also creates the mapping table if it doesn't exist.
 */
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

interface ActressRow {
  id: string;
  name_ja: string;
  name_cn: string | null;
}

interface Match {
  actress_id: string;
  score: number;
  position: number;
  name: string;
}

async function ensureMappingTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS event_actresses (
      event_id TEXT NOT NULL,
      actress_id TEXT NOT NULL,
      score INTEGER NOT NULL,
      matched_name TEXT NOT NULL,
      matched_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (event_id, actress_id)
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_event_actresses_actress ON event_actresses(actress_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_event_actresses_event ON event_actresses(event_id)`;
  console.log('[schema] event_actresses table ready');
}

function findMatches(title: string, actresses: ActressRow[]): Match[] {
  const matches: Match[] = [];
  for (const a of actresses) {
    if (!a.name_ja || a.name_ja.length < 3) continue;
    const pos = title.indexOf(a.name_ja);
    if (pos < 0) continue;
    // Score = name length × 10 - position (earlier is better)
    const score = a.name_ja.length * 10 - Math.min(pos, 50);
    matches.push({ actress_id: a.id, score, position: pos, name: a.name_ja });
  }
  // Sort desc by score
  matches.sort((a, b) => b.score - a.score);
  // De-dup overlapping matches (if 田中花 and 田中花子 both match, keep the longer one)
  const kept: Match[] = [];
  for (const m of matches) {
    const overlaps = kept.some((k) => {
      const kEnd = k.position + k.name.length;
      const mEnd = m.position + m.name.length;
      return m.position < kEnd && mEnd > k.position;
    });
    if (!overlaps) kept.push(m);
  }
  return kept;
}

async function main() {
  const DRY_RUN = process.argv.includes('--dry-run');
  const LIMIT = parseInt(process.env.LIMIT || '0');

  await ensureMappingTable();

  console.log('[data] Loading actresses...');
  const actresses = (await sql`
    SELECT id, name_ja, name_cn FROM actresses
    WHERE name_ja IS NOT NULL AND length(name_ja) >= 3
    ORDER BY length(name_ja) DESC
  `) as ActressRow[];
  console.log(`[data] ${actresses.length} candidate actresses loaded`);

  console.log('[data] Loading unmatched events...');
  const events = LIMIT
    ? (await sql`SELECT id, title, actress_id, datetime FROM events WHERE actress_id = 'unknown' AND title IS NOT NULL LIMIT ${LIMIT}`) as any[]
    : (await sql`SELECT id, title, actress_id, datetime FROM events WHERE actress_id = 'unknown' AND title IS NOT NULL`) as any[];
  console.log(`[data] ${events.length} unmatched events to process`);

  let matched = 0;
  let updated = 0;
  let multi = 0;
  let noMatch = 0;

  for (const ev of events) {
    const found = findMatches(ev.title, actresses);
    if (found.length === 0) {
      noMatch++;
      continue;
    }
    matched++;
    if (found.length > 1) multi++;

    // Update primary actress_id to top-scoring match
    const primary = found[0];
    if (!DRY_RUN) {
      await sql`UPDATE events SET actress_id = ${primary.actress_id} WHERE id = ${ev.id}`;
      // Insert all matches into mapping table
      for (const m of found) {
        await sql`
          INSERT INTO event_actresses (event_id, actress_id, score, matched_name)
          VALUES (${ev.id}, ${m.actress_id}, ${m.score}, ${m.name})
          ON CONFLICT (event_id, actress_id) DO UPDATE
            SET score = EXCLUDED.score, matched_name = EXCLUDED.matched_name
        `;
      }
      updated++;
    }

    if (matched <= 15 || matched % 100 === 0) {
      console.log(
        `[match] ${ev.datetime} "${ev.title.slice(0, 40)}..." → ${primary.name} (id=${primary.actress_id}, score=${primary.score})${found.length > 1 ? ` +${found.length - 1}` : ''}`,
      );
    }
  }

  console.log('\n===== SUMMARY =====');
  console.log(`Processed:        ${events.length}`);
  console.log(`Matched (≥1):     ${matched}  (${((matched / events.length) * 100).toFixed(1)}%)`);
  console.log(`Multi-actress:    ${multi}`);
  console.log(`No match:         ${noMatch}`);
  console.log(`DB updated:       ${updated}${DRY_RUN ? ' (DRY RUN — nothing written)' : ''}`);

  // Verify: count actresses with upcoming events post-backfill
  if (!DRY_RUN) {
    const withUpcoming = await sql`
      SELECT COUNT(DISTINCT actress_id) as cnt FROM events
      WHERE datetime >= to_char(NOW(), 'YYYY-MM-DD') AND actress_id != 'unknown'
    `;
    console.log(`\nActresses with upcoming events: ${(withUpcoming as any)[0].cnt}`);
  }

  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
