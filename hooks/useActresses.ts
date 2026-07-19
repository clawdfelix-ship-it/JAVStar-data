'use client';

import useSWR from 'swr';
import useSWRInfinite from 'swr/infinite';
import { fetcher } from '@/lib/swr';

interface Actress {
  id: string;
  name_ja: string;
  name_cn: string | null;
  avatar_url: string | null;
  age: number | null;
  zodiac: string | null;
  cup: string | null;
  height: string | null;
  bust: string | null;
  waist: string | null;
  hip: string | null;
  agency: string | null;
  hobby: string | null;
  debut_year: number | null;
  event_count: number;
  year_2026_events: number;
  vote_count: number;
  final_score: number;
  next_event_date?: string | null;
  next_event_title?: string | null;
}

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

interface ActressesResponse {
  data: Actress[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface UseActressesOptions {
  page?: number;
  limit?: number;
  sort?: string;
  search?: string;
  hasUpcoming?: boolean;
}

/**
 * 獲取女優列表 (帶緩存)
 * SWR 自動處理: 緩存、去重、重試、背景刷新
 */
export function useActresses({
  page = 1,
  limit = 12,
  sort = 'final_score',
  search = '',
  hasUpcoming = false,
}: UseActressesOptions = {}) {
  // v20260719 = post-agency mapping backfill
  const CACHE_BUSTER = 'v=20260719';

  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    sort,
    search,
  });
  if (hasUpcoming) params.set('has_upcoming', '1');

  const key = `/api/actresses?${params}&${CACHE_BUSTER}`;

  const { data, error, isLoading, isValidating, mutate } = useSWR<ActressesResponse>(
    key,
    fetcher,
    {
      keepPreviousData: true, // 翻頁時保留舊數據
    }
  );

  return {
    actresses: data?.data || [],
    pagination: data?.pagination || null,
    loading: isLoading,
    validating: isValidating,
    error,
    refresh: mutate, // 手動刷新
  };
}

/**
 * 獲取所有女優 (無限滾動)
 */
export function useActressesInfinite({
  limit = 24,
  sort = 'final_score',
}: Omit<UseActressesOptions, 'page'> = {}) {
  const getKey = (pageIndex: number, previousPageData: ActressesResponse | null) => {
    // 到最後一頁就停止
    if (previousPageData && pageIndex >= previousPageData.pagination.totalPages) {
      return null;
    }

    const params = new URLSearchParams({
      page: String(pageIndex + 1),
      limit: String(limit),
      sort,
    });

    return `/api/actresses?${params}`;
  };

  const { data, size, setSize, error, isLoading, isValidating } = useSWRInfinite<ActressesResponse>(
    getKey,
    fetcher
  );

  // 合併所有頁面的數據
  const allActresses = data?.flatMap(page => page.data) || [];
  const isLoadingMore = isLoading || (size > 0 && data && typeof data[size - 1] === 'undefined');
  const isEmpty = data?.[0]?.data.length === 0;
  const isReachingEnd = isEmpty || (data && data[data.length - 1]?.data.length < limit);

  return {
    actresses: allActresses,
    loading: isLoading,
    loadingMore: isLoadingMore,
    validating: isValidating,
    error,
    size,
    setSize,
    isEmpty,
    isReachingEnd,
  };
}

interface ActressDetailResponse {
  actress: Actress;
  events: Event[];
  matchingValidation?: {
    totalChecked: number;
    filteredCount: number;
    filterRate: number;
  } | null;
}

/**
 * 獲取單個女優詳情
 */
export function useActress(id: string | undefined) {
  const key = id ? `/api/actresses/${id}` : null;

  const { data, error, isLoading, isValidating, mutate } = useSWR<ActressDetailResponse>(
    key,
    fetcher,
    {
      revalidateOnFocus: false, // 詳情頁唔需要太頻繁刷新
    }
  );

  return {
    actress: data?.actress || null,
    events: data?.events || [],
    matchingValidation: data?.matchingValidation || null,
    loading: isLoading,
    validating: isValidating,
    error,
    refresh: mutate,
  };
}

/**
 * 為女優投票 (樂觀更新)
 */
export function useVoteActress() {
  const { mutate } = useSWR('/api/actresses');

  const vote = async (id: string) => {
    // 樂觀更新: 先更新本地緩存
    mutate(
      async (currentData: ActressesResponse | undefined) => {
        if (!currentData) return currentData;
        
        // 找到並更新對應女優的投票數
        const updatedData = {
          ...currentData,
          data: currentData.data.map(a => 
            a.id === id 
              ? { ...a, vote_count: a.vote_count + 1 }
              : a
          ),
        };

        return updatedData;
      },
      {
        revalidate: false, // 唔立即重新驗證，等 POST 返回結果
      }
    );

    // 實際發送請求
    const response = await fetch(`/api/actresses/${id}/vote`, {
      method: 'POST',
    });

    if (!response.ok) {
      // 失敗就回滾
      mutate();
      throw new Error('投票失敗');
    }

    // 成功就重新驗證數據
    mutate();
  };

  return { vote };
}

export default useActresses;
