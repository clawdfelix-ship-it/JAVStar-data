'use client';

import { SWRConfiguration } from 'swr';

/**
 * SWR 全局配置
 * 應用於所有 useSWR hooks
 */
export const swrConfig: SWRConfiguration = {
  // 數據會透過爬蟲/DB 更新，寧可背景重新驗證都唔好顯示過期內容
  revalidateIfStale: true,
  revalidateOnFocus: true, // 切返去個 tab 自動刷新——解決「無痕先見到新數據」
  revalidateOnReconnect: true,
  revalidateOnMount: true,
  refreshInterval: 300000, // 5 分鐘自動背景更新（排名/活動）
  dedupingInterval: 15000, // 15 秒內相同請求去重（縮短，避免壓住新數據）
  errorRetryCount: 3, // 失敗重試 3 次
  errorRetryInterval: 5000, // 每次重試間隔 5 秒
  loadingTimeout: 10000, // 10 秒超時
  keepPreviousData: true, // 加載新數據時保留舊數據

  // 緩存鍵前綴
  provider: () => new Map(),
};

/**
 * 默認 API fetcher
 * 使用 fetch + 自動 JSON 解析
 */
export async function fetcher<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    // 用默認 cache 模式（配合 SWR 自己做快取）。
    // 之前用 force-cache 會叫瀏覽器「唔驗證直接食磁碟快取」，
    // 係正常視窗見唔到新數據、無痕卻見到嘅元兇。
    cache: 'no-cache',
  });

  if (!response.ok) {
    const error = new Error(`API 請求失敗: ${response.status}`);
    (error as any).status = response.status;
    throw error;
  }

  return response.json() as Promise<T>;
}

/**
 * POST 請求 fetcher
 */
export async function postFetcher<T>(url: string, data: unknown): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`POST 請求失敗: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export default swrConfig;
