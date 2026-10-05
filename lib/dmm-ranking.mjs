const MAX_RANKING_ITEMS = 100;

function asText(value, maxLength = 1000) {
  return String(value ?? '').slice(0, maxLength);
}

function normalizeRank(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function normalizeRankingPayload(ranking, source = 'DMM') {
  if (!Array.isArray(ranking) || ranking.length === 0) {
    throw new Error('ranking array required');
  }

  if (ranking.length > MAX_RANKING_ITEMS) {
    throw new Error(`ranking array too large (max ${MAX_RANKING_ITEMS})`);
  }

  return {
    source: asText(source, 100) || 'DMM',
    rows: ranking.map((item, index) => ({
      rank: normalizeRank(item?.rank, index + 1),
      videoCode: asText(item?.videoCode, 100),
      title: asText(item?.title, 500),
      actress: asText(item?.actress, 200),
      maker: asText(item?.maker, 200),
      coverUrl: asText(item?.coverUrl, 1000),
      detailUrl: asText(item?.detailUrl, 1000),
      isNew: item?.isNew === true,
      rankChange: asText(item?.rankChange || 'same', 50) || 'same',
    })),
  };
}

export async function replaceRanking(sqlClient, ranking, source = 'DMM') {
  const normalized = normalizeRankingPayload(ranking, source);
  const statements = [
    sqlClient`DELETE FROM dvd_ranking`,
    ...normalized.rows.map((item) => sqlClient`
      INSERT INTO dvd_ranking
      (rank, video_code, title, actress, maker, cover_url, detail_url, is_new, rank_change, source)
      VALUES (
        ${item.rank},
        ${item.videoCode},
        ${item.title},
        ${item.actress},
        ${item.maker},
        ${item.coverUrl},
        ${item.detailUrl},
        ${item.isNew},
        ${item.rankChange},
        ${normalized.source}
      )
    `),
  ];

  await sqlClient.transaction(statements);
  return normalized.rows.length;
}
