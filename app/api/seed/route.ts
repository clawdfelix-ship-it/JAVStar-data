import sql from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const { actresses, events, votes } = await request.json();
    
    const result: any = { success: true };

    // 導入女優數據
    if (actresses && Array.isArray(actresses)) {
      let success = 0;
      let failed = 0;

      for (const a of actresses) {
        try {
          await sql`
            INSERT INTO actresses (id, name_ja, name_cn, birthday, age, zodiac, height, bust, waist, hip, cup, agency, hobby, debut_date, debut_year, debut_work, blog, official_site, tags, avatar_url, created_at, updated_at)
            VALUES (
              ${String(a.id || '')}, 
              ${a.name_ja || ''}, 
              ${a.name_cn || null}, 
              ${a.birthday || null}, 
              ${a.age || null}, 
              ${a.zodiac || null}, 
              ${a.height || null}, 
              ${a.bust || null}, 
              ${a.waist || null}, 
              ${a.hip || null}, 
              ${a.cup || null}, 
              ${a.agency || null}, 
              ${a.hobby || null}, 
              ${a.debut_date || null}, 
              ${a.debut_year || null}, 
              ${a.debut_work || null}, 
              ${a.blog || null}, 
              ${a.official_site || null}, 
              ${a.tags || null}, 
              ${a.avatar_url || null}, 
              NOW(), 
              NOW()
            )
            ON CONFLICT (id) DO UPDATE SET
              name_ja = EXCLUDED.name_ja,
              name_cn = EXCLUDED.name_cn,
              birthday = EXCLUDED.birthday,
              age = EXCLUDED.age,
              zodiac = EXCLUDED.zodiac,
              height = EXCLUDED.height,
              bust = EXCLUDED.bust,
              waist = EXCLUDED.waist,
              hip = EXCLUDED.hip,
              cup = EXCLUDED.cup,
              agency = EXCLUDED.agency,
              hobby = EXCLUDED.hobby,
              debut_date = EXCLUDED.debut_date,
              debut_year = EXCLUDED.debut_year,
              debut_work = EXCLUDED.debut_work,
              blog = EXCLUDED.blog,
              official_site = EXCLUDED.official_site,
              tags = EXCLUDED.tags,
              avatar_url = EXCLUDED.avatar_url,
              updated_at = NOW()
          `;
          success++;
        } catch (e) {
          failed++;
        }
      }
      result.actresses = { total: actresses.length, inserted: success, failed: failed };
    }

    // 導入活動數據
    if (events && Array.isArray(events)) {
      let success = 0;
      let failed = 0;

      for (const e of events) {
        try {
          await sql`
            INSERT INTO events (id, actress_id, title, venue, prefecture, datetime, event_type, url, created_at)
            VALUES (
              ${String(e.id || '')},
              ${e.actress_id || ''},
              ${e.title || ''},
              ${e.venue || ''},
              ${e.prefecture || ''},
              ${e.datetime || null},
              ${e.event_type || ''},
              ${e.url || ''},
              NOW()
            )
            ON CONFLICT (id) DO NOTHING
          `;
          success++;
        } catch (err) {
          failed++;
        }
      }
      result.events = { total: events.length, inserted: success, failed: failed };
    }

    // 導入投票數據
    if (votes && Array.isArray(votes)) {
      let success = 0;
      let failed = 0;

      for (const v of votes) {
        try {
          await sql`
            INSERT INTO votes (id, actress_id, ip_address, voted_at)
            VALUES (
              ${String(v.id || '')},
              ${v.actress_id || ''},
              ${v.ip_address || '127.0.0.1'},
              ${v.voted_at || new Date().toISOString()}
            )
            ON CONFLICT (id) DO NOTHING
          `;
          success++;
        } catch (err) {
          failed++;
        }
      }
      result.votes = { total: votes.length, inserted: success, failed: failed };
    }

    return NextResponse.json(result);

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}

// GET - 檢查數據庫當前狀態
export async function GET(request: NextRequest) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const [actressCount, eventCount, voteCount] = await Promise.all([
      sql`SELECT COUNT(*) as count FROM actresses`,
      sql`SELECT COUNT(*) as count FROM events`,
      sql`SELECT COUNT(*) as count FROM votes`,
    ]);

    return NextResponse.json({
      actresses: Number((actressCount as any[])[0]?.count || 0),
      events: Number((eventCount as any[])[0]?.count || 0),
      votes: Number((voteCount as any[])[0]?.count || 0),
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}