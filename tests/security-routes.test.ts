import test from 'node:test';
import assert from 'node:assert/strict';

import { buildEventsListQueries } from '../lib/events-list-query.ts';
import { isAdminToken } from '../lib/token-check.ts';

test('events list query parameterizes user-controlled filters and paginates safely', () => {
  const searchParams = new URLSearchParams({
    prefecture: "' OR 1=1 --",
    type: "meet' UNION SELECT * FROM users --",
    organizer: "ops' OR 'x'='x",
    page: '-5',
    limit: 'abc',
  });

  const result = buildEventsListQueries({ searchParams });

  assert.equal(result.page, 1);
  assert.equal(result.limit, 200);
  assert.equal(result.offset, 0);
  assert.match(result.fullQuery, /e\.prefecture = \$1/);
  assert.match(result.fullQuery, /e\.event_type = \$2/);
  assert.match(result.fullQuery, /e\.organizer = \$3/);
  assert.match(result.fullQuery, /LIMIT \$4/);
  assert.match(result.fullQuery, /OFFSET \$5/);
  assert.doesNotMatch(result.fullQuery, /OR 1=1|UNION SELECT|ops'/);
  assert.deepEqual(result.fullParams, [
    "' OR 1=1 --",
    "meet' UNION SELECT * FROM users --",
    "ops' OR 'x'='x",
    200,
    0,
  ]);
  assert.deepEqual(result.countParams, [
    "' OR 1=1 --",
    "meet' UNION SELECT * FROM users --",
    "ops' OR 'x'='x",
  ]);
});

test('events list query clamps oversized limits and computes offset', () => {
  const searchParams = new URLSearchParams({
    page: '3',
    limit: '5000',
  });

  const result = buildEventsListQueries({ searchParams });

  assert.equal(result.limit, 2000);
  assert.equal(result.offset, 4000);
  assert.deepEqual(result.fullParams.slice(-2), [2000, 4000]);
});

test('admin token check rejects ingest token for admin-only routes', () => {
  const env = {
    ADMIN_TOKEN: 'admin-secret',
    INGEST_TOKEN: 'ingest-secret',
  } as any;

  assert.equal(isAdminToken('admin-secret', env), true);
  assert.equal(isAdminToken('ingest-secret', env), false);
  assert.equal(isAdminToken(null, env), false);
});
