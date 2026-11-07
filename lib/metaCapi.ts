import { createHash } from 'node:crypto';

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

type LeadInput = {
  email: string;
  eventId: string;
  eventSourceUrl: string;
  ipAddress: string;
  userAgent: string;
  fbp?: string;
  fbc?: string;
};

export async function sendMetaLead(input: LeadInput) {
  const pixelId = process.env.META_PIXEL_ID;
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN;
  if (!pixelId || !accessToken) return { configured: false, ok: false };

  const userData: Record<string, unknown> = {
    em: [sha256(input.email)],
    client_ip_address: input.ipAddress,
    client_user_agent: input.userAgent,
  };
  if (input.fbp) userData.fbp = input.fbp;
  if (input.fbc) userData.fbc = input.fbc;

  const payload: Record<string, unknown> = {
    data: [{
      event_name: 'Lead',
      event_time: Math.floor(Date.now() / 1000),
      event_id: input.eventId,
      event_source_url: input.eventSourceUrl,
      action_source: 'website',
      user_data: userData,
    }],
  };
  if (process.env.META_TEST_EVENT_CODE) payload.test_event_code = process.env.META_TEST_EVENT_CODE;

  try {
    const response = await fetch(
      `https://graph.facebook.com/v21.0/${encodeURIComponent(pixelId)}/events?access_token=${encodeURIComponent(accessToken)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(8000),
      },
    );
    const result = await response.json();
    if (!response.ok) {
      console.error('Meta CAPI Lead failed', response.status, result?.error?.code, result?.error?.message);
      return { configured: true, ok: false, status: response.status };
    }
    return { configured: true, ok: true, eventsReceived: result.events_received };
  } catch (error) {
    console.error('Meta CAPI Lead error', error instanceof Error ? error.message : error);
    return { configured: true, ok: false };
  }
}
