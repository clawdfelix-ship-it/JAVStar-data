import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildPartnerGateUrl,
  escapeSqlLiteral,
  getEventHref,
  getHkDateString,
  normalizePartnerTarget,
  normalizeSubmissionPrefecture,
} from './event-utils';

test('escapeSqlLiteral neutralizes single-quote injection payloads', () => {
  assert.equal(
    escapeSqlLiteral("' OR 1=1 --"),
    "'' OR 1=1 --",
  );
});

test('normalizeSubmissionPrefecture maps generic Taiwan submissions to Taipei', () => {
  assert.equal(normalizeSubmissionPrefecture('台灣'), '台北');
  assert.equal(normalizeSubmissionPrefecture('香港'), '香港');
});

test('normalizePartnerTarget upgrades bare Telegram targets to https', () => {
  assert.equal(normalizePartnerTarget('t.me/example_group'), 'https://t.me/example_group');
  assert.equal(normalizePartnerTarget('https://tickets.example.com'), 'https://tickets.example.com');
  assert.equal(normalizePartnerTarget('javascript:alert(1)'), '');
});

test('buildPartnerGateUrl only emits gate links for safe external targets', () => {
  const gateUrl = buildPartnerGateUrl('t.me/example_group', '社群活動');
  assert.ok(gateUrl.startsWith('/partner?'));
  assert.ok(gateUrl.includes('to=https%3A%2F%2Ft.me%2Fexample_group'));
  assert.equal(buildPartnerGateUrl('', '沒有來源'), '');
});

test('getEventHref avoids fabricating av-event links for community submissions', () => {
  assert.equal(getEventHref({ id: 'fans-123', url: '' }), null);
  assert.equal(
    getEventHref({ id: '39201', url: '' }),
    'https://www.av-event.jp/event/39201/',
  );
});

test('getHkDateString uses Hong Kong date rollover', () => {
  assert.equal(
    getHkDateString(new Date('2026-10-15T16:30:00.000Z')),
    '2026-10-16',
  );
});
