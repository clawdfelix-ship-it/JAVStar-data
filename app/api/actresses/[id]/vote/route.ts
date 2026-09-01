import { getSql } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { getClientIp } from '@/lib/client-ip';

// getSql() 回傳 raw neon client：同時支援 tagged template 同 sql.query(sql, params)
const sql = getSql();

interface Params {
  params: Promise<{ id: string }>;
}

// 每日投票上限（防劇本刷榜；正常粉絲唔會一日投超過 10 位）
const DAILY_VOTE_LIMIT = 10;

// 月份/今日以香港時區計（server 行 UTC，月界喺 16:00 UTC）。
// 注意：呢兩段係 SQL 表達式，必須寫死喺 query string，唔可以用參數綁定。
const MONTH_SQL = `to_char(now() AT TIME ZONE 'Asia/Hong_Kong', 'YYYY-MM')`;
const TODAY_SQL = `to_char((now() AT TIME ZONE 'Asia/Hong_Kong')::date, 'YYYY-MM-DD')`;
// voted_at 係 TEXT（DEFAULT CURRENT_TIMESTAMP），轉香港日期做每日統計
const VOTED_HK_DATE_SQL = `to_char((voted_at::timestamp AT TIME ZONE 'Asia/Hong_Kong')::date, 'YYYY-MM-DD')`;

async function getNow(): Promise<{ month: string; today: string }> {
  const rows = await sql.query(`SELECT ${MONTH_SQL} AS month, ${TODAY_SQL} AS today`, []);
  return { month: (rows as any[])[0].month, today: (rows as any[])[0].today };
}

// GET /api/actresses/[id]/vote - 取本月/累計票數 + 我本月有冇投過
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const ip = getClientIp(request);
    const { month, today } = await getNow();

    const monthCountRows = await sql`
      SELECT COUNT(*)::int AS count FROM votes
       WHERE actress_id = ${id} AND vote_month = ${month}
    `;
    const allCountRows = await sql`
      SELECT COUNT(*)::int AS count FROM votes WHERE actress_id = ${id}
    `;
    const myVoteRows = await sql`
      SELECT 1 FROM votes
       WHERE actress_id = ${id} AND ip_address = ${ip} AND vote_month = ${month}
       LIMIT 1
    `;
    // 今日我已投幾多票（頻率上限提示用）
    const myTodayRows = await sql.query(
      `SELECT COUNT(*)::int AS count FROM votes
        WHERE ip_address = $1 AND ${VOTED_HK_DATE_SQL} = $2`,
      [ip, today]
    );

    return NextResponse.json({
      actress_id: id,
      vote_month: month,
      vote_count: Number((monthCountRows as any[])[0]?.count || 0),      // 本月票數（button 顯示）
      vote_count_all: Number((allCountRows as any[])[0]?.count || 0),  // 累計票數
      has_voted: (myVoteRows as any[]).length > 0,
      my_votes_today: Number((myTodayRows as any[])[0]?.count || 0),
      daily_limit: DAILY_VOTE_LIMIT,
    });

  } catch (error) {
    console.error('Error fetching vote:', error);
    return NextResponse.json({ error: 'Failed to fetch vote' }, { status: 500 });
  }
}

// POST /api/actresses/[id]/vote - 投票（每月每女優一票；每日最多 10 票）
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const ip = getClientIp(request);

    // 女優存在？
    const actressResult = await sql`SELECT 1 FROM actresses WHERE id = ${id} LIMIT 1`;
    if ((actressResult as any[]).length === 0) {
      return NextResponse.json({ error: 'Actress not found' }, { status: 404 });
    }

    const { month, today } = await getNow();

    // 本月已投過呢位女優？
    const existingVoteResult = await sql`
      SELECT 1 FROM votes
       WHERE actress_id = ${id} AND ip_address = ${ip} AND vote_month = ${month}
       LIMIT 1
    `;
    if ((existingVoteResult as any[]).length > 0) {
      return NextResponse.json(
        { error: '你呢個月已經投過呢位女優啦！每月可以再投一次，下月 1 號解鎖', voted: true },
        { status: 400 }
      );
    }

    // 每日頻率上限（防劇本刷榜）
    const todayCountRows = await sql.query(
      `SELECT COUNT(*)::int AS count FROM votes
        WHERE ip_address = $1 AND ${VOTED_HK_DATE_SQL} = $2`,
      [ip, today]
    );
    if (Number((todayCountRows as any[])[0]?.count || 0) >= DAILY_VOTE_LIMIT) {
      return NextResponse.json(
        { error: `今日已投咗 ${DAILY_VOTE_LIMIT} 票，聽日再繼續應援啦！`, limit: true },
        { status: 429 }
      );
    }

    // 記票（vote_month 一齊寫入；UNIQUE(actress_id, ip, vote_month) 兜底防 race）
    try {
      await sql`
        INSERT INTO votes (actress_id, ip_address, vote_month)
        VALUES (${id}, ${ip}, ${month})
      `;
    } catch (e: any) {
      // 23505 = unique_violation：race 下同月重投
      if (e?.code === '23505') {
        return NextResponse.json(
          { error: '你呢個月已經投過呢位女優啦！', voted: true },
          { status: 400 }
        );
      }
      throw e;
    }

    const monthCountRows = await sql`
      SELECT COUNT(*)::int AS count FROM votes
       WHERE actress_id = ${id} AND vote_month = ${month}
    `;
    const allCountRows = await sql`
      SELECT COUNT(*)::int AS count FROM votes WHERE actress_id = ${id}
    `;

    return NextResponse.json({
      success: true,
      vote_month: month,
      vote_count: Number((monthCountRows as any[])[0]?.count || 0),
      vote_count_all: Number((allCountRows as any[])[0]?.count || 0),
      message: '投票成功！多謝你本月應援 🎉 下月可以再投一次',
    });

  } catch (error) {
    console.error('Error casting vote:', error);
    return NextResponse.json({ error: '投票失敗，請稍後再試' }, { status: 500 });
  }
}

// DELETE /api/actresses/[id]/vote - 收回本月投票
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const ip = getClientIp(request);
    const { month } = await getNow();

    const existingVoteResult = await sql`
      SELECT 1 FROM votes
       WHERE actress_id = ${id} AND ip_address = ${ip} AND vote_month = ${month}
       LIMIT 1
    `;
    if ((existingVoteResult as any[]).length === 0) {
      return NextResponse.json({ error: '你今個月未投過呢位女優' }, { status: 400 });
    }

    await sql`
      DELETE FROM votes
       WHERE actress_id = ${id} AND ip_address = ${ip} AND vote_month = ${month}
    `;

    const monthCountRows = await sql`
      SELECT COUNT(*)::int AS count FROM votes
       WHERE actress_id = ${id} AND vote_month = ${month}
    `;
    const allCountRows = await sql`
      SELECT COUNT(*)::int AS count FROM votes WHERE actress_id = ${id}
    `;

    return NextResponse.json({
      success: true,
      vote_count: Number((monthCountRows as any[])[0]?.count || 0),
      vote_count_all: Number((allCountRows as any[])[0]?.count || 0),
      message: '已收回本月投票',
    });

  } catch (error) {
    console.error('Error removing vote:', error);
    return NextResponse.json({ error: '操作失敗' }, { status: 500 });
  }
}
