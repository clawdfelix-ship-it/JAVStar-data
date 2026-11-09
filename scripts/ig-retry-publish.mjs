#!/usr/bin/env node
// 對已 FINISHED 嘅 media container 補發 media_publish（限流 code 4 自動退讓重試）
// 用法：node scripts/ig-retry-publish.mjs <container_id>
// 唔會重新上傳／建 container，避免重複帖
import { getAccount, graph, API } from './lib/ig-accounts.mjs';

const creationId = process.argv[2];
if (!creationId) {
  console.error('用法：node scripts/ig-retry-publish.mjs <container_id>');
  process.exit(1);
}
const acc = getAccount('jching');
const token = acc.page_token;
const ig = acc.ig_user_id;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 先確認 container 狀態
const st = await graph(creationId, { access_token: token, fields: 'status_code,status' });
console.log('container 狀態：', st.status_code, st.status || '');
if (st.status_code !== 'FINISHED') {
  console.error('❌ container 未就緒，唔發佈：', st.status_code);
  process.exit(1);
}

// code 4 = 應用層限流，退讓重試（最多 6 次，約 5 分鐘）
let attempt = 0;
const maxAttempts = 6;
while (true) {
  attempt += 1;
  try {
    const r = await fetch(
      `${API}/${ig}/media_publish?${new URLSearchParams({ access_token: token, creation_id: creationId })}`,
      { method: 'POST' },
    );
    const j = await r.json();
    if (j.error) {
      const isRateLimit = j.error.code === 4 || j.error.code === 17 || j.error.code === 32;
      if (isRateLimit && attempt <= maxAttempts) {
        const wait = Math.min(60000, 5000 * 2 ** (attempt - 1)); // 5s,10s,20s,40s,60s,60s
        console.log(`⏳ 限流 code ${j.error.code}，第 ${attempt} 次重試，等 ${wait / 1000}s…`);
        await sleep(wait);
        continue;
      }
      throw new Error(`media_publish → ${j.error.message} (code ${j.error.code})`);
    }
    console.log('✅ 已發佈 media id:', j.id);
    const info = await graph(j.id, { access_token: token, fields: 'permalink,thumbnail_url,timestamp' });
    console.log('permalink:', info.permalink ?? '(等陣先有)');
    console.log('timestamp:', info.timestamp);
    process.exit(0);
  } catch (e) {
    if (attempt > maxAttempts) {
      console.error('❌ 重試上限已到：', e.message);
      process.exit(1);
    }
    const wait = Math.min(60000, 5000 * 2 ** (attempt - 1));
    console.log(`⏳ 網絡錯誤（${e.message}），第 ${attempt} 次重試，等 ${wait / 1000}s…`);
    await sleep(wait);
  }
}
