/**
 * 女優活動配對校驗器
 * 自動偵測並過濾錯誤配對的活動
 */

export interface MatchingValidationResult {
  isValid: boolean;
  confidence: number; // 0-100, 匹配置信度
  reason?: string;
  suggestedActressId?: string;
  suggestedActressName?: string;
}

/**
 * 驗證活動是否屬於該女優
 * @param eventTitle 活動標題
 * @param actressNameJa 女優日文名
 * @param actressNameCn 女優中文名 (可選)
 */
export function validateActressEventMatch(
  eventTitle: string,
  actressNameJa: string,
  actressNameCn?: string | null
): MatchingValidationResult {
  if (!eventTitle || !actressNameJa) {
    return { isValid: true, confidence: 50 }; // 數據缺失時默認通過
  }

  const titleNormalized = normalizeString(eventTitle);
  const nameJaNormalized = normalizeString(actressNameJa);
  const nameCnNormalized = actressNameCn ? normalizeString(actressNameCn) : null;

  // 檢查日文名是否出現在標題中
  const hasJaName = titleNormalized.includes(nameJaNormalized);
  
  // 檢查中文名是否出現在標題中
  const hasCnName = nameCnNormalized ? titleNormalized.includes(nameCnNormalized) : false;

  // 處理日文名字的常見變體
  // 例如：あかね麗 → あかね 或 麗 也可能匹配
  const jaNameParts = nameJaNormalized.split(/[\s・]+/).filter(p => p.length > 1);
  const hasPartialJaMatch = jaNameParts.some(part => titleNormalized.includes(part));

  // 計算置信度
  let confidence = 0;
  if (hasJaName) confidence = 100;
  else if (hasCnName) confidence = 90;
  else if (hasPartialJaMatch) confidence = 70;
  else confidence = 10; // 低置信度，可能配對錯誤

  const isValid = confidence >= 50; // 低於 50 視為可疑配對

  return {
    isValid,
    confidence,
    reason: !isValid ? `活動標題不包含女優姓名 "${actressNameJa}"` : undefined
  };
}

/**
 * 在所有女優中尋找最匹配的女優
 * @param eventTitle 活動標題
 * @param allActresses 所有女優列表
 */
export function findBestMatchingActress(
  eventTitle: string,
  allActresses: Array<{ id: string; name_ja: string; name_cn?: string | null }>
): MatchingValidationResult {
  if (!eventTitle || !allActresses.length) {
    return { isValid: false, confidence: 0 };
  }

  let bestMatch: MatchingValidationResult | null = null;
  let bestActress: typeof allActresses[0] | null = null;

  for (const actress of allActresses) {
    const result = validateActressEventMatch(eventTitle, actress.name_ja, actress.name_cn);
    if (!bestMatch || result.confidence > bestMatch.confidence) {
      bestMatch = result;
      bestActress = actress;
    }
  }

  return {
    isValid: bestMatch!.confidence >= 50,
    confidence: bestMatch!.confidence,
    suggestedActressId: bestActress!.id,
    suggestedActressName: bestActress!.name_ja
  };
}

/**
 * 字符串標準化 - 移除空格、大小寫統一、全形半形轉換
 */
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .replace(/[\s　・☆★♡♥◇◆△▽□■◎☆★※△▼▲▽]/g, '')
    .replace(/[！-～]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0)) // 全形轉半形
    .trim();
}

/**
 * 批量驗證活動配對
 * 返回校驗後的活動列表和統計信息
 * 泛型支持：保留原始活動的完整類型
 */
export function validateAllEvents<T extends { id: string; title: string }>(
  events: T[],
  actressNameJa: string,
  actressNameCn?: string | null
): {
  validEvents: T[];
  invalidEvents: Array<T & { validation: MatchingValidationResult }>;
  stats: {
    total: number;
    valid: number;
    invalid: number;
    filterRate: number;
  };
} {
  const invalidEvents: Array<T & { validation: MatchingValidationResult }> = [];
  const validEvents: T[] = [];

  for (const event of events) {
    const validation = validateActressEventMatch(event.title, actressNameJa, actressNameCn);
    if (validation.isValid) {
      validEvents.push(event);
    } else {
      invalidEvents.push({ ...event, validation });
    }
  }

  return {
    validEvents,
    invalidEvents,
    stats: {
      total: events.length,
      valid: validEvents.length,
      invalid: invalidEvents.length,
      filterRate: events.length > 0 ? invalidEvents.length / events.length : 0
    }
  };
}
