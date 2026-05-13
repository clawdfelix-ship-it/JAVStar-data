'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import ActressCard from '@/components/ActressCard';
import EventCard from '@/components/EventCard';
import EventCalendar from '@/components/EventCalendar';
import VirtualList from '@/components/VirtualList';
import SearchBar from '@/components/SearchBar';
import { highlightText } from '@/hooks/useSearch';
import { useActresses } from '@/hooks/useActresses';
import { useEvents } from '@/hooks/useEvents';
import { useStats } from '@/hooks/useStats';

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

interface HomeClientProps {
  initialActresses?: Actress[];
  initialEvents?: Event[];
  initialStats?: { actressCount: number; eventCount: number };
}

// ====================
// Main Client Component
// ====================
export default function HomeClient({ initialActresses, initialEvents, initialStats }: HomeClientProps) {
  const router = useRouter();

  // UI State
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState('final_score');
  const [filterPrefecture, setFilterPrefecture] = useState('ALL');
  const [filterType, setFilterType] = useState('ALL');
  const [activeTab, setActiveTab] = useState<'actress' | 'calendar' | 'events'>('actress');

  // SWR Data Hooks - 自帶緩存、去重、重試
  const { actresses, pagination, loading, error, refresh: refreshActresses } = useActresses({
    page,
    limit: 12,
    sort,
    search: activeTab === 'actress' ? search : '',
  });

  const { events, loading: eventsLoading } = useEvents({
    limit: 2000,
    prefecture: activeTab === 'events' ? filterPrefecture : 'ALL',
    eventType: activeTab === 'events' ? filterType : 'ALL',
  });

  const { stats } = useStats();

  // 綜合搜尋數據 (女優 + 活動)
  const searchData = useMemo(() => {
    const actressItems = (actresses || []).map(a => ({
      ...a,
      _type: 'actress' as const,
      _displayName: a.name_ja,
    }));
    
    const eventItems = (events || []).map(e => ({
      ...e,
      _type: 'event' as const,
      _displayName: e.title,
    }));
    
    return [...actressItems, ...eventItems];
  }, [actresses, events]);

  // Filter options
  const prefectures = ['ALL', '台北', '大阪', '東京', '其他'];
  const eventTypes = ['ALL', '見面會', '攝影會', 'TRE', '簽名會', '出道活動', '實體活動'];

  // ====================
  // Data Processing
  // ====================
  
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
                <div className="text-text-secondary text-sm font-medium">數據更新</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================
          Tabs Navigation - Froala Design Blocks
          ========================================= */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-center gap-2 py-3">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`fdb-tab ${activeTab === tab.id ? 'active' : ''}`}
              >
                <span className="text-lg">{tab.icon}</span>
                <span>{tab.label}</span>
                <span className="fdb-badge">{tab.count}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* =========================================
          Main Content
          ========================================= */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        {/* Actress Ranking Tab */}
        {activeTab === 'actress' && (
          <div>
            {/* Sort Controls */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <h2 className="text-2xl font-bold text-text-primary font-japanese flex items-center gap-2">
                <span className="text-nadeshiko-dark">👑</span>
                女優排名
              </h2>
              <div className="flex items-center gap-3">
                <span className="text-sm text-text-tertiary">排序:</span>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="px-4 py-2 bg-white border border-border rounded-xl text-sm font-medium focus:outline-none focus:border-nadeshiko"
                >
                  <option value="final_score">🏆 綜合評分</option>
                  <option value="event_count">📊 活動數量</option>
                  <option value="year_2026_events">📅 2026年活動</option>
                  <option value="vote_count">❤️ 投票數</option>
                  <option value="age">🎂 年齡</option>
                </select>
              </div>
            </div>

            {/* Actress Grid */}
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <div key={i} className="skeleton h-48 rounded-2xl" />
                ))}
              </div>
            ) : error ? (
              <div className="fdb-card p-8 text-center">
                <p className="text-danger mb-4 font-medium">載入失敗: {error.message || String(error)}</p>
                <button onClick={() => refreshActresses()} className="fdb-btn fdb-btn-primary">
                  🔄 重試
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {actresses.map((actress, index) => (
                  <div key={actress.id} className="slide-up" style={{ animationDelay: `${index * 50}ms` }}>
                    <ActressCard {...actress} rank={index + 1 + (page - 1) * 12} />
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {pagination && pagination.totalPages && pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="fdb-btn fdb-btn-outline disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ← 上一頁
                </button>
                <span className="px-4 py-2 text-text-secondary">
                  第 {page} 頁 / 共 {pagination.totalPages} 頁
                </span>
                <button
                  onClick={() => setPage(p => Math.min(pagination.totalPages || 1, p + 1))}
                  disabled={page === pagination.totalPages}
                  className="fdb-btn fdb-btn-outline disabled:opacity-50 disabled:cursor-not-allowed"
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
            <h2 className="text-2xl font-bold text-text-primary font-japanese mb-6 flex items-center gap-2">
              <span className="text-nadeshiko-dark">📅</span>
              活動日曆
            </h2>
            {eventsLoading ? (
              <div className="fdb-card p-12 text-center">
                <div className="skeleton h-96 w-full rounded-xl" />
              </div>
            ) : (
              <EventCalendar events={events} />
            )}
          </div>
        )}

        {/* Events List Tab */}
        {activeTab === 'events' && (
          <div>
            <h2 className="text-2xl font-bold text-text-primary font-japanese mb-6 flex items-center gap-2">
              <span className="text-nadeshiko-dark">🎫</span>
              活動列表
            </h2>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4 mb-6">
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

            {/* Events Grid - Virtual Scroll 虛擬滾動 */}
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
              <div className="space-y-4">
                {/* 性能指標 */}
                <div className="flex items-center justify-between">
                  <div className="fdb-badge fdb-badge-primary">
                    ⚡ 虛擬滾動優化: {filteredEvents.length} 個活動
                  </div>
                </div>
                
                {/* 虛擬滾動列表 */}
                <VirtualList
                  items={filteredEvents}
                  itemHeight={140} // EventCard 高度
                  containerHeight={700}
                  overscan={6}
                  getItemKey={(item) => item.id}
                  className="rounded-2xl border border-border bg-white"
                  emptyMessage="搵唔到符合條件嘅活動"
                  renderItem={(event, index) => (
                    <div className="px-4 py-2">
                      <EventCard key={event.id} {...event} />
                    </div>
                  )}
                />
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
                最後更新: {stats.lastUpdate || '--'}
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
