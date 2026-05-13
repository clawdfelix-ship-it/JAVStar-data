'use client';

import useSWR from 'swr';
import { fetcher } from '@/lib/swr';

interface StatsResponse {
  actressCount: number;
  eventCount: number;
  lastUpdate: string;
}

/**
 * 獲取統計數據 (帶緩存)
 */
export function useStats() {
  const { data, error, isLoading, mutate } = useSWR<StatsResponse>(
    '/api/stats',
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // 1 分鐘內唔重複請求
    }
  );

  return {
    stats: data || { actressCount: 0, eventCount: 0, lastUpdate: '' },
    loading: isLoading,
    error,
    refresh: mutate,
  };
}

/**
 * 獲取最後更新時間
 */
export function useLastUpdate() {
  const { data, error, isLoading } = useSWR<{ lastUpdate: string }>(
    '/api/last-update',
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 300000, // 5 分鐘
    }
  );

  return {
    lastUpdate: data?.lastUpdate || '',
    loading: isLoading,
    error,
  };
}

export default useStats;
