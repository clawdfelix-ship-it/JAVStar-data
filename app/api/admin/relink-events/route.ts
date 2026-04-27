import { sql } from '@/lib/db';
import { NextResponse } from 'next/server';

// POST /api/admin/relink-events
// 自動將 actress_id='unknown' 的活動配對到正確的女優
export async function POST() {
  try {
    // 1. 拎所有 actress_id = 'unknown' 的活動
    const unknownEvents = await sql`
      SELECT id, title, actress_name, datetime
      FROM events
      WHERE actress_id = 'unknown'
    `;

    if (!unknownEvents || unknownEvents.length === 0) {
      return NextResponse.json({ message: 'No unknown events found', updated: 0 });
    }

    // 2. 拎所有非 unknown 的女優
    const actresses = await sql`
      SELECT id, name_ja, name_cn
      FROM actresses
      WHERE id != 'unknown'
        AND name_ja IS NOT NULL
        AND name_ja != ''
    `;

    let updated = 0;
    const results: { eventId: string; title: string; matchedName: string; actressId: string }[] = [];
    const errors: { eventId: string; title: string; reason: string }[] = [];

    // 3. 對每條 unknown 事件嘗試匹配
    for (const event of unknownEvents as any[]) {
      const title = event.title || '';
      const actressNameFromEvent = event.actress_name || '';

      let matched: { id: string; name_ja: string } | null = null;

      // 優先用 event.actress_name 匹配（因為標題入面有）
      if (actressNameFromEvent) {
        matched = (actresses as any[]).find(a =>
          actressNameFromEvent.includes(a.name_ja) ||
          (a.name_cn && actressNameFromEvent.includes(a.name_cn))
        );
      }

      // 如果 event.actress_name 匹配唔到，嘗試用標題入面的名字
      if (!matched) {
        matched = (actresses as any[]).find(a =>
          title.includes(a.name_ja) ||
          (a.name_cn && title.includes(a.name_cn))
        );
      }

      if (matched) {
        await sql`
          UPDATE events
          SET actress_id = ${matched.id}
          WHERE id = ${event.id}
        `;
        updated++;
        results.push({
          eventId: event.id,
          title: title.slice(0, 60),
          matchedName: matched.name_ja,
          actressId: matched.id,
        });
      } else {
        errors.push({
          eventId: event.id,
          title: title.slice(0, 60),
          reason: 'No matching actress found',
        });
      }
    }

    return NextResponse.json({
      message: `Processed ${unknownEvents.length} events`,
      updated,
      matched: results,
      unmatched: errors,
    });

  } catch (error) {
    console.error('Error in relink-events:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'Failed to relink events', detail: message }, { status: 500 });
  }
}
