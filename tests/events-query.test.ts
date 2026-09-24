import test from 'node:test';
import assert from 'node:assert/strict';

import { buildEventQueries } from '../lib/events-query.ts';

test('buildEventQueries keeps attacker-controlled filters out of SQL text', () => {
  const prefecture = `Tokyo' OR 1=1 --`;
  const eventType = `握手会'; DROP TABLE votes; --`;

  const built = buildEventQueries({
    prefecture,
    eventType,
    region: 'all',
    page: 1,
    limit: 50,
    requestedSortBy: 'datetime',
    requestedSortOrder: 'asc',
    includePast: false,
  });

  assert.match(built.dataQuery, /\$1/);
  assert.match(built.dataQuery, /\$2/);
  assert.doesNotMatch(built.dataQuery, /OR 1=1/);
  assert.doesNotMatch(built.dataQuery, /DROP TABLE votes/);
  assert.doesNotMatch(built.countQuery, /OR 1=1/);
  assert.deepEqual(built.countParams, [prefecture, eventType]);
  assert.equal(built.dataParams[0], prefecture);
  assert.equal(built.dataParams[1], eventType);
});
