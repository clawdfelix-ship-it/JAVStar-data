import test from 'node:test';
import assert from 'node:assert/strict';

const { buildEventsQueries } = await import('../lib/events-query.ts');

test('buildEventsQueries parameterizes prefecture and event type filters', () => {
  const maliciousPrefecture = "' UNION SELECT secret FROM contact_messages --";
  const { eventQuery, eventParams, countQuery, countParams } = buildEventsQueries({
    prefecture: maliciousPrefecture,
    eventType: 'other',
    region: 'all',
    includePast: false,
    limit: 50,
    offset: 100,
    requestedSortBy: 'datetime',
    requestedSortOrder: 'ASC',
  });

  assert.match(eventQuery, /e\.prefecture = \$1/);
  assert.match(eventQuery, /e\.event_type = \$2/);
  assert.match(eventQuery, /LIMIT \$3 OFFSET \$4/);
  assert.doesNotMatch(eventQuery, /contact_messages/);
  assert.deepEqual(eventParams, [maliciousPrefecture, 'other', 50, 100]);

  assert.match(countQuery, /prefecture = \$1/);
  assert.match(countQuery, /event_type = \$2/);
  assert.doesNotMatch(countQuery, /contact_messages/);
  assert.deepEqual(countParams, [maliciousPrefecture, 'other']);
});

test('buildEventsQueries keeps region filters while normalizing datetime sort order', () => {
  const { eventQuery } = buildEventsQueries({
    prefecture: null,
    eventType: null,
    region: 'hk',
    includePast: true,
    limit: 10,
    offset: 0,
    requestedSortBy: 'datetime',
    requestedSortOrder: 'ASC',
  });

  assert.match(eventQuery, /prefecture LIKE '%香港%'/);
  assert.match(eventQuery, /ORDER BY e\.date_iso DESC NULLS LAST, e\.created_at DESC/);
});
