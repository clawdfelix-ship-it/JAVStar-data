export type RankingPayloadItem = {
  rank: number;
  videoCode?: string;
  title?: string;
  actress?: string;
  maker?: string;
  coverUrl?: string;
  detailUrl?: string;
  isNew?: boolean;
  rankChange?: string;
};

type TransactionSql = {
  (strings: TemplateStringsArray, ...values: unknown[]): unknown;
  transaction: (queries: unknown[]) => Promise<unknown>;
};

export async function replaceDmmRanking(
  sql: TransactionSql,
  ranking: RankingPayloadItem[],
  source: string,
): Promise<number> {
  const statements = [
    sql`DELETE FROM dvd_ranking`,
    ...ranking.map((item) => sql`
      INSERT INTO dvd_ranking
      (rank, video_code, title, actress, maker, cover_url, detail_url, is_new, rank_change, source)
      VALUES (
        ${item.rank},
        ${item.videoCode || ''},
        ${item.title || ''},
        ${item.actress || ''},
        ${item.maker || ''},
        ${item.coverUrl || ''},
        ${item.detailUrl || ''},
        ${item.isNew ? true : false},
        ${item.rankChange || 'same'},
        ${source}
      )
    `),
  ];

  await sql.transaction(statements);
  return ranking.length;
}
