import { db } from '@/lib/db';
import { votes, actresses } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/actresses/[id]/vote - Get vote count and if user voted
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
               request.headers.get('x-real-ip') ||
               'unknown';

    // Get vote count
    const voteCount = db
      .select({ count: sql<number>`count(*)` })
      .from(votes)
      .where(eq(votes.actress_id, id))
      .get();

    // Check if this IP has voted
    const userVote = db
      .select()
      .from(votes)
      .where(and(eq(votes.actress_id, id), eq(votes.ip_address, ip)))
      .get();

    return NextResponse.json({
      actress_id: id,
      vote_count: voteCount?.count || 0,
      has_voted: !!userVote,
    });

  } catch (error) {
    console.error('Error fetching vote:', error);
    return NextResponse.json({ error: 'Failed to fetch vote' }, { status: 500 });
  }
}

// POST /api/actresses/[id]/vote - Cast a vote
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
               request.headers.get('x-real-ip') ||
               'unknown';

    // Check if actress exists
    const actress = db.select().from(actresses).where(eq(actresses.id, id)).get();
    if (!actress) {
      return NextResponse.json({ error: 'Actress not found' }, { status: 404 });
    }

    // Check if already voted
    const existingVote = db
      .select()
      .from(votes)
      .where(and(eq(votes.actress_id, id), eq(votes.ip_address, ip)))
      .get();

    if (existingVote) {
      return NextResponse.json(
        { error: '你已經投過呢個女優了！每個 IP 每日每女優只能投一票', voted: false },
        { status: 400 }
      );
    }

    // Record vote
    db.insert(votes).values({
      actress_id: id,
      ip_address: ip,
      voted_at: new Date().toISOString(),
    }).run();

    // Get updated count
    const voteCount = db
      .select({ count: sql<number>`count(*)` })
      .from(votes)
      .where(eq(votes.actress_id, id))
      .get();

    return NextResponse.json({
      success: true,
      vote_count: voteCount?.count || 1,
      message: '投票成功！多謝你支持 🎉',
    });

  } catch (error) {
    console.error('Error casting vote:', error);
    return NextResponse.json({ error: '投票失敗，請稍後再試' }, { status: 500 });
  }
}

// DELETE /api/actresses/[id]/vote - Remove vote
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
               request.headers.get('x-real-ip') ||
               'unknown';

    const existingVote = db
      .select()
      .from(votes)
      .where(and(eq(votes.actress_id, id), eq(votes.ip_address, ip)))
      .get();

    if (!existingVote) {
      return NextResponse.json({ error: '你未投過呢個女優' }, { status: 400 });
    }

    db.delete(votes)
      .where(and(eq(votes.actress_id, id), eq(votes.ip_address, ip)))
      .run();

    return NextResponse.json({
      success: true,
      message: '已收回投票',
    });

  } catch (error) {
    console.error('Error removing vote:', error);
    return NextResponse.json({ error: '操作失敗' }, { status: 500 });
  }
}
