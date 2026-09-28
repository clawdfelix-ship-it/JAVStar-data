import test from 'node:test';
import assert from 'node:assert/strict';

import { buildEventWhereClause, checkToken } from '../lib/route-security.mjs';

test('checkToken fails closed for missing or invalid tokens', () => {
  assert.equal(checkToken(null, 'secret'), false);
  assert.equal(checkToken('secret', undefined), false);
  assert.equal(checkToken('wrong', 'secret'), false);
  assert.equal(checkToken('secret', 'secret'), true);
});

test('buildEventWhereClause keeps attacker input out of SQL text', () => {
  const organizer = "foo' OR 1=1 --";
  const prefecture = "東京'; DROP TABLE events; --";
  const eventType = "pop' UNION SELECT * FROM votes --";

  const { whereClause, params } = buildEventWhereClause({
    prefecture,
    eventType,
    organizer,
    region: 'taiwan',
    includePast: false,
    tableAlias: 'e',
  });

  assert.match(whereClause, /e\.prefecture = \$1/);
  assert.match(whereClause, /e\.event_type = \$2/);
  assert.match(whereClause, /e\.organizer = \$3/);
  assert.doesNotMatch(whereClause, /DROP TABLE|UNION SELECT|OR 1=1/);
  assert.deepEqual(params, [prefecture, eventType, organizer]);
});
