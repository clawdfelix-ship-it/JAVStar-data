import test from 'node:test';
import assert from 'node:assert/strict';

import { confirmFanBinding } from '../lib/fanBindings.ts';
import { matchesAnyToken, matchesToken } from '../lib/token-auth.ts';

test('admin-only token matching rejects ingest token', () => {
  assert.equal(matchesToken('ingest-secret', 'admin-secret'), false);
  assert.equal(matchesToken('admin-secret', 'admin-secret'), true);
  assert.equal(matchesAnyToken('ingest-secret', ['admin-secret', 'ingest-secret']), true);
});

test('confirmFanBinding performs one atomic database roundtrip', async () => {
  let calls = 0;
  let sqlText = '';
  let sqlValues: unknown[] = [];

  const db = async (strings: TemplateStringsArray, ...values: unknown[]) => {
    calls += 1;
    sqlText = strings.join('__slot__');
    sqlValues = values;
    return [{ actress_id: 42 }];
  };

  const actressId = await confirmFanBinding(db, {
    bindCode: 'BindCode88',
    chatId: 778899,
  });

  assert.equal(actressId, '42');
  assert.equal(calls, 1);
  assert.match(sqlText, /WITH updated_link AS/);
  assert.match(sqlText, /UPDATE fan_tg_links/);
  assert.match(sqlText, /INSERT INTO fan_subscriptions/);
  assert.deepEqual(sqlValues, [778899, 'BindCode88', 'tg:778899', 'tgchat:778899']);
});

test('confirmFanBinding returns null when the binding code is not claimable', async () => {
  const db = async () => [] as Array<{ actress_id: string | number }>;

  const actressId = await confirmFanBinding(db, {
    bindCode: 'MissingCode',
    chatId: 123,
    tgHandle: 'alice',
  });

  assert.equal(actressId, null);
});
