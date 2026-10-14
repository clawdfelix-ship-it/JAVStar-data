#!/usr/bin/env node
/**
 * sync-shopify-events.mjs — 把 JAVStarMeet (Shopify) 自家香港場同步入 JCHING 日曆。
 *
 * 為何存在：JCHING 爬蟲只搵到日本/台灣外部場，自家主辦嘅香港場唔會被爬，要由 Shopify 反向餵入。
 * 設計：本機拉 Shopify（唔將 Shopify secret 放入 JCHING），歸納「一場活動一票」後，
 *       用 INGEST token POST 去 JCHING /api/admin/events-upsert（冪等，可重跑）。
 *
 * 用法：
 *   node scripts/sync-shopify-events.mjs                 # dry-run，只印將會 upsert 嘅活動
 *   node scripts/sync-shopify-events.mjs --execute       # 真正寫入 JCHING
 *   node scripts/sync-shopify-events.mjs --actress 篠原伊代
 *   node scripts/sync-shopify-events.mjs --past          # 包含已過期日期（預設只同步未來）
 *
 * 憑證（本機，勿入 repo）：
 *   ~/.config/javstar-shopify.env   SHOPIFY_STORE / SHOPIFY_API_KEY / SHOPIFY_TOKEN
 *   ~/.config/jching-ingest.env     JCHING_BASE / INGEST_TOKEN
 *
 * 歸納規則（一日曆一場，票券唔獨立顯示）：
 *   旺角快閃 -> flash；OFF會 -> off；三場全餐/All Pass -> 忽略（屬攝影會升級項）；
 *   攝影會 -> photo；見面會 -> meet。每 (女優, 日期, 場次) 一筆。
 */
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

function loadEnv(p) {
  const out = {};
  try {
    for (const line of readFileSync(p, 'utf8').split('\n')) {
      const m = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
      if (m) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
    }
  } catch { /* missing file -> caller errors */ }
  return out;
}
const shop = loadEnv(join(homedir(), '.config/javstar-shopify.env'));
const jc = loadEnv(join(homedir(), '.config/jching-ingest.env'));

const argv = process.argv.slice(2);
const EXECUTE = argv.includes('--execute');
const INCLUDE_PAST = argv.includes('--past');
const ai = argv.indexOf('--actress');
const ONLY = ai >= 0 ? argv[ai + 1] : null;
const BASE = jc.JCHING_BASE || 'https://j-star-data.vercel.app';

if (!shop.SHOPIFY_STORE || !shop.SHOPIFY_API_KEY || !shop.SHOPIFY_TOKEN) {
  console.error('缺少 ~/.config/javstar-shopify.env（SHOPIFY_STORE / SHOPIFY_API_KEY / SHOPIFY_TOKEN）');
  process.exit(1);
}
if (EXECUTE && !jc.INGEST_TOKEN) {
  console.error('缺少 ~/.config/jching-ingest.env（INGEST_TOKEN）— dry-run 唔需要，--execute 先需要');
  process.exit(1);
}

// 中文商品標題女優名 -> JCHING actress id + 日文顯示名。新增女優時加一行。
const ACTRESS_MAP = {
  '篠原伊代': { id: '192328', ja: '篠原いよ' },
  '松永明里': { id: '839276', ja: '松永あかり' },
};

const SESSION_LABEL = {
  meet: '香港粉絲見面會',
  photo: '香港粉絲攝影會',
  off: 'OFF會',
  flash: '旺角快閃攝影見面會',
};

async function shopifyToken() {
  const body = new URLSearchParams({
    client_id: shop.SHOPIFY_API_KEY,
    client_secret: shop.SHOPIFY_TOKEN,
    grant_type: 'client_credentials',
  });
  const r = await fetch(`https://${shop.SHOPIFY_STORE}/admin/oauth/access_token`, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body,
  });
  if (!r.ok) throw new Error('shopify token ' + r.status);
  return (await r.json()).access_token;
}

