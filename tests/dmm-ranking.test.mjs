import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeRankingPayload, replaceRanking } from '../lib/dmm-ranking.mjs';

test('normalizeRankingPayload rejects empty or oversized payloads', () => {
  assert.throws(() => normalizeRankingPayload([]), /ranking array required/);
  assert.throws(
    () => normalizeRankingPayload(Array.from({ length: 101 }, (_, index) => ({ rank: index + 1 }))),
    /ranking array too large/
  );
});

test('replaceRanking performs delete and insert statements in one transaction', async () => {
  const calls = [];
  function sqlClient(strings, ...values) {
    const statement = { text: strings.join('?'), values };
    calls.push(statement);
    return statement;
  }

  let transactionStatements = null;
  sqlClient.transaction = async (statements) => {
    transactionStatements = statements;
    return statements;
  };

  const inserted = await replaceRanking(sqlClient, [
    {
      rank: 1,
      videoCode: 'ABC-123',
      title: 'Top title',
      actress: 'Example',
      maker: 'Studio',
      coverUrl: 'https://example.com/cover.jpg',
      detailUrl: 'https://example.com/detail',
      isNew: true,
      rankChange: 'up',
    },
  ], 'DMM');

  assert.equal(inserted, 1);
  assert.equal(transactionStatements.length, 2);
  assert.match(transactionStatements[0].text, /DELETE FROM dvd_ranking/);
  assert.match(transactionStatements[1].text, /INSERT INTO dvd_ranking/);
  assert.deepEqual(transactionStatements[1].values.slice(0, 3), [1, 'ABC-123', 'Top title']);
  assert.equal(calls.length, 2);
});
