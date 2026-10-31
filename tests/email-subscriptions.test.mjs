import test from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeEmailSubscription,
  upsertEmailSubscription,
} from '../lib/email-subscriptions.ts';

test('email subscribe normalizes valid payloads and rejects invalid emails', () => {
  assert.deepEqual(
    normalizeEmailSubscription({
      email: '  FAN@Example.com ',
      actress_name: '  三上悠亜  ',
      source: ' homepage ',
    }),
    {
      email: 'fan@example.com',
      actressName: '三上悠亜',
      source: 'homepage',
    }
  );
  assert.equal(normalizeEmailSubscription({ email: 'not-an-email' }), null);
});

test('email subscribe persists via an idempotent upsert instead of dropping the request', async () => {
  const calls = [];
  const fakeDb = {
    async query(sql, params) {
      calls.push({ sql, params });
      return [];
    },
  };

  await upsertEmailSubscription(
    {
      email: 'fan@example.com',
      actressName: '三上悠亜',
      source: 'homepage',
    },
    fakeDb
  );

  assert.equal(calls.length, 2);
  assert.match(calls[0].sql, /CREATE TABLE IF NOT EXISTS email_subscriptions/);
  assert.match(calls[1].sql, /INSERT INTO email_subscriptions/);
  assert.match(calls[1].sql, /ON CONFLICT \(email\) DO UPDATE/);
  assert.deepEqual(calls[1].params, ['fan@example.com', '三上悠亜', 'homepage']);
});
