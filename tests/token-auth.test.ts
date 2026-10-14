import test from 'node:test';
import assert from 'node:assert/strict';

import {
  hasAdminOrIngestToken,
  hasAdminToken,
  hasIngestToken,
  matchesToken,
} from '../lib/token-auth.ts';

test('admin token only satisfies admin auth', () => {
  const headers = new Headers({
    'x-admin-token': 'admin-secret',
  });

  assert.equal(hasAdminToken(headers, 'admin-secret'), true);
  assert.equal(hasIngestToken(headers, 'ingest-secret'), false);
});

test('ingest token only satisfies ingest auth', () => {
  const headers = new Headers({
    'x-ingest-token': 'ingest-secret',
  });

  assert.equal(hasIngestToken(headers, 'ingest-secret'), true);
  assert.equal(hasAdminToken(headers, 'admin-secret'), false);
});

test('mixed auth helper still allows either dedicated token', () => {
  const adminHeaders = new Headers({
    'x-admin-token': 'admin-secret',
  });
  const ingestHeaders = new Headers({
    'x-ingest-token': 'ingest-secret',
  });

  assert.equal(hasAdminOrIngestToken(adminHeaders, 'admin-secret', 'ingest-secret'), true);
  assert.equal(hasAdminOrIngestToken(ingestHeaders, 'admin-secret', 'ingest-secret'), true);
});

test('token matching fails closed when header or secret is missing', () => {
  assert.equal(matchesToken(null, 'expected'), false);
  assert.equal(matchesToken('provided', undefined), false);
  assert.equal(matchesToken('provided', 'expected'), false);
});
