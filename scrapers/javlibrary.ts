import * as fs from 'fs';
import * as path from 'path';

/**
 * JavLibrary 每月新作爬蟲
 * 爬取 https://www.javlibrary.com/tw/vl_newrelease.php?&mode=2
 */

export interface JavVideo {
  video_code: string;
  title: string;
  cover_url: string;
  detail_url: string;
  actresses?: string[];
  release_date?: string;
  maker?: string;
}

/**
 * 從瀏覽器頁面提取影片數據
 * （需要配合 browser tool 使用）
 */
export function extractVideosFromPage(html: string): JavVideo[] {
  const videos: JavVideo[] = [];
  
  // 簡單正則提取（實際使用時建議用 cheerio）
  const videoRegex = /class="video"[^>]*>[\s\S]*?<a[^>]*href="([^"]+)"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"[^>]*>[\s\S]*?class="id"[^>]*>([^<]+)<[\s\S]*?class="title"[^>]*>([^<]+)</g;
  
  let match;
  while ((match = videoRegex.exec(html)) !== null) {
    const [, detailUrl, coverUrl, videoCode, title] = match;
    videos.push({
      video_code: videoCode.trim(),
      title: title.trim(),
      cover_url: coverUrl,
      detail_url: `https://www.javlibrary.com/tw/${detailUrl.replace('./', '')}`,
    });
  }
  
  return videos;
}

/**
 * 儲存爬取到的數據
 */
export function saveVideos(videos: JavVideo[], outputPath: string = 'data/new_releases.json'): void {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  const existing = fs.existsSync(outputPath) 
    ? JSON.parse(fs.readFileSync(outputPath, 'utf-8')) 
    : [];
  
  // 合併並去重
  const existingCodes = new Set(existing.map((v: JavVideo) => v.video_code));
  const newVideos = videos.filter(v => !existingCodes.has(v.video_code));
  
  const result = [...newVideos, ...existing];
  
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8');
  console.log(`✅ 已儲存 ${videos.length} 套影片，新增 ${newVideos} 套`);
}

/**
 * 簡易測試
 */
if (require.main === module) {
  console.log('JavLibrary Scraper Loaded');
  console.log('使用方法：配合 browser tool 打開頁面後提取數據');
}
