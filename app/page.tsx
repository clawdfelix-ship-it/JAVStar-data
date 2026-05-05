'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import ActressCard from '@/components/ActressCard';
import EventCard from '@/components/EventCard';
import EventCalendar from '@/components/EventCalendar';

// ====================
// Type Definitions
// ====================
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

interface PaginationInfo {
  page: number;
  limit: number;
  total?: number;
  count?: number;
  totalItems?: number;
  totalPages?: number;
}

// ====================
// Main Component
// ====================
export default function HomePage() {
  // State
  const [actresses, setActresses] = useState<Actress[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [latestEvents, setLatestEvents] = useState<Event[]>([]);
  const [lastUpdate, setLastUpdate] = useState<string>("");
  const [stats, setStats] = useState({ actressCount: 0, eventCount: 0 });
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState('final_score');
  const [filterPrefecture, setFilterPrefecture] = useState('ALL');
  const [filterType, setFilterType] = useState('ALL');
  const [activeTab, setActiveTab] = useState<'actress' | 'calendar' | 'events'>('actress');

  // Filter options
  const prefectures = ['ALL', '台北', '大阪', '東京', '其他'];
  const eventTypes = ['ALL', '見面會', '攝影會', 'TRE', '簽名會', '出道活動', '實體活動'];

  // ====================
  // Data Fetching
  // ====================
  const fetchLastUpdate = useCallback(async () => {
    try {
      const res = await fetch('/api/last-update');
      if (res.ok) {
        const data = await res.json();
        if (data.last_update) {
          setLastUpdate(new Date(data.last_update).toLocaleString('zh-HK', { timeZone: 'Asia/Hong_Kong' }));
        }
      }
    } catch (err) { console.error('Failed to fetch last update:', err); }
  }, []);

  const fetchLatestEvents = useCallback(async () => {
    try {
      const response = await fetch('/api/events?sort=created_at&order=desc&limit=5');
      if (response.ok) {
        const data = await response.json();
        setLatestEvents(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch latest events:', err);
    }
  }, []);

  const fetchEvents = useCallback(async () => {
    setEventsLoading(true);
    try {
      const response = await fetch('/api/events?limit=2000');
      if (response.ok) {
        const data = await response.json();
        const eventList = data.data || [];
        const metaData = data.meta || data.pagination || null;
        setEvents(eventList);
        const totalCount = metaData?.total || metaData?.count || metaData?.totalItems || eventList.length || 0;
        setStats(prev => ({ ...prev, eventCount: totalCount }));
      }
    } catch (err) {
      console.error('Failed to fetch events:', err);
    } finally {
      setEventsLoading(false);
    }
  }, []);

  const fetchActresses = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '12',
      });
      
      if (search) params.append('search', search);
      if (sort) params.append('sort', sort);
      if (sort === 'final_score') params.append('order', 'desc');

      const response = await fetch(`/api/actresses?${params}`);
      if (!response.ok) throw new Error('Failed to fetch');

      const data = await response.json();
      const actressList = data.data || [];
      const metaData = data.meta || data.pagination || null;
      setActresses(actressList);
      setPagination(metaData);
      const totalCount = metaData?.total || metaData?.count || metaData?.totalItems || actressList.length || 0;
      setStats(prev => ({ ...prev, actressCount: totalCount }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      // Demo data
      setActresses([
        { id: '1', name_ja: '河北彩伽', name_cn: null, avatar_url: null, age: 28, zodiac: 'うお座', cup: 'E', height: '158', bust: '85', waist: '58', hip: '86', agency: 'C-more', hobby: '料理', debut_year: 2021, event_count: 47, year_2026_events: 23, vote_count: 128, final_score: 95 },
        { id: '2', name_ja: '三上悠亜', name_cn: null, avatar_url: null, age: 30, zodiac: 'おひつじ座', cup: 'D', height: '159', bust: '83', waist: '59', hip: '88', agency: 'One', hobby: '映画', debut_year: 2015, event_count: 156, year_2026_events: 45, vote_count: 256, final_score: 92 },
        { id: '3', name_ja: '橋本ありな', name_cn: null, avatar_url: null, age: 29, zodiac: 'さそり座', cup: 'C', height: '156', bust: '82', waist: '55', hip: '86', agency: 'Attackers', hobby: '音楽', debut_year: 2016, event_count: 89, year_2026_events: 34, vote_count: 189, final_score: 89 },
      ]);
      setPagination({ page: 1, limit: 12, total: 3, totalPages: 1 });
      setStats(prev => ({ ...prev, actressCount: 3 }));
    } finally {
      setLoading(false);
    }
  }, [page, search, sort]);

  // Initial load
  useEffect(() => {
    fetchLastUpdate();
    fetchLatestEvents();
    fetchEvents();
    fetchActresses();
  }, [fetchLastUpdate, fetchLatestEvents, fetchEvents, fetchActresses]);

  // Refetch on page change
  useEffect(() => {
    fetchActresses();
  }, [page, sort]);

  // Filtered events
  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      if (filterPrefecture !== 'ALL' && e.prefecture !== filterPrefecture) return false;
      if (filterType !== 'ALL' && e.event_type !== filterType) return false;
      if (search) {
        const searchLower = search.toLowerCase();
        return e.title.toLowerCase().includes(searchLower) ||
               e.venue.toLowerCase().includes(searchLower) ||
               e.actress_name?.toLowerCase().includes(searchLower);
      }
      return true;
    });
  }, [events, filterPrefecture, filterType, search]);

  // Tab config - Froala Design Blocks style
  const tabs = [
    { id: 'actress' as const, label: '女優排名', icon: '👑', count: stats.actressCount },
    { id: 'calendar' as const, label: '活動日曆', icon: '📅', count: stats.eventCount },
    { id: 'events' as const, label: '活動列表', icon: '🎫', count: filteredEvents.length },
  ];

  return (
    <div className="min-h-screen bg-bg-secondary">
      {/* =========================================
          Froala Design Blocks Hero Section
          NIPPON COLORS - 櫻色背景
          ========================================= */}
      <section className="relative overflow-hidden fdb-hero-gradient py-12 md:py-16">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-nadeshiko-light/40 to-kamenozoki/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-gradient-to-tr from-nadeshiko-light/30 to-transparent rounded-full blur-3xl translate-y-1/2 -translate-x-1/3" />
        
        <div className="relative max-w-7xl mx-auto px-4 md:px-6">
          <div className="text-center mb-10">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-nadeshiko-light/30 border border-nadeshiko/30 rounded-full mb-6">
              <span className="text-nadeshiko-dark font-semibold text-sm">✨ AV 女優活動情報平台</span>
            </div>
            
            {/* Title - Froala typography */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-text-primary mb-4 font-japanese leading-tight">
              日本 AV 女優<span className="text-transparent bg-clip-text bg-gradient-to-r from-nadeshiko-dark to-nadeshiko">活動情報</span>
            </h1>
            
            {/* Subtitle */}
            <p className="text-lg md:text-xl text-text-secondary max-w-2xl mx-auto mb-8">
              一站式追蹤心儀女優嘅最新活動、見面會、攝影會情報
            </p>

            {/* Search Bar - Froala Design Blocks style */}
            <div className="max-w-xl mx-auto mb-10">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <span className="text-text-tertiary text-xl">🔍</span>
                </div>
                <input
                  type="text"
                  placeholder="搜尋女優名、活動名稱、場地..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 text-lg bg-white border-2 border-border rounded-2xl shadow-froala focus:border-nadeshiko focus:ring-4 focus:ring-nadeshiko-light/30 focus:outline-none transition-all placeholder:text-text-tertiary"
                />
              </div>
            </div>

            {/* Stats Cards - Froala Design Blocks style */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
              <div className="fdb-card p-5 text-center hover:-translate-y-1 transition-transform">
                <div className="text-3xl md:text-4xl font-bold text-nadeshiko-dark font-mono mb-1">
                  {stats.actressCount.toLocaleString()}
                </div>
                <div className="text-text-secondary text-sm font-medium">註冊女優</div>
              </div>
              <div className="fdb-card p-5 text-center hover:-translate-y-1 transition-transform">
                <div className="text-3xl md:text-4xl font-bold text-emerald-600 font-mono mb-1">
                  {stats.eventCount.toLocaleString()}
                </div>
                <div className="text-text-secondary text-sm font-medium">活動記錄</div>
              </div>
              <div className="fdb-card p-5 text-center hover:-translate-y-1 transition-transform">
                <div className="text-3xl md:text-4xl font-bold text-amber-600 font-mono mb-1">
                  2026
                </div>
                <div className="text-text-secondary text-sm font-medium">年度數據</div>
              </div>
              <div className="fdb-card p-5 text-center hover:-translate-y-1 transition-transform">
                <div className="text-3xl md:text-4xl font-bold text-kamenozoki-dark font-mono mb-1">
                  每日更新
                </div>
                <div className="text-text-secondary text-sm font-medium">自動同步</div>
              </div>
            </div>
          </div>

          {/* Latest Events Marquee */}
          {latestEvents.length > 0 && (
            <div className="bg-white rounded-2xl border border-border p-4 max-w-3xl mx-auto shadow-sm">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-nadeshiko-dark whitespace-nowrap">🔥 最新活動</span>
                <div className="flex-1 overflow-hidden">
                  <div className="marquee whitespace-nowrap">
                    {latestEvents.map((e, i) => (
                      <span key={i} className="text-sm text-text-secondary mx-4">
                        • {e.title}
                      </span>
                    ))}
                    {/* Duplicate for seamless loop */}
                    {latestEvents.map((e, i) => (
                      <span key={`dup-${i}`} className="text-sm text-text-secondary mx-4">
                        • {e.title}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* =========================================
          Tabs Navigation - Froala Design Blocks
          ========================================= */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 -mt-4 relative z-10">
        <div className="bg-white rounded-2xl shadow-froala-lg border border-border p-2">
          <div className="flex gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-semibold transition-all ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-nadeshiko-dark to-nadeshiko text-white shadow-lg shadow-nadeshiko/20'
                    : 'text-text-secondary hover:bg-bg-secondary hover:text-text-primary'
                }`}
              >
                <span className="text-xl">{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  activeTab === tab.id
                    ? 'bg-white/20 text-white'
                    : 'bg-bg-tertiary text-text-tertiary'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================
          Tab Content
          ========================================= */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        {/* Actress Tab */}
        {activeTab === 'actress' && (
          <div className="space-y-6">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-text-secondary text-sm">排序:</span>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="px-4 py-2 bg-white border border-border rounded-xl text-sm font-medium focus:outline-none focus:border-nadeshiko"
                >
                  <option value="final_score">🔥 熱門度</option>
                  <option value="year_2026_events">📅 活動數量</option>
                  <option value="vote_count">❤️ 投票數</option>
                  <option value="debut_year">🌟 資深度</option>
                </select>
              </div>
              
              <div className="text-sm text-text-tertiary">
                共 {pagination?.total || pagination?.count || stats.actressCount || 0} 位女優
              </div>
            </div>

            {/* Actress Grid */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="skeleton h-44 rounded-2xl" />
                ))}
              </div>
            ) : error ? (
              <div className="fdb-card p-8 text-center">
                <p className="text-danger mb-4">載入失敗: {error}</p>
                <button onClick={() => fetchActresses()} className="fdb-btn fdb-btn-primary">
                  重試
                </button>
              </div>
            ) : actresses.length === 0 ? (
              <div className="fdb-card p-12 text-center">
                <p className="text-text-secondary text-lg">搵唔到符合條件嘅女優</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {actresses.map((actress, index) => (
                  <div key={actress.id} className="slide-up" style={{ animationDelay: `${index * 50}ms` }}>
                    <ActressCard {...actress} rank={index + 1 + (page - 1) * 12} />
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {pagination?.totalPages && pagination.totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-8">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 bg-white border border-border rounded-xl text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:border-nadeshiko hover:text-nadeshiko-dark transition-colors"
                >
                  ← 上一頁
                </button>
                
                <span className="px-4 py-2 text-sm text-text-secondary">
                  第 {page} / {pagination.totalPages} 頁
                </span>
                
                <button
                  onClick={() => setPage(p => Math.min(pagination.totalPages || 1, p + 1))}
                  disabled={page === pagination.totalPages}
                  className="px-4 py-2 bg-white border border-border rounded-xl text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:border-nadeshiko hover:text-nadeshiko-dark transition-colors"
                >
                  下一頁 →
                </button>
              </div>
            )}
          </div>
        )}

        {/* Calendar Tab */}
        {activeTab === 'calendar' && (
          <div>
            <EventCalendar events={events} />
          </div>
        )}

        {/* Events Tab */}
        {activeTab === 'events' && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="flex flex-wrap gap-3">
              <select
                value={filterPrefecture}
                onChange={(e) => setFilterPrefecture(e.target.value)}
                className="px-4 py-2 bg-white border border-border rounded-xl text-sm font-medium focus:outline-none focus:border-nadeshiko"
              >
                {prefectures.map((p) => (
                  <option key={p} value={p}>{p === 'ALL' ? '📍 全部地區' : `📍 ${p}`}</option>
                ))}
              </select>
              
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-4 py-2 bg-white border border-border rounded-xl text-sm font-medium focus:outline-none focus:border-nadeshiko"
              >
                {eventTypes.map((t) => (
                  <option key={t} value={t}>{t === 'ALL' ? '🎪 全部類型' : `🎪 ${t}`}</option>
                ))}
              </select>

              <div className="text-sm text-text-tertiary flex items-center">
                共 {filteredEvents.length} 個活動
              </div>
            </div>

            {/* Events Grid */}
            {eventsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="skeleton h-32 rounded-2xl" />
                ))}
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="fdb-card p-12 text-center">
                <p className="text-text-secondary text-lg">搵唔到符合條件嘅活動</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredEvents.slice(0, 50).map((event, index) => (
                  <div key={event.id} className="slide-up" style={{ animationDelay: `${index * 30}ms` }}>
                    <EventCard {...event} />
                  </div>
                ))}
              </div>
            )}

            {filteredEvents.length > 50 && (
              <div className="text-center text-text-secondary text-sm">
                顯示首 50 個結果，其餘請用搜尋功能
              </div>
            )}
          </div>
        )}
      </main>

      {/* =========================================
          Footer - Froala Design Blocks
          NIPPON COLORS
          ========================================= */}
      <footer className="bg-white border-t border-border mt-16">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="font-bold text-text-primary text-lg mb-4 flex items-center gap-2">
                <span className="text-2xl">🌸</span>
                JAVStar-data
              </h3>
              <p className="text-text-secondary text-sm leading-relaxed">
                日本 AV 女優活動情報平台，一站式追蹤心儀女優嘅最新動態
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold text-text-primary mb-4">數據來源</h4>
              <ul className="space-y-2 text-sm text-text-secondary">
                <li>• minnano-av.com</li>
                <li>• av-event.jp</li>
                <li>• 官方 Twitter/X</li>
                <li>• 事務所官網</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-text-primary mb-4">更新時間</h4>
              <p className="text-sm text-text-secondary mb-2">
                最後更新: {lastUpdate || '--'}
              </p>
              <p className="text-xs text-text-tertiary">
                數據僅供參考，請以官方公佈為準
              </p>
            </div>
          </div>
          
          <div className="border-t border-border mt-8 pt-8 text-center">
            <p className="text-sm text-text-tertiary">
              © 2026 JAVStar-data. Made with ❤️ in Hong Kong.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
