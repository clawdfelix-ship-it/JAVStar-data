import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { email, actress_name, source } = await request.json();
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }

    // TODO: integrate with Resend or Klaviyo once API key is available
    // For now, log and return success (staging)
    console.log('EMAIL_SUBSCRIBE:', { email, actress_name, source, ts: new Date().toISOString() });

    return NextResponse.json({ success: true, message: '已訂閱！有新活動時會第一時間通知你 🎉' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}