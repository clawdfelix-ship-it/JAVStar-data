'use client';

import useSWR from 'swr';
import { fetcher } from '@/lib/swr';

interface Event {
  id: string;
  title: string;
  venue: string;
  prefecture: string;
  datetime: string;
  event_type: string;
  url: string;
  actress_name?: string;
  actress_avatar?: string;
}

interface EventsResponse {
  data: Event[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface UseEventsOptions {
  limit?: number;
  prefecture?: string;
  eventType?: string;
}

/**
 * 獲取活動列表 (帶緩存)
 * SWR 自動處理: 緩存、去重、重試、背景刷新
 */
export function useEvents({
  limit = 1000,
  prefecture = 'ALL',
  eventType = 'ALL',
}: UseEventsOptions = {}) {
  const params = new URLSearchParams({
    limit: String(limit),
    past: '1', // Always include all events (past + future) for calendar/list view
  });

  if (prefecture !== 'ALL') {
    params.append('prefecture', prefecture);
  }

  if (eventType !== 'ALL') {
    params.append('type', eventType);
  }

  const key = `/api/events?${params}`;

  const { data, error, isLoading, isValidating, mutate } = useSWR<EventsResponse>(
    key,
    fetcher,
    {
      revalidateOnFocus: false, // 活動數據唔會經常變
      dedupingInterval: 300000, // 5 分鐘內唔重複請求
    }
  );

  return {
    events: data?.data || [],
    pagination: data?.pagination || null,
    loading: isLoading,
    validating: isValidating,
    error,
    refresh: mutate, // 手動刷新
  };
}

/**
 * 獲取最新活動 (用於 Dashboard)
 */
export function useLatestEvents(limit = 10) {
  const params = new URLSearchParams({
    limit: String(limit),
    upcoming: 'true',
  });

  const { data, error, isLoading } = useSWR<EventsResponse>(
    `/api/events?${params}`,
    fetcher
  );

  return {
    events: data?.data || [],
    loading: isLoading,
    error,
  };
}

/**
 * 獲取特定女優的活動
 */
export function useActressEvents(actressId: string | undefined) {
  const key = actressId ? `/api/actresses/${actressId}` : null;

  const { data, error, isLoading, mutate } = useSWR<{ events: Event[] }>(
    key,
    fetcher,
    {
      revalidateOnFocus: false,
    }
  );

  return {
    events: data?.events || [],
    loading: isLoading,
    error,
    refresh: mutate,
  };
}

export default useEvents;
