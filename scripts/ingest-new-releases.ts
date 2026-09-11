/**
 * 每月新作 ingest：讀 camoufox scraper 輸出嘅 JSON，upsert 入 Neon new_releases。
 *
 * 用法：
 *   # 1) python 爬（camoufox 過 Cloudflare），JSON 落檔
 *   .venv-scrape/bin/python scripts/scrape-new-releases-camoufox.py 5 > /tmp/nr.json
 *   # 2) 本 script 入庫（ON CONFLICT video_code 更新標題/圖/連結，created_at 保留首次見到嘅時間）
 *   npx tsx scripts/ingest-new-releases.ts /tmp/nr.json
 *
 * 設計：
 * - video_code 係唯一鍵；新貨 INSERT，舊貨 DO UPDATE（補可能變嘅封面/標題）。
 * - created_at 維持首次入庫時間（首頁 ORDER BY created_at DESC = 真正「新作」）。
 * - release_date：JavLibrary 列表頁冇日期，維持 NULL，唔亂塞。
 */
import { readFile } from 'node:fs/promises';
import { getSql } from '../lib/db';

interface ScrapeItem {
  video_code?: string;
  title?: string;
  cover_url?: string;
  detail_url?: string;
}

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error('用法: tsx scripts/ingest-new-releases.ts <scrape.json>');
    process.exit(2);
  }

  const raw = await readFile(file, 'utf-8');
  let items: ScrapeItem[];
  try {
    items = JSON.parse(raw);
  } catch (e) {
    console.error('❌ JSON parse 失敗:', e instanceof Error ? e.message : e);
    process.exit(2);
  }
  if (!Array.isArray(items)) {
    console.error('❌ 預期頂層係陣列');
    process.exit(2);
  }

  const sql = getSql() as any;

  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const it of items) {
    const code = (it.video_code || '').trim();
    const title = (it.title || '').trim();
    if (!code || !title) {
      skipped++;
      continue;
    }
    const cover = it.cover_url?.trim() || null;
    const detail = it.detail_url?.trim() || null;

    // 先睇係咪已存在，分開計 inserted / updated（ON CONFLICT 唔直接回傳 xmax 旗標，呢個數量級逐條無妨，~100/日）
    const exists = await sql.query(
      `SELECT 1 FROM new_releases WHERE video_code = $1 LIMIT 1`,
      [code]
    ) as any[];

    if (exists.length) {
      await sql.query(
        `UPDATE new_releases
            SET title = $2, cover_url = COALESCE($3, cover_url),
                detail_url = COALESCE($4, detail_url)
          WHERE video_code = $1`,
        [code, title, cover, detail]
      );
      updated++;
    } else {
      await sql.query(
        `INSERT INTO new_releases (video_code, title, cover_url, detail_url, created_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (video_code) DO NOTHING`,
        [code, title, cover, detail]
      );
      inserted++;
    }
  }

  const cnt = await sql.query(`SELECT count(*)::int AS cnt, max(created_at) AS latest FROM new_releases`, []) as any[];
  console.log(`[INGEST] 讀入 ${items.length}｜新增 ${inserted}｜更新 ${updated}｜跳過 ${skipped}`);
  console.log(`[INGEST] 表總數 ${cnt[0].cnt}｜最新 created_at ${cnt[0].latest}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('[INGEST] 失敗:', e);
    process.exit(1);
  });