async function activeProducts(tok) {
  const q = `{ products(first: 100, query: "status:active") { nodes { title tags } } }`;
  const r = await fetch(`https://${shop.SHOPIFY_STORE}/admin/api/2024-01/graphql.json`, {
    method: 'POST', headers: { 'X-Shopify-Access-Token': tok, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: q }),
  });
  const d = await r.json();
  return d.data.products.nodes;
}

function classify(title) {
  const dm = title.match(/(20\d{2})年(\d{1,2})月(\d{1,2})日/);
  if (!dm) return null;
  const date = `${dm[1]}-${String(dm[2]).padStart(2, '0')}-${String(dm[3]).padStart(2, '0')}`;
  let kind;
  if (title.includes('旺角快閃')) kind = 'flash';
  else if (title.includes('OFF會') || title.includes('OFF会')) kind = 'off';
  else if (title.includes('三場全餐') || title.includes('All Pass')) return { date, kind: 'skip' };
  else if (title.includes('攝影會') && !title.includes('見面會')) kind = 'photo';
  else if (title.includes('見面會')) kind = 'meet';
  else return null;
  return { date, kind };
}

function buildEvents(products) {
  const groups = new Map(); // key: actress|date|kind
  for (const p of products) {
    for (const [cn, meta] of Object.entries(ACTRESS_MAP)) {
      if (ONLY && cn !== ONLY) continue;
      if (!p.title.includes(cn)) continue;
      const c = classify(p.title);
      if (!c || c.kind === 'skip') continue;
      const key = `${meta.id}|${c.date}|${c.kind}`;
      if (!groups.has(key)) groups.set(key, { cn, ...meta, date: c.date, kind: c.kind, tickets: 0 });
      groups.get(key).tickets += 1;
    }
  }
  const today = new Date().toISOString().slice(0, 10);
  return [...groups.values()]
    .filter((g) => INCLUDE_PAST || g.date >= today)
    .map((g) => {
      const dm = g.date.replace(/-/g, '/');
      const label = SESSION_LABEL[g.kind];
      const title = g.kind === 'flash'
        ? `${g.ja} ${label} ${dm}`
        : `${g.ja} ${label} ${dm}`;
      const to = `https://www.javstarmeet.com/search?q=${encodeURIComponent(g.cn)}`;
      const gateTitle = `${g.ja} ${label}（${dm}）`;
      const url = `/partner?${new URLSearchParams({ to, title: gateTitle }).toString()}`;
      return {
        id: `javstar-${g.id}-${g.date.replace(/-/g, '')}-${g.kind}`,
        actress_id: g.id,
        title,
        date: g.date,
        prefecture: '香港',
        venue: g.kind === 'flash' ? '旺角' : '香港',
        event_type: g.kind === 'meet' ? 'meet' : g.kind === 'off' ? 'other' : 'photo',
        url,
        organizer: 'javstarmeet',
        _tickets: g.tickets,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
}

async function main() {
  const tok = await shopifyToken();
  const products = await activeProducts(tok);
  const events = buildEvents(products);
  console.log(`Shopify active 產品 ${products.length} 件 → 歸納 ${events.length} 個日曆活動\n`);
  for (const e of events) {
    console.log(`  ${e.date}  ${e.event_type.padEnd(5)} ${e.id}`);
    console.log(`           ${e.title}（含 ${e._tickets} 個票券產品）`);
  }
  if (!EXECUTE) {
    console.log('\n[DRY-RUN] 冇寫入。確認後加 --execute 先真正同步。');
    return;
  }
  const clean = events.map(({ _tickets, ...rest }) => rest);
  const r = await fetch(`${BASE}/api/admin/events-upsert`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-ingest-token': jc.INGEST_TOKEN },
    body: JSON.stringify({ events: clean }),
  });
  const d = await r.json();
  if (!r.ok) { console.error('upsert 失敗', r.status, d); process.exit(1); }
  console.log('\n✅ upserted', d.upserted, d.ids);
}
main().catch((e) => { console.error(e); process.exit(1); });
