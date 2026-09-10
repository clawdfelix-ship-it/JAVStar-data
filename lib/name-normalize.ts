/**
 * 女優名稱正規化（Phase 2 搜尋，2026-09-10）
 *
 * 輸入：name_ja + name_cn（大雜燴字串）
 * 輸出：{ kana, romaji, aliases[], searchText, searchNorm }
 *
 * - 拆 name_cn 入面嘅「（かな / Romaji）」
 * - romaji：lowercase、去 macron（yūa → yua）
 * - searchText：原名 + 假名 + 羅馬字 + 別名，space-joined
 * - searchNorm：再疊簡體（OpenCC）+ 日華異體字變體，
 *   等「亞/亜/亚」「樱/桜/櫻」無論用戶打邊隻都命中
 */
import OpenCC from 'opencc-js';

const t2sConverter = OpenCC.Converter({ from: 'hk', to: 'cn' });

// 日文/繁中異體 → 常見變體（每個字展開做「原字 + 簡體 + 日式選字」）
// OpenCC 處理大部分簡繁；呢張表補 OpenCC 唔覆蓋嘅日華字形差異。
const JP_VARIANTS: Record<string, string[]> = {
 亜: ['亞', '亚'],
 桜: ['櫻', '樱'],
 咲: ['笑'], // 罕用輔助，多數唔需要
 崎: ['﨑'],
 斉: ['齊', '齐'],
 剣: ['劍', '剑'],
 撚: ['捻'],
 浜: ['濱', '滨'],
 渕: ['淵', '渊'],
 沢: ['澤', '泽'],
 塚: ['塚'],
 黒: ['黑'],
 黙: ['默'],
 瀬: ['瀨', '濑'],
 亰: ['京'],
 髙: ['高'],
 﨏: ['', ''],
};

// 平假名 ↔ 片假名互換（查表用，運行時生成）
function toHiragana(s: string) {
  return s.replace(/[\u30a1-\u30f6]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
}
function toKatakana(s: string) {
  return s.replace(/[\u3041-\u3096]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60));
}

// macron 羅馬字 → 純 ASCII
function stripMacron(s: string) {
  return s
    .normalize('NFKD')
    .replace(/[̄̀-ͯ]/g, '') // combining diacritics
    .replace(/[āâ]/g, 'a').replace(/[īî]/g, 'i')
    .replace(/[ūû]/g, 'u').replace(/[ēê]/g, 'e').replace(/[ōô]/g, 'o')
    .replace(/[ĀÂ]/g, 'A').replace(/[ĪÎ]/g, 'I')
    .replace(/[ŪÛ]/g, 'U').replace(/[ĒÊ]/g, 'E').replace(/[ŌÔ]/g, 'O')
    .toLowerCase()
    .trim();
}

const KANA_RE = /[぀-ゟ゠-ヿー]/;
const ROMAJI_RE = /^[A-Za-zāīūēōĀĪŪĒŌ\s.'-]+$/;

/** 拆 name_cn：取「（假名 / 羅馬字）」同其餘括號別名 */
export function parseNameCn(nameCn: string | null): { kana: string | null; romaji: string | null; aliases: string[] } {
  if (!nameCn) return { kana: null, romaji: null, aliases: [] };
  const aliases: string[] = [];
  let kana: string | null = null;
  let romaji: string | null = null;

  // 抽出所有括號內容（支援全角（）同半角()）
  const parenRe = /[（(]([^（）()]+)[）)]/g;
  let rest = nameCn;
  let m: RegExpExecArray | null;
  const parens: string[] = [];
  while ((m = parenRe.exec(nameCn)) !== null) {
    parens.push(m[1].trim());
    rest = rest.replace(m[0], ' ');
  }

  for (const inner of parens) {
    // 「かな / Romaji」形式（斜線分隔）
    if (inner.includes('/')) {
      const [leftRaw, rightRaw] = inner.split('/').map((x) => x.trim());
      const left = leftRaw || '';
      const right = rightRaw || '';
      if (KANA_RE.test(left) && !kana) kana = left;
      if (ROMAJI_RE.test(right) && !romaji) romaji = stripMacron(right);
      // 反向：Romaji / かな
      if (ROMAJI_RE.test(left) && !romaji) romaji = stripMacron(left);
      if (KANA_RE.test(right) && !kana) kana = right;
      continue;
    }
    // 淨假名（必須成個 token 都係假名/長音/間隔，唔可以夾雜拉丁，否則「ラグジュTV」會誤判）
    if (/^[぀-ゟ゠-ヿー・\s]+$/.test(inner) && !kana) {
      kana = inner;
      continue;
    }
    // 純羅馬字
    if (ROMAJI_RE.test(inner) && !romaji) {
      romaji = stripMacron(inner);
      continue;
    }
    // 其他括號內容（系列名、標籤）→ 有意義先做別名；過濾描述性垃圾
    if (inner.length >= 2 && inner.length <= 20 && !/チーム|パルプンテ|FC2ライブ/.test(inner)) aliases.push(inner);
  }

  // 括號外嘅文字 = 中文譯名/另一個藝名
  const lead = rest.replace(/\s+/g, ' ').trim();
  if (lead && lead.length <= 30) aliases.unshift(lead);

  return { kana, romaji, aliases: dedupe(aliases) };
}

function dedupe(arr: string[]) {
  return [...new Set(arr.map((s) => s.trim()).filter(Boolean))];
}

/** 額外生成日式異體字變體字串（只對命中嘅字做替換，最多展開避免組合爆炸） */
function expandJpVariants(s: string): string {
  let out = s;
  for (const [ch, vars] of Object.entries(JP_VARIANTS)) {
    if (out.includes(ch)) {
      for (const v of vars) {
        if (v) out += ' ' + s.split(ch).join(v);
      }
    }
  }
  return out;
}

export interface NormalizedNames {
  name_kana: string | null;
  name_romaji: string | null;
  aliases: string[];
  search_text: string;
  search_norm: string;
}

export function normalizeNames(nameJa: string, nameCn: string | null): NormalizedNames {
  const { kana, romaji, aliases } = parseNameCn(nameCn);

  const parts = [
    nameJa,
    kana,
    kana ? toHiragana(kana) : null,
    kana ? toKatakana(kana) : null,
    romaji,
    // 羅馬字去空格（全名倒轉 `Yua Mikami` 都可以靠 trigram 容忍，呢度加埋無空格版）
    romaji ? romaji.replace(/\s+/g, '') : null,
    ...aliases,
  ].filter(Boolean) as string[];

  const searchText = dedupe(parts.map((p) => p.toLowerCase())).join(' ');

  // norm：繁→簡 + 日式異體 + 原名自身（保留先驗精確命中）
  const simplified = t2sConverter(searchText);
  const withVariants = expandJpVariants([searchText, simplified].join(' '));
  const searchNorm = dedupe(withVariants.split(/\s+/)).join(' ');

  return {
    name_kana: kana,
    name_romaji: romaji,
    aliases,
    search_text: searchText,
    search_norm: searchNorm,
  };
}
