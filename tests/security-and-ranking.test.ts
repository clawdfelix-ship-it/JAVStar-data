import test from 'node:test';
import assert from 'node:assert/strict';

import { replaceDmmRanking } from '../lib/dmm-ranking.ts';
import { matchesAnyToken, matchesToken, timingSafeEqual } from '../lib/token-auth.ts';

type RecordedQuery = {
  text: string;
  values: unknown[];
};

function createFakeSql() {
  const recorded: RecordedQuery[] = [];
  const transactions: RecordedQuery[][] = [];

  const sql = ((strings: TemplateStringsArray, ...values: unknown[]) => {
    const text = strings.join(' ');
    const query = { text, values };
    recorded.push(query);
    return query;
  }) as ((strings: TemplateStringsArray, ...values: unknown[]) => RecordedQuery) & {
    transaction: (queries: RecordedQuery[]) => Promise<void>;
  };

  sql.transaction = async (queries: RecordedQuery[]) => {
    transactions.push(queries);
  };

  return { sql, recorded, transactions };
}

test('timingSafeEqual rejects different lengths and mismatched bytes', () => {
  assert.equal(timingSafeEqual('admin-secret', 'admin-secret'), true);
  assert.equal(timingSafeEqual('admin-secret', 'admin-secrex'), false);
  assert.equal(timingSafeEqual('short', 'longer'), false);
});

test('matchesToken fails closed for missing or wrong tokens', () => {
  assert.equal(matchesToken('admin-secret', 'admin-secret'), true);
  assert.equal(matchesToken('ingest-secret', 'admin-secret'), false);
  assert.equal(matchesToken(null, 'admin-secret'), false);
  assert.equal(matchesToken('admin-secret', undefined), false);
});

test('matchesAnyToken only accepts configured candidates', () => {
  assert.equal(matchesAnyToken('ingest-secret', ['admin-secret', 'ingest-secret']), true);
  assert.equal(matchesAnyToken('user-secret', ['admin-secret', 'ingest-secret']), false);
});

test('replaceDmmRanking batches delete and inserts into one transaction', async () => {
  const { sql, transactions } = createFakeSql();

  const inserted = await replaceDmmRanking(sql, [
    { rank: 1, videoCode: 'ABCD-001', title: 'first' },
    { rank: 2, videoCode: 'ABCD-002', title: 'second', isNew: true, rankChange: 'up' },
  ], 'DMM');

  assert.equal(inserted, 2);
  assert.equal(transactions.length, 1);
  assert.equal(transactions[0].length, 3);
  assert.match(transactions[0][0].text, /DELETE FROM dvd_ranking/);
  assert.match(transactions[0][1].text, /INSERT INTO dvd_ranking/);
  assert.match(transactions[0][2].text, /INSERT INTO dvd_ranking/);
});
