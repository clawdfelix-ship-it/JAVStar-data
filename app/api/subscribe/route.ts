import { NextRequest, NextResponse } from 'next/server';
import { upsertEmailSubscription } from '@/lib/emailSubscriptions';

export async function POST(request: NextRequest) {
  try {
    const { email, actress_name, source } = await request.json();
    await upsertEmailSubscription({ email, actress_name, source });

    return NextResponse.json({ success: true, message: '已訂閱！有新活動時會第一時間通知你 🎉' });
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid email') {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
