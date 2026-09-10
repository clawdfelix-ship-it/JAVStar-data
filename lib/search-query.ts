/**
 * 搜尋查詢端變體生成（Phase 2，2026-09-10）
 *
 * DB 嘅 search_norm 已預存「原名＋簡體＋日華異體字」，所以查詢端唔使再跑 OpenCC。
 * 呢度只做輕量變體：
 *   - 羅馬字 lowercase + 去 macron（yūa → yua）
 *   - 全名去空格（yua mikami → yuamikami）
 *   - 平假名 ↔ 片假名
 *   - 日華異體字替換（亞/亜/亚、櫻/桜/樱 之類）
 */

// 要同 lib/name-normalize.ts 嘅 JP_VARIANTS 保持一致（用戶可能打任何一隻）
const JP_VARIANT_GROUPS: string[][] = [
  ['亜', '亞', '亚'],
  ['桜', '櫻', '樱'],
  ['﨑', '崎'],
  ['斉', '齊', '齐'],
  ['剣', '劍', '剑'],
  ['浜', '濱', '滨'],
  ['渕', '淵', '渊'],
  ['沢', '澤', '泽'],
  ['黒', '黑'],
  ['黙', '默'],
  ['瀬', '瀨', '濑'],
  ['髙', '高'],
];

function toHiragana(s: string) {
  return s.replace(/[\u30a1-\u30f6]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
}
function toKatakana(s: string) {
  return s.replace(/[\u3041-\u3096]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60));
}

function stripMacron(s: string) {
  // ⚠️ 唔可以用 NFKD normalize 成串字：佢會將日文濁音假名（ず U+305A）拆成
  // 「す + combining dakuten U+3099」，破壞所有含濁音嘅假名查詢（2026-09-10 bug）。
  // 淨係針對拉丁 macron 字母做顯式替換。
  return s
    .replace(/[āâ]/g, 'a').replace(/[īî]/g, 'i')
    .replace(/[ūû]/g, 'u').replace(/[ēê]/g, 'e').replace(/[ōô]/g, 'o')
    .replace(/[ĀÂ]/g, 'A').replace(/[ĪÎ]/g, 'I')
    .replace(/[ŪÛ]/g, 'U').replace(/[ĒÊ]/g, 'E').replace(/[ŌÔ]/g, 'O')
    .toLowerCase()
    .trim();
}

function expandVariants(q: string): string[] {
  const out = new Set<string>([q]);
  for (const group of JP_VARIANT_GROUPS) {
    if (group.some((ch) => q.includes(ch))) {
      for (const ch of group) {
        for (const alt of group) {
          if (ch !== alt) out.add(q.split(ch).join(alt));
        }
      }
    }
  }
  return [...out];
}

/** 生成查詢變體（已 dedupe、封頂 8 個，避免 SQL 膨脹） */
export function buildQueryVariants(raw: string): string[] {
  const q = stripMacron(raw);
  if (!q) return [];
  const seeds = new Set<string>([q]);

  // 羅馬字全名：補無空格版（search_text 有「yua mikami」同「yuamikami」）
  if (/^[a-z\s.'-]+$/.test(q) && q.includes(' ')) seeds.add(q.replace(/\s+/g, ''));

  // 假名互換
  if (/[぀-ゟ]/.test(q)) seeds.add(toKatakana(q));
  if (/[゠-ヿ]/.test(q)) seeds.add(toHiragana(q));

  const variants = new Set<string>();
  for (const s of seeds) {
    for (const v of expandVariants(s)) variants.add(v);
  }
  return [...variants].slice(0, 8);
}
