import test from 'node:test';
import assert from 'node:assert/strict';
import { buildEventsWhere } from '../lib/eventsWhere';

// Regression for the unauthenticated SQL injection on GET /api/events:
// client-supplied prefecture / type / organizer must be returned as bound
// parameters, never spliced into the SQL text.

test('prefecture is parameterized, not interpolated', () => {
  const payload = "x' OR '1'='1";
  const w = buildEventsWhere({ past: true, prefecture: payload }, { alias: true });
  assert.ok(!w.text.includes('OR'), `SQL text leaked input: ${w.text}`);
  assert.ok(w.text.includes('e.prefecture = $1'), w.text);
  assert.deepEqual(w.params, [payload]);
});

test('eventType is parameterized, not interpolated', () => {
  const payload = "meet'; DROP TABLE events;--";
  const w = buildEventsWhere({ past: true, eventType: payload }, { alias: false });
  assert.ok(!w.text.includes('DROP'), `SQL text leaked input: ${w.text}`);
  assert.ok(w.text.includes('event_type = $1'), w.text);
  assert.deepEqual(w.params, [payload]);
});

test('organizer is parameterized (no manual quote escaping needed)', () => {
  const payload = "a' OR 1=1 --";
  const w = buildEventsWhere({ past: true, organizer: payload }, { alias: true });
  assert.ok(!w.text.includes('1=1'), `SQL text leaked input: ${w.text}`);
  assert.ok(w.text.includes('e.organizer = $1'), w.text);
  assert.deepEqual(w.params, [payload]);
});

test('all three filters bind in order', () => {
  const w = buildEventsWhere(
    { past: true, prefecture: '香港', eventType: 'meet', organizer: 'javstarmeet' },
    { alias: true }
  );
  assert.deepEqual(w.params, ['香港', 'meet', 'javstarmeet']);
  assert.ok(w.text.includes('e.prefecture = $1'));
  assert.ok(w.text.includes('e.event_type = $2'));
  assert.ok(w.text.includes('e.organizer = $3'));
});

test('unknown region value is ignored (no injection via region)', () => {
  const w = buildEventsWhere({ past: true, region: "japan' OR 1=1--" }, { alias: true });
  assert.ok(!w.text.includes('1=1'), `SQL text leaked input: ${w.text}`);
  assert.deepEqual(w.params, []);
});

test('whitelisted region still produces its fixed clause', () => {
  const w = buildEventsWhere({ past: true, region: 'hk' }, { alias: true });
  assert.ok(w.text.includes("e.prefecture LIKE '%香港%'"), w.text);
  assert.deepEqual(w.params, []);
});

test('past=false keeps the upcoming-only cutoff', () => {
  const upcoming = buildEventsWhere({ past: false });
  const all = buildEventsWhere({ past: true });
  assert.ok(upcoming.text.includes('e.date_iso >= CURRENT_DATE'));
  assert.ok(!all.text.includes('e.date_iso >= CURRENT_DATE'));
});
