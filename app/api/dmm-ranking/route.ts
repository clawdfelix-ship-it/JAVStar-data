import { NextResponse } from 'next/server';

// Cache 配置
const CACHE_DURATION = 60 * 60 * 1000; // 1 小時
let cachedData: any = null;
let lastFetchTime = 0;

interface RankingItem {
  rank: number;
  title: string;
  actress: string;
  maker: string;
  coverUrl: string;
  detailUrl: string;
  isNew: boolean;
  rankChange: 'up' | 'down' | 'same' | 'new';
}

export async function GET() {
  // 檢查 cache
  const now = Date.now();
  if (cachedData && now - lastFetchTime < CACHE_DURATION) {
    return NextResponse.json({
      success: true,
      data: cachedData,
      cached: true,
    });
  }

  try {
    // 爬 DMM 月間排行榜
    const response = await fetch('https://www.dmm.co.jp/mono/dvd/-/ranking/=/term=monthly/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'ja,en-US;q=0.7,en;q=0.3',
        'Referer': 'https://www.dmm.co.jp/',
      },
      next: { revalidate: 3600 }, // Next.js 自動 cache
    });

    if (!response.ok) {
      throw new Error(`DMM 請求失敗: ${response.status}`);
    }

    const html = await response.text();

    // 解析 HTML（簡單解析，DMM 結構可能變）
    const ranking: RankingItem[] = [];
    
    // 搵每個 ranking item
    const itemRegex = /<div class="list__area">([\s\S]*?)<\/div>\s*<\/div>/g;
    let match;
    let rank = 1;

    while ((match = itemRegex.exec(html)) !== null && rank <= 20) {
      const itemHtml = match[1];
      
      // 提取標題
      const titleMatch = itemHtml.match(/<h2 class="list__title">([\s\S]*?)<\/h2>/);
      const title = titleMatch ? titleMatch[1].trim() : '';
      
      // 提取女優
      const actressMatch = itemHtml.match(/<span class="list__author">([\s\S]*?)<\/span>/);
      const actress = actressMatch ? actressMatch[1].trim() : '';
      
      // 提取廠商
      const makerMatch = itemHtml.match(/<span class="list__maker">([\s\S]*?)<\/span>/);
      const maker = makerMatch ? makerMatch[1].trim() : '';
      
      // 提取封面
      const coverMatch = itemHtml.match(/<img[^>]*src="([^"]*pics\.dmm\.co\.jp[^"]*)"[^>]*>/);
      const coverUrl = coverMatch ? coverMatch[1] : '';
      
      // 提取詳情鏈接
      const linkMatch = itemHtml.match(/<a[^>]*href="([^"]*\/detail\/[^"]*)"[^>]*>/);
      const detailUrl = linkMatch ? linkMatch[1] : '';
      
      // 判斷是否新上榜
      const isNew = itemHtml.includes('icon_new') || itemHtml.includes('class="new"');
      
      // 判斷升降（簡單判斷，DMM 有專門的 icon）
      let rankChange: 'up' | 'down' | 'same' | 'new' = 'same';
      if (itemHtml.includes('icon_up') || itemHtml.includes('class="up"')) {
        rankChange = 'up';
      } else if (itemHtml.includes('icon_down') || itemHtml.includes('class="down"')) {
        rankChange = 'down';
      } else if (isNew) {
        rankChange = 'new';
      }

      if (title && rank <= 20) {
        ranking.push({
          rank,
          title,
          actress,
          maker,
          coverUrl: coverUrl.replace('pt.', 'ps.'), // 轉成小圖
          detailUrl,
          isNew,
          rankChange,
        });
        rank++;
      }
    }

    // 如果解析唔到數據，返回 fallback
    if (ranking.length === 0) {
      return NextResponse.json({
        success: true,
        data: getFallbackData(),
        note: '解析失敗，使用備用數據',
      });
    }

    // 更新 cache
    cachedData = ranking;
    lastFetchTime = now;

    return NextResponse.json({
      success: true,
      data: ranking,
      total: ranking.length,
    });

  } catch (error) {
    console.error('DMM 爬蟲錯誤:', error);
    // 出錯返回備用數據
    return NextResponse.json({
      success: true,
      data: getFallbackData(),
      note: '爬蟲失敗，使用備用數據',
    });
  }
}

// 備用數據（萬一爬唔到）
function getFallbackData(): RankingItem[] {
  return [
    { rank: 1, title: 'DMM 月間排行榜數據暫時無法獲取', actress: '-', maker: '-', coverUrl: '', detailUrl: '#', isNew: false, rankChange: 'same' },
  ];
}
