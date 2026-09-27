import test from 'node:test';
import assert from 'node:assert/strict';

const { normalizeScrapeActressUrl } = await import('../lib/scrape-url.ts');

test('normalizeScrapeActressUrl canonicalizes supported av-event URLs', () => {
  const url = normalizeScrapeActressUrl('http://av-event.jp/event/12345/?from=share#top');
  assert.equal(url, 'https://av-event.jp/event/12345/');
});

test('normalizeScrapeActressUrl rejects internal hosts', () => {
  assert.throws(
    () => normalizeScrapeActressUrl('http://127.0.0.1:8080/private'),
    /Unsupported event source host/,
  );
});

test('normalizeScrapeActressUrl builds a safe fallback URL from the event id', () => {
  const url = normalizeScrapeActressUrl('', 'fans-42');
  assert.equal(url, 'https://www.av-event.jp/event/fans-42/');
});
