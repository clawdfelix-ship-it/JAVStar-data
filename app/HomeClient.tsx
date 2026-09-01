'use client';

import { useState, useMemo, useRef, useLayoutEffect, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Crown, Calendar, Ticket, Trophy, BarChart2,
  Heart, Cake, Flower2, ArrowUp, RefreshCw, Check,
  Sparkles, Camera, ChevronLeft, ChevronRight, Search, X,
} from 'lucide-react';
import ActressCard from '@/components/ActressCard';
import EventCard from '@/components/EventCard';
import EventCalendar from '@/components/EventCalendar';
// VirtualList removed — variable-height EventCard caused overlapping rows
import SearchBar from '@/components/SearchBar';
import NewReleasesSection from '@/components/NewReleasesSection';
// 月間DVD排行榜已隱藏（DMM 無法經 VPN 取得數據）。恢復時取消註解：
// import DvdRankingSection from '@/components/DvdRankingSection';
import DailyActressBox from '@/components/DailyActressBox';
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
  // Auto-scroll to grid top whenever page changes (fixes 上一頁/下一頁 not returning to top).
  // Runs after React commits so the new DOM is in place.
  const paginatedRef = useRef(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (page === 1 && !paginatedRef.current) return; // skip initial mount
    paginatedRef.current = true;
    requestAnimationFrame(() => {
      const target = document.getElementById('actress-grid-top');
      if (!target) return;
      const y = target.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top: y, behavior: 'smooth' });
    });
  }, [page]);
  const [sort, setSort] = useState('final_score');
  const [hasUpcoming, setHasUpcoming] = useState(false);
  const [eventsShown, setEventsShown] = useState(60);
  const [filterPrefecture, setFilterPrefecture] = useState('ALL');
  const [filterType, setFilterType] = useState('ALL');
  const [activeTab, setActiveTab] = useState<'actress' | 'calendar' | 'events'>('actress');

  // SWR Data Hooks - 自帶緩存、去重、重試
  const { actresses, pagination, loading, error, refresh: refreshActresses } = useActresses({
    page,
    limit: 10,
    sort,
    search: activeTab === 'actress' ? search : '',
    hasUpcoming,
  });

  // Email signup state
  const [email, setEmail] = useState('');
  const [subscribeStatus, setSubscribeStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [subscribeMessage, setSubscribeMessage] = useState('');

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setSubscribeStatus('error');
      setSubscribeMessage('請輸入有效 email');
      return;
    }
    setSubscribeStatus('loading');
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'homepage' }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSubscribeStatus('success');
        setSubscribeMessage(data.message || '已訂閱！');
        setEmail('');
      } else {
        setSubscribeStatus('error');
        setSubscribeMessage(data.error || '訂閱失敗');
      }
    } catch {
      setSubscribeStatus('error');
      setSubscribeMessage('網絡錯誤，請重試');
    }
  };

  // Email Signup Form component
  function EmailSignupForm() {
    if (subscribeStatus === 'success') {
      return (
        <div className="text-center py-3 subscribe-success">
          <span className="text-2xl subscribe-check"><Check className="w-5 h-5" /></span>
          <span className="text-white font-medium ml-2 subscribe-message">{subscribeMessage}</span>
        </div>
      );
    }
    return (
      <form onSubmit={handleEmailSubmit} className="flex flex-col sm:flex-row gap-3">
        <input
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1 px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-gray-500 focus:outline-none focus:border-pink-400"
          disabled={subscribeStatus === 'loading'}
        />
        <button
          type="submit"
          disabled={subscribeStatus === 'loading'}
          className="px-6 py-3 rounded-xl font-bold text-sm transition-all hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: 'rgb(var(--color-nadeshiko-strong))', color: 'white' }}
        >
          {subscribeStatus === 'loading' ? '訂閱中...' : '立即訂閱'}
        </button>
      </form>
    );
  }

  // 盲盒用完整女優列表（不分頁，隨機排序）
  const { actresses: allActresses } = useActresses({
    page: Math.floor(Math.random() * 10) + 1, // 隨機抽第 1-10 頁
    limit: 100, // 每次拎 100 個
    sort: 'final_score',
    search: '',
  });

  const { events, loading: eventsLoading } = useEvents({
    limit: 2000,
    // Always fetch the full set once; filtering is done client-side so the
    // dropdown options (derived from data) stay stable regardless of selection.
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

  // Filter options — canonical DB codes (see events_derive_geo_type DB trigger).
  // Values are the raw codes; labels are mapped for display.
  const EVENT_TYPE_LABELS: Record<string, string> = {
    meet: '店頭/サイン',
    dvd: 'DVD/即売',
    photo: '撮影会',
    offkai: 'オフ会',
    other: '其他活動',
  };
  const eventTypes = ['ALL', ...Object.keys(EVENT_TYPE_LABELS)];
  // Prefectures derived from loaded data, most frequent first.
  const prefectures = useMemo(() => {
    const counts = new Map<string, number>();
    (events || []).forEach(e => {
      if (e.prefecture) counts.set(e.prefecture, (counts.get(e.prefecture) || 0) + 1);
    });
    return ['ALL', ...[...counts.entries()].sort((a, b) => b[1] - a[1]).map(([p]) => p)];
  }, [events]);

  // ====================
  // Data Processing
  // ====================
  
  // Filtered events
  const filteredEvents = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return events.filter(e => {
      if (filterPrefecture !== 'ALL' && e.prefecture !== filterPrefecture) return false;
      if (filterType !== 'ALL' && e.event_type !== filterType) return false;
      // For events list tab: only show future events (today or later)
      // Calendar tab keeps all events (past + future) for history view
      if (activeTab === 'events') {
        const eventDate = new Date(e.datetime);
        eventDate.setHours(0, 0, 0, 0);
        if (eventDate < today) return false;
      }
      if (search) {
        const searchLower = search.toLowerCase();
        return e.title.toLowerCase().includes(searchLower) ||
               e.venue.toLowerCase().includes(searchLower) ||
               e.actress_name?.toLowerCase().includes(searchLower);
      }
      return true;
    }).sort((a, b) => {
      // Upcoming list: nearest events first. datetime is normalized YYYY-MM-DD
      // (see /api/events), so lexicographic compare equals chronological order.
      return (a.datetime || '').localeCompare(b.datetime || '');
    });
  }, [events, filterPrefecture, filterType, search, activeTab]);

  // Tab config - Froala Design Blocks style
  const tabs = [
    { id: 'actress' as const, label: '女優排名', icon: Crown, count: stats?.actressCount || 0 },
    { id: 'calendar' as const, label: '活動日曆', icon: Calendar, count: stats?.eventCount || 0 },
    { id: 'events' as const, label: '活動列表', icon: Ticket, count: filteredEvents.length },
  ];

  // Tab underline slide (plan 004) — measure active tab position
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const [underline, setUnderline] = useState({ left: 0, width: 0 });
  useLayoutEffect(() => {
    const container = tabsContainerRef.current;
    if (!container) return;
    const active = container.querySelector<HTMLButtonElement>(`[data-tab-id="${activeTab}"]`);
    if (!active) return;
    const cRect = container.getBoundingClientRect();
    const aRect = active.getBoundingClientRect();
    setUnderline({ left: aRect.left - cRect.left, width: aRect.width });
  }, [activeTab, stats?.actressCount, stats?.eventCount, filteredEvents.length]);

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
              <span className="text-nadeshiko-dark font-semibold text-sm"><Sparkles className="w-4 h-4" /> AV 女優活動情報平台</span>
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
                  <span className="text-text-tertiary text-xl"><Search className="w-5 h-5" /></span>
                </div>
                <input
                  type="text"
                  placeholder="搜尋女優名、活動名稱、場地..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-12 pr-12 py-4 text-lg bg-white border-2 border-border rounded-2xl shadow-froala focus:border-nadeshiko focus:ring-4 focus:ring-nadeshiko-light/30 focus:outline-none transition-[border-color,box-shadow] duration-base ease-out placeholder:text-text-tertiary"
                />
                {search.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    aria-label="清除搜尋"
                    className="search-clear absolute inset-y-0 right-0 pr-4 flex items-center text-text-tertiary hover:text-nadeshiko-dark active:scale-90 transition-transform duration-fast ease-out"
                  >
                    <span className="text-xl leading-none"><X className="w-5 h-5" /></span>
                  </button>
                )}
              </div>
            </div>

            {/* Stats Cards - unified color, semantic hierarchy (P0 #3) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
              {/* 註冊女優 — PRIMARY */}
              <div className="fdb-card p-5 text-center">
                <div className="text-3xl md:text-4xl font-bold text-nadeshiko-dark font-mono mb-1">
                  {stats?.actressCount ? stats.actressCount.toLocaleString() : <span className="animate-pulse">--</span>}
                </div>
                <div className="text-text-primary text-sm font-medium">註冊女優</div>
              </div>

              {/* 活動記錄 — PRIMARY */}
              <div className="fdb-card p-5 text-center">
                <div className="text-3xl md:text-4xl font-bold text-nadeshiko-dark font-mono mb-1">
                  {stats?.eventCount ? stats.eventCount.toLocaleString() : <span className="animate-pulse">--</span>}
                </div>
                <div className="text-text-primary text-sm font-medium">活動記錄</div>
              </div>

              {/* 年度數據 — secondary (context) */}
              <div className="fdb-card p-5 text-center">
                <div className="text-3xl md:text-4xl font-bold text-text-primary font-mono mb-1">
                  2026
                </div>
                <div className="text-text-primary text-sm font-medium">數據年度</div>
              </div>

              {/* 數據更新 — secondary */}
              <div className="fdb-card p-5 text-center">
                <div className="text-xl md:text-2xl font-semibold text-text-primary font-mono mb-1 leading-tight pt-1">
                  每日更新
                </div>
                <div className="text-text-primary text-sm font-medium">數據新鮮度</div>
              </div>
            </div>

            {/* Email Signup Section - NIPPON COLORS */}
            <div className="mt-8 max-w-xl mx-auto">
                <div className="rounded-2xl p-5 md:p-6 border bg-white" style={{borderColor:'rgba(var(--color-sakura-gray),0.6)'}}>
                <div className="text-center mb-4">
                  <h3 className="text-lg font-bold mb-1" style={{color:'rgb(var(--color-umenezumi))'}}>
                    <Camera className="w-4 h-4" /> 女優嚟香港見面會？第一個知道！
                  </h3>
                  <p className="text-sm" style={{color:'rgb(var(--color-umenezumi-light)'}}>
                    留低 email，新活動優先通知
                  </p>
                </div>
                <EmailSignupForm />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================
          今日女優盲盒 - Daily Actress Box
          ========================================= */}
      <DailyActressBox actresses={allActresses || []} />

      {/* =========================================
          Tabs Navigation - Froala Design Blocks
          ========================================= */}
      <div className="sticky top-0 z-40 border-b shadow-sm bg-white border-border">
        <div className="max-w-7xl mx-auto px-4">
          <div ref={tabsContainerRef} className="relative flex items-center justify-center gap-2 py-3">
            {tabs.map((tab) => {
              const TabIcon = tab.icon;
              return (
              <button
                key={tab.id}
                data-tab-id={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`fdb-tab ${activeTab === tab.id ? 'active' : ''}`}
              >
                <span className="text-lg"><TabIcon className="w-4 h-4" /></span>
                <span>{tab.label}</span>
                <span className="fdb-badge">{tab.count}</span>
              </button>
              );
            })}
            <span
              aria-hidden
              className="tab-underline"
              style={{
                transform: `translateX(${underline.left}px)`,
                width: underline.width,
              }}
            />
          </div>
        </div>
      </div>

      {/* =========================================
          Main Content
          ========================================= */}
      <main key={activeTab} className="tab-panel max-w-7xl mx-auto px-4 md:px-6 py-8">
        {/* Actress Ranking Tab */}
        {activeTab === 'actress' && (
          <div id="actress-grid-top">
            {/* Sort Controls */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <h2 className="text-2xl font-bold text-text-primary font-japanese flex items-center gap-2">
                <span className="text-nadeshiko-dark"><Crown className="w-4 h-4" /></span>
                女優排名
              </h2>
              <div className="flex items-center gap-3 flex-wrap">
                {/* 有活動 toggle — surfaces the 13 actresses with upcoming events */}
                <button
                  type="button"
                  onClick={() => { setHasUpcoming(!hasUpcoming); setPage(1); }}
                  aria-pressed={hasUpcoming}
                  className={`inline-flex items-center gap-1.5 min-h-[44px] px-4 rounded-xl text-sm font-medium transition-[background-color,color] duration-base ease-out ${
                    hasUpcoming
                      ? 'bg-nadeshiko-dark text-white shadow-md'
                      : 'bg-white border border-border text-text-primary hover:bg-[rgba(var(--color-sakura-gray),0.25)]'
                  }`}
                >
                  <span aria-hidden><Calendar className="w-4 h-4" /></span>
                  <span>只顯示有活動</span>
                </button>
                <span className="text-sm text-text-secondary">排序:</span>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="min-h-[44px] px-4 border rounded-xl text-sm font-medium focus:outline-none bg-white border-border text-text-primary"
                >
                  <option value="final_score"><Trophy className="w-4 h-4" /> 綜合評分</option>
                  <option value="upcoming"><Calendar className="w-4 h-4" /> 最近活動</option>
                  <option value="event_count"><BarChart2 className="w-4 h-4" /> 活動數量</option>
                  <option value="year_2026_events"><Calendar className="w-4 h-4" /> 2026年活動</option>
                  <option value="vote_count"><Heart className="w-4 h-4 fill-current" /> 投票數</option>
                  <option value="age"><Cake className="w-4 h-4" /> 年齡</option>
                </select>
              </div>
            </div>

            {/* Actress Grid */}
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <div key={i} className="skeleton h-48 rounded-2xl" />
                ))}
              </div>
            ) : error ? (
              <div className="fdb-card p-8 text-center">
                <p className="text-danger mb-4 font-medium">載入失敗: {error.message || String(error)}</p>
                <button onClick={() => refreshActresses()} className="fdb-btn fdb-btn-primary">
                  <RefreshCw className="w-4 h-4" /> 重試
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
                {actresses.map((actress, index) => (
                  <div
                    key={actress.id}
                    className="grid-item-enter"
                    style={{ transitionDelay: `${Math.min(index * 30, 240)}ms` }}
                  >
                    <ActressCard {...actress} rank={index + 1 + (page - 1) * 10} />
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
                  <ChevronLeft className="w-4 h-4" />上一頁
                </button>
                <span className="px-4 py-2 text-text-secondary">
                  第 {page} 頁 / 共 {pagination.totalPages} 頁
                </span>
                <button
                  onClick={() => setPage(p => Math.min(pagination.totalPages || 1, p + 1))}
                  disabled={page >= (pagination.totalPages || 1)}
                  className="fdb-btn fdb-btn-outline disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  下一頁<ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Calendar Tab */}
        {activeTab === 'calendar' && (
          <div>
            <h2 className="text-2xl font-bold text-text-primary font-japanese mb-6 flex items-center gap-2">
              <span className="text-nadeshiko-dark"><Calendar className="w-4 h-4" /></span>
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
              <span className="text-nadeshiko-dark"><Ticket className="w-4 h-4" /></span>
              活動列表
            </h2>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4 mb-6">
              <select
                value={filterPrefecture}
                onChange={(e) => setFilterPrefecture(e.target.value)}
                className="px-4 py-2 border rounded-xl text-sm font-medium focus:outline-none bg-white border-border text-text-primary"
              >
                {prefectures.map((p) => (
                  <option key={p} value={p}>{p === 'ALL' ? '全部地區' : p}</option>
                ))}
              </select>
              
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-4 py-2 border rounded-xl text-sm font-medium focus:outline-none bg-white border-border text-text-primary"
              >
                {eventTypes.map((t) => (
                  <option key={t} value={t}>{t === 'ALL' ? '全部類型' : (EVENT_TYPE_LABELS[t] || t)}</option>
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
              <div className="fdb-card p-10 md:p-14 text-center max-w-md mx-auto">
                <div className="text-5xl mb-4" aria-hidden><Flower2 className="w-6 h-6 text-pink-400" /></div>
                <p className="text-lg font-semibold text-text-primary mb-2">暫時搵唔到符合條件嘅活動</p>
                <p className="text-sm text-text-secondary mb-6">
                  日本 av-event.jp 通常提前 1-2 個月公布新活動，訂閱後有新場即通知你
                </p>
                <a
                  href="#top"
                  onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  className="inline-flex min-h-[44px] px-5 items-center justify-center rounded-xl bg-nadeshiko-dark text-white font-medium text-sm active:scale-[0.98] transition-transform duration-base ease-out shadow-md"
                >
                  <ArrowUp className="w-4 h-4" /> 返回訂閱通知
                </a>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="fdb-badge fdb-badge-primary">
                    <Ticket className="w-4 h-4" /> 共 {filteredEvents.length} 個活動
                  </div>
                </div>

                {/* Native grid — variable-height EventCard 唔啱 VirtualList 硬設 itemHeight，
                    強制 140px 導致內容重疊。首 60 個直接 render，超過先加 load more。 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredEvents.slice(0, eventsShown).map((event) => (
                    <EventCard key={event.id} {...event} />
                  ))}
                </div>

                {filteredEvents.length > eventsShown && (
                  <div className="flex justify-center pt-4">
                    <button
                      onClick={() => setEventsShown(n => n + 60)}
                      className="fdb-btn fdb-btn-outline"
                    >
                      顯示更多 ({filteredEvents.length - eventsShown} 個未顯示)
                    </button>
                  </div>
                )}

                {filteredEvents.length === 0 && (
                  <div className="text-center py-16 bg-white rounded-2xl border border-border">
                    <div className="text-4xl mb-3"><Flower2 className="w-6 h-6 text-pink-400" /></div>
                    <p className="text-text-secondary">搵唔到符合條件嘅活動</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ==========================================
          月間DVD排行榜 - DMM Ranking
          已隱藏：VPN 連唔到 DMM，拎唔到排行榜數據。
          資料恢復後取消下面註解即可重新顯示（連同 import）。
          ========================================== */}
      {/* <DvdRankingSection /> */}

      {/* ==========================================
          每月新作 - New Releases Section (footer 上面)
          ========================================== */}
      <NewReleasesSection />

      {/* =========================================
          Footer - Froala Design Blocks
          NIPPON COLORS
          ========================================= */}
      <footer className="border-t mt-16 bg-white border-border">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="font-bold text-text-primary text-lg mb-4 flex items-center gap-2">
                <span className="text-2xl"><Flower2 className="w-6 h-6 text-pink-400" /></span>
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
                最後更新: {stats?.lastUpdate ? new Date(new Date(stats.lastUpdate).getTime() + 8 * 60 * 60 * 1000).toISOString().slice(0, 16).replace('T', ' ') : '--'} (香港時間)
              </p>
              <p className="text-xs text-text-tertiary">
                數據僅供參考，請以官方公佈為準
              </p>
            </div>
          </div>
          
          <div className="border-t border-border mt-8 pt-8 text-center">
            <p className="text-sm text-text-tertiary">
              © 2026 JAVStar-data. Made with <Heart className="w-4 h-4 fill-current" /> in Hong Kong.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
