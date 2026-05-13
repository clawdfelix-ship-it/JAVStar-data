'use client';

import { SWRConfiguration } from 'swr';

/**
 * SWR 全局配置
 * 應用於所有 useSWR hooks
 */
export const swrConfig: SWRConfiguration = {
  // 緩存時間: 10 分鐘 (數據不會經常變)
  revalidateIfStale: true,
  revalidateOnFocus: false, // 切換標籤頁唔自動刷新
  revalidateOnReconnect: true,
  revalidateOnMount: true,
  dedupingInterval: 60000, // 1 分鐘內相同請求去重
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
    // 瀏覽器緩存配置
    cache: 'force-cache',
    next: {
      revalidate: 3600, // 1 小時強制刷新
    },
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
