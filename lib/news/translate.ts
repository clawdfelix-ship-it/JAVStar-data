import { getSql } from '@/lib/db';
import { fetchArticleBody } from './article';

const OPENROUTER_BASE = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
const MODEL = process.env.NEWS_TRANSLATE_MODEL || 'deepseek/deepseek-chat';

function stripThinking(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
}

function extractJson(text: string): { title_zh?: string; summary_zh?: string } | null {
  const cleaned = stripThinking(text);
  // Prefer the last JSON object in case the model adds prose.
  const match = cleaned.match(/\{[\s\S]*"title_zh"[\s\S]*?"summary_zh"[\s\S]*?\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

export async function translateJapaneseNews(input: {
  title: string;
  summary?: string | null;
  article?: string | null;
}): Promise<{ titleZh: string; summaryZh: string | null }> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY is not configured');

  const rssSummary = (input.summary || '').slice(0, 600);
  // Richer context from the source page body (capped); used only to write a summary.
  const article = (input.article || '').slice(0, 2500);
  const hasBody = article.trim().length >= 80;
  const body = JSON.stringify({
    model: MODEL,
    temperature: 0.1,
    messages: [
      {
        role: 'system',
        content: hasBody
          ? [
              '你負責將日本 AV／寫真／藝能情報整理成香港繁體中文。',
              '只輸出 JSON，格式：{"title_zh":"...","summary_zh":"..."}。',
              'title_zh 係一句自然嘅香港繁體中文標題，保留女優、作品、組合原名。',
              'summary_zh 依據提供嘅日文正文，寫一段約 150-250 個中文字嘅客觀內容摘要：講清人物／事件／日期地點／重點，',
              '用港式繁體中文、語句通順；只概括事實，唔好加入原文冇嘅資料或自己意見，唔好逐句翻譯、唔好複製長句。',
              '唔好輸出 JSON 以外任何文字，唔好解釋。',
            ].join('\n')
          : [
              '你負責將日本 AV／寫真／藝能情報翻譯成香港繁體中文。',
              '只輸出 JSON，格式：{"title_zh":"...","summary_zh":"..."}。',
              'title_zh 係一句自然嘅香港繁體中文標題，保留女優、作品、組合原名。',
              'summary_zh 係 1-2 句、最多 80 個中文字嘅客觀短簡介；如果原文冇摘要，用標題濃縮，唔好加自己意見。',
              '唔好輸出 JSON 以外任何文字，唔好解釋。',
            ].join('\n'),
      },
      {
        role: 'user',
        content: hasBody
          ? `日文標題：${input.title}\n日文簡述：${rssSummary || '（無）'}\n日文正文（參考，唔好全文照抄）：\n${article}`
          : `日文標題：${input.title}\n日文摘要：${rssSummary || '（無）'}`,
      },
    ],
  });

  // Retry on transient upstream rate limits / 5xx (DeepSeek endpoint throttles occasionally).
  const maxAttempts = 4;
  let response: Response | null = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    response = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://j-star-data.vercel.app/',
        'X-Title': 'JCHING news translation',
      },
      body,
    });
    if (response.ok || (response.status !== 429 && response.status < 500)) break;
    if (attempt < maxAttempts) {
      const retryAfter = Number(response.headers.get('retry-after'));
      const delayMs = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 2000 * attempt;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  if (!response) throw new Error('OpenRouter translate: no response');
  if (!response.ok) {
    throw new Error(`OpenRouter translate HTTP ${response.status}: ${(await response.text()).slice(0, 200)}`);
  }
  const data = await response.json();
  const raw = data?.choices?.[0]?.message?.content || '';
  const parsed = extractJson(raw);
  if (!parsed?.title_zh) throw new Error('OpenRouter translation response did not contain valid JSON title_zh');

  return {
    titleZh: stripThinking(parsed.title_zh).slice(0, 200),
    summaryZh: parsed.summary_zh ? stripThinking(parsed.summary_zh).slice(0, 600) : null,
  };
}

export type TranslateNewsResult = {
  translated: number;
  failed: number;
  errors: Array<{ id: number; error: string }>;
  sampleTitles: string[];
};

// limit: max rows. includeTranslated=true also re-summarises rows that already
// have title_zh (used to upgrade short summaries with article-body context).
export async function translatePendingNewsItems(
  limit = 30,
  opts: { includeTranslated?: boolean } = {}
): Promise<TranslateNewsResult> {
  const sql = getSql();
  const where = opts.includeTranslated
    ? `COALESCE(translation_status, 'not_translated') <> 'failed'`
    : `COALESCE(translation_status, 'not_translated') <> 'translated'
        AND COALESCE(title_zh, '') = ''`;
  const items = (await sql.query(
    `SELECT id, title_ja, summary_ja, source_url
       FROM news_items
      WHERE ${where}
      ORDER BY published_at DESC NULLS LAST, id DESC
      LIMIT $1`,
    [limit]
  )) as Array<{ id: number; title_ja: string; summary_ja: string | null; source_url: string }>;

  const result: TranslateNewsResult = { translated: 0, failed: 0, errors: [], sampleTitles: [] };

  // Sequential to avoid provider rate limits; daily batch is small.
  for (const item of items) {
    try {
      // Pull the source page body for a richer, longer summary (best effort).
      const articleBody = await fetchArticleBody(item.source_url);
      const translated = await translateJapaneseNews({
        title: item.title_ja,
        summary: item.summary_ja,
        article: articleBody,
      });
      await sql.query(
        `UPDATE news_items
            SET title_zh = $1,
                summary_zh = $2,
                translation_status = 'translated',
                updated_at = NOW()
          WHERE id = $3`,
        [translated.titleZh, translated.summaryZh, item.id]
      );
      result.translated += 1;
      if (result.sampleTitles.length < 5) result.sampleTitles.push(translated.titleZh);
    } catch (error) {
      result.failed += 1;
      result.errors.push({ id: item.id, error: error instanceof Error ? error.message : String(error) });
      await sql.query(
        `UPDATE news_items SET translation_status = 'failed', updated_at = NOW() WHERE id = $1`,
        [item.id]
      );
    }
  }

  return result;
}
