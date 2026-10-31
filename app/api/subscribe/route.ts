import { NextRequest, NextResponse } from 'next/server';
import { normalizeEmailSubscription, upsertEmailSubscription } from '@/lib/email-subscriptions';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const subscription = normalizeEmailSubscription(body);
    if (!subscription) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }

    await upsertEmailSubscription(subscription);

    return NextResponse.json({ success: true, message: '已訂閱！有新活動時會第一時間通知你 🎉' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
