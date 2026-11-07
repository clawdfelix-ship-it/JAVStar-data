import assert from 'node:assert/strict';
import { sql } from '../lib/db/index.ts';

const base = process.env.TEST_BASE_URL || 'http://localhost:3100';
const stamp = Date.now();
const email = `jching-qa-${stamp}@example.com`;
const eventId = crypto.randomUUID();

async function post(address: string, id = crypto.randomUUID()) {
  const response = await fetch(`${base}/api/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '203.0.113.77' },
    body: JSON.stringify({ email: address, source: 'promo', event_id: id }),
  });
  return { status: response.status, data: await response.json() };
}

try {
  await sql`DELETE FROM email_subscribers WHERE email LIKE 'jching-qa-%@example.com'`;
  const first = await post(email, eventId);
  assert.equal(first.status, 200);
  assert.equal(first.data.event_id, eventId);
  console.log('PASS 1 valid subscription + event_id');

  assert.equal((await post(email)).status, 200);
  const duplicate = (await sql`SELECT count(*)::int AS n FROM email_subscribers WHERE email=${email}`) as Array<{ n: number }>;
  assert.equal(duplicate[0].n, 1);
  console.log('PASS 2 duplicate upsert stays one row');

  assert.equal((await post('not-an-email')).status, 400);
  console.log('PASS 3 invalid email rejected');

  const rows = (await sql`SELECT unsubscribe_token::text AS token FROM email_subscribers WHERE email=${email}`) as Array<{ token: string }>;
  const unsub = await fetch(`${base}/api/unsubscribe?token=${rows[0].token}`);
  assert.equal(unsub.status, 200);
  let state = (await sql`SELECT status FROM email_subscribers WHERE email=${email}`) as Array<{ status: string }>;
  assert.equal(state[0].status, 'unsubscribed');
  assert.equal((await post(email)).status, 200);
  state = (await sql`SELECT status FROM email_subscribers WHERE email=${email}`) as Array<{ status: string }>;
  assert.equal(state[0].status, 'active');
  console.log('PASS 4 unsubscribe and resubscribe');

  for (let i = 0; i < 9; i++) assert.equal((await post(`jching-qa-${stamp}-${i}@example.com`)).status, 200);
  assert.equal((await post(`jching-qa-${stamp}-overflow@example.com`)).status, 429);
  console.log('PASS 5 rate limit at 10 submissions/hour/IP');
} finally {
  await sql`DELETE FROM email_subscribers WHERE email LIKE ${`jching-qa-${stamp}%@example.com`}`;
  const left = (await sql`SELECT count(*)::int AS n FROM email_subscribers WHERE email LIKE ${`jching-qa-${stamp}%@example.com`}`) as Array<{ n: number }>;
  assert.equal(left[0].n, 0);
  console.log('QA rows cleaned: 0 remaining');
}
