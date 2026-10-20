import test from 'node:test';
import assert from 'node:assert/strict';

import { hasAdminToken } from '../lib/token-auth.ts';
import { buildEventsWhereClause } from '../lib/events-query.ts';

test('admin write auth rejects requests without the configured token', () => {
  const headers = new Headers({ 'content-type': 'application/json' });
  assert.equal(hasAdminToken(headers, 'top-secret'), false);
});

test('admin write auth accepts the configured token', () => {
  const headers = new Headers({ 'x-admin-token': 'top-secret' });
  assert.equal(hasAdminToken(headers, 'top-secret'), true);
});

test('event filters escape single-quoted user input before building SQL', () => {
  const clause = buildEventsWhereClause({
    includePast: false,
    prefecture: "' OR 1=1 --",
    eventType: "dvd' UNION SELECT * FROM users --",
    organizer: "O'Reilly",
    region: 'all',
  });

  assert.match(clause, /e\.prefecture = ''' OR 1=1 --'/);
  assert.match(clause, /e\.event_type = 'dvd'' UNION SELECT \* FROM users --'/);
  assert.match(clause, /e\.organizer = 'O''Reilly'/);
  assert.doesNotMatch(clause, /e\.prefecture = '' OR 1=1 --'/);
});
