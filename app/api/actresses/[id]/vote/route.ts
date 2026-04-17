import sql from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

interface Params {
  params: Promise<{ id: string }>;
}

// GET /api/actresses/[id]/vote - Get vote count
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
               request.headers.get('x-real-ip') ||
               'unknown';

    // Get vote count
    const voteCountResult = await sql`SELECT COUNT(*) as count FROM votes WHERE actress_id = ${id}`;
    const voteCount = Number((voteCountResult as any[])[0]?.count || 0);

    // Check if this IP has voted
    const userVoteResult = await sql`SELECT * FROM votes WHERE actress_id = ${id} AND ip_address = ${ip}`;
    const hasVoted = (userVoteResult as any[]).length > 0;

    return NextResponse.json({
      actress_id: id,
      vote_count: voteCount,
      has_voted: hasVoted,
    });

  } catch (error) {
    console.error('Error fetching vote:', error);
    return NextResponse.json({ error: 'Failed to fetch vote' }, { status: 500 });
  }
}

// POST /api/actresses/[id]/vote - Cast vote
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
               request.headers.get('x-real-ip') ||
               'unknown';

    // Check if actress exists
    const actressResult = await sql`SELECT * FROM actresses WHERE id = ${id}`;
    if ((actressResult as any[]).length === 0) {
      return NextResponse.json({ error: 'Actress not found' }, { status: 404 });
    }

    // Check if already voted
    const existingVoteResult = await sql`SELECT * FROM votes WHERE actress_id = ${id} AND ip_address = ${ip}`;
    if ((existingVoteResult as any[]).length > 0) {
      return NextResponse.json(
        { error: '你已經投過呢個女優了！每個 IP 每日每女優只能投一票', voted: false },
        { status: 400 }
      );
    }

    // Record vote
    await sql`INSERT INTO votes (actress_id, ip_address) VALUES (${id}, ${ip})`;

    // Get updated count
    const voteCountResult = await sql`SELECT COUNT(*) as count FROM votes WHERE actress_id = ${id}`;
    const voteCount = Number((voteCountResult as any[])[0]?.count || 0);

    return NextResponse.json({
      success: true,
      vote_count: voteCount,
      message: '投票成功！多謝你支持 🎉',
    });

  } catch (error) {
    console.error('Error casting vote:', error);
    return NextResponse.json({ error: '投票失敗，請稍後再試' }, { status: 500 });
  }
}

// DELETE /api/actresses/[id]/vote - Remove vote
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
               request.headers.get('x-real-ip') ||
               'unknown';

    const existingVoteResult = await sql`SELECT * FROM votes WHERE actress_id = ${id} AND ip_address = ${ip}`;
    if ((existingVoteResult as any[]).length === 0) {
      return NextResponse.json({ error: '你未投過呢個女優' }, { status: 400 });
    }

    await sql`DELETE FROM votes WHERE actress_id = ${id} AND ip_address = ${ip}`;

    return NextResponse.json({
      success: true,
      message: '已收回投票',
    });

  } catch (error) {
    console.error('Error removing vote:', error);
    return NextResponse.json({ error: '操作失敗' }, { status: 500 });
  }
}