import test from 'node:test';
import assert from 'node:assert/strict';

import { buildEventsQueries } from '../lib/events-query.ts';
import { checkToken } from '../lib/token-auth.ts';

test('events query keeps attacker input out of SQL text', () => {
  const injection = `' OR 1=1 --`;
  const { fullQuery, countQuery, queryParams, countParams } = buildEventsQueries({
    prefecture: injection,
    eventType: 'sale',
    organizer: 'team',
    region: 'hk',
    includePast: false,
    limit: 50,
    sortBy: 'datetime',
    sortOrder: 'ASC',
  });

  assert.equal(fullQuery.includes(injection), false);
  assert.equal(countQuery.includes(injection), false);
  assert.match(fullQuery, /e\.prefecture = \$1/);
  assert.match(fullQuery, /e\.event_type = \$2/);
  assert.match(fullQuery, /e\.organizer = \$3/);
  assert.deepEqual(queryParams, [injection, 'sale', 'team', 50]);
  assert.deepEqual(countParams, [injection, 'sale', 'team']);
});

test('events query keeps ORDER BY on the whitelist', () => {
  const { fullQuery } = buildEventsQueries({
    prefecture: null,
    eventType: null,
    organizer: null,
    region: null,
    includePast: true,
    limit: 20,
    sortBy: 'rank; DROP TABLE events;--',
    sortOrder: 'ASC',
  });

  assert.match(fullQuery, /ORDER BY e\.date_iso DESC NULLS LAST, e\.created_at DESC/);
});

test('token checks fail closed for admin writes', () => {
  assert.equal(checkToken(null, 'secret'), false);
  assert.equal(checkToken('secret', undefined), false);
  assert.equal(checkToken('wrong!', 'secret'), false);
  assert.equal(checkToken('secret', 'secret'), true);
});
