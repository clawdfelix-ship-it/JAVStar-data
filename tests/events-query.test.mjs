import test from 'node:test';
import assert from 'node:assert/strict';

import { buildEventsQueries, parsePositiveInt } from '../lib/events-query.mjs';

test('buildEventsQueries escapes user-controlled filters before interpolation', () => {
  const { fullQuery, countQuery } = buildEventsQueries({
    prefecture: "' OR 1=1 --",
    eventType: "meetup' UNION SELECT",
    organizer: "O'Hara",
    region: 'all',
    includePast: false,
    sortBy: 'datetime',
    sortOrder: 'DESC',
    limit: 50,
    offset: 0,
  });

  assert.match(fullQuery, /e\.prefecture = ''' OR 1=1 --'/);
  assert.match(fullQuery, /e\.event_type = 'meetup'' UNION SELECT'/);
  assert.match(fullQuery, /e\.organizer = 'O''Hara'/);
  assert.match(countQuery, /organizer = 'O''Hara'/);
  assert.doesNotMatch(fullQuery, /e\.prefecture = '' OR 1=1 --'/);
});

test('buildEventsQueries keeps page offsets in the final SQL', () => {
  const { fullQuery } = buildEventsQueries({
    prefecture: null,
    eventType: null,
    organizer: null,
    region: 'all',
    includePast: true,
    sortBy: 'datetime',
    sortOrder: 'DESC',
    limit: 50,
    offset: 50,
  });

  assert.match(fullQuery, /LIMIT 50 OFFSET 50$/);
});

test('parsePositiveInt falls back on invalid values and caps large values', () => {
  assert.equal(parsePositiveInt('-3', 1), 1);
  assert.equal(parsePositiveInt('nope', 5), 5);
  assert.equal(parsePositiveInt('5000', 200, 2000), 2000);
  assert.equal(parsePositiveInt('12', 1, 2000), 12);
});
