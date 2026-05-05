'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { format } from 'date-fns';
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
  total: number;
  totalPages: number;
}

// ====================
// Utility Functions
// ====================
function safeNewDate(dateStr: string | undefined): Date {
  if (!dateStr) return new Date(0);
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? new Date(0) : d;
  } catch { return new Date(0); }
}

function safeFormatDate(dateStr: string | undefined): string {
  if (!dateStr) return '--';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '--';
    return d.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
  } catch { return '--'; }
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
        setEvents(data.data || []);
        if (data.meta?.total) {
          setStats(prev => ({ ...prev, eventCount: data.meta.total }));
        }
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
      if (search) params.set('search', search);
      params.set('sort', sort);

      const response = await fetch(`/api/actresses?${params}`);
      if (!response.ok) throw new Error('Failed to fetch');
      
      const data = await response.json();
      setActresses(data.data || []);
      setPagination(data.pagination);
      if (data.pagination?.total) {
        setStats(prev => ({ ...prev, actressCount: data.pagination.total }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      // Demo data
      setActresses([
        { id: 'demo1', name_ja: '河北彩伽', name_cn: null, avatar_url: null, age: 28, zodiac: 'うお座', cup: 'E', height: '158', bust: '85', waist: '58', hip: '86', agency: 'C-more', hobby: '料理', debut_year: 2021, event_count: 23, year_2026_events: 23, vote_count: 128, final_score: 37 },
        { id: 'demo2', name_ja: '成宮いろは', name_cn: null, avatar_url: null, age: 27, zodiac: '牡羊座', cup: 'D', height: '155', bust: '83', waist: '56', hip: '84', agency: null, hobby: '映画', debut_year: 2020, event_count: 19, year_2026_events: 19, vote_count: 95, final_score: 33 },
        { id: 'demo3', name_ja: '三上悠亜', name_cn: null, avatar_url: null, age: 32, zodiac: '射手座', cup: 'D', height: '163', bust: '86', waist: '60', hip: '88', agency: 'FALENO', hobby: 'KTV', debut_year: 2015, event_count: 14, year_2026_events: 14, vote_count: 82, final_score: 28 },
        { id: 'demo4', name_ja: '橋爪quet', name_cn: null, avatar_url: null, age: 25, zodiac: '双子座', cup: 'F', height: '165', bust: '88', waist: '58', hip: '87', agency: 'nine', hobby: null, debut_year: 2019, event_count: 12, year_2026_events: 12, vote_count: 67, final_score: 24 },
        { id: 'demo5', name_ja: '桜井るん', name_cn: null, avatar_url: null, age: 23, zodiac: '水瓶座', cup: 'C', height: '153', bust: '80', waist: '55', hip: '82', agency: 'SOD', hobby: '舞蹈', debut_year: 2022, event_count: 11, year_2026_events: 11, vote_count: 54, final_score: 22 },
        { id: 'demo6', name_ja: '架乃ゆら', name_cn: null, avatar_url: null, age: 24, zodiac: '蠍座', cup: 'D', height: '160', bust: '84', waist: '57', hip: '85', agency: 'FALENO', hobby: '健身', debut_year: 2023, event_count: 9, year_2026_events: 9, vote_count: 45, final_score: 18 },
      ]);
      setPagination({ page: 1, limit: 12, total: 6, totalPages: 1 });
    } finally {
      setLoading(false);
    }
  }, [page, search, sort]);

  // ====================
  // Effects
  // ====================
  useEffect(() => {
    fetchEvents();
    fetchLatestEvents();
    fetchLastUpdate();
  }, [fetchEvents, fetchLatestEvents, fetchLastUpdate]);

  useEffect(() => {
    fetchActresses();
  }, [fetchActresses]);

  // ====================
  // Computed Values
  // ====================
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchActresses();
  };

  // Filter events
  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  const tenDaysLater = useMemo(() => {
    const t = new Date(today);
    t.setDate(t.getDate() + 10);
    return t;
  }, [today]);

  const todayEvents = useMemo(() => events.filter(e => {
    const eventDate = safeNewDate(e.datetime);
    eventDate.setHours(0, 0, 0, 0);
    if (eventDate.getTime() !== today.getTime()) return false;
    if (filterPrefecture !== 'ALL') {
      const pref = filterPrefecture === '其他' ? null : filterPrefecture;
      if (e.prefecture !== pref) return false;
    }
    return true;
  }), [events, filterPrefecture, today]);

  const upcomingEvents = useMemo(() => events.filter(e => {
    const eventDate = safeNewDate(e.datetime);
    eventDate.setHours(0, 0, 0, 0);
    if (eventDate.getTime() <= today.getTime() || eventDate.getTime() > tenDaysLater.getTime()) return false;
    if (filterPrefecture !== 'ALL') {
      const pref = filterPrefecture === '其他' ? null : filterPrefecture;
      if (e.prefecture !== pref) return false;
    }
    return true;
  }), [events, filterPrefecture, today, tenDaysLater]);

  // ====================
  // Render
  // ====================
  return (
    <div className="min-h-screen bg-bg-secondary">
      {/* ====================
          Hero Section - Froala Design Blocks Style
          ==================== */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary-dark to-purple-700">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-0 w-80 h-80 bg-white rounded-full translate-x-1/3 translate-y-1/3"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 py-10 md:py-16">
          {/* Main Title */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-white/80 text-sm mb-4">
              <span className="w-2 h-2 bg-success rounded-full animate-pulse"></span>
              實時更新
              {lastUpdate && <span className="text-white/60">· {lastUpdate}</span>}
            </div>
            
            <h1 className="font-japanese text-3xl md:text-5xl font-bold text-white mb-3 tracking-tight">
              AV 女優イベント情報
            </h1>
            <p className="text-white/70 text-lg max-w-xl mx-auto">
              日本 AV 女優最新活動情報平台 — 一覽所有見面會、攝影會、簽名會活動
            </p>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-8">
            <div className="relative flex items-center">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜尋女優名字..."
                className="w-full px-5 py-4 pr-14 bg-white rounded-2xl text-text-primary placeholder-text-secondary focus:outline-none focus:ring-4 focus:ring-white/20 text-lg shadow-xl transition-all"
              />
              <button
                type="submit"
                className="absolute right-4 p-2 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </div>
          </form>

          {/* Stats Cards - Froala Design Blocks Style */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <div className="fdb-card text-center p-5 slide-up" style={{ animationDelay: '0.1s' }}>
              <div className="text-4xl mb-2">👩</div>
              <div className="text-3xl font-bold text-primary font-mono">
                {stats.actressCount > 0 ? stats.actressCount.toLocaleString() : '-'}
              </div>
              <div className="text-text-secondary text-sm mt-1">女優總數</div>
            </div>
            
            <div className="fdb-card text-center p-5 slide-up" style={{ animationDelay: '0.2s' }}>
              <div className="text-4xl mb-2">📅</div>
              <div className="text-3xl font-bold text-success font-mono">
                {stats.eventCount > 0 ? stats.eventCount.toLocaleString() : '-'}
              </div>
              <div className="text-text-secondary text-sm mt-1">即將舉行活動</div>
            </div>
            
            <div className="fdb-card text-center p-5 slide-up" style={{ animationDelay: '0.3s' }}>
              <div className="text-4xl mb-2">🔥</div>
              <div className="text-3xl font-bold text-warning font-mono">
                {todayEvents.length}
              </div>
              <div className="text-text-secondary text-sm mt-1">今日活動</div>
            </div>
            
            <div className="fdb-card text-center p-5 slide-up" style={{ animationDelay: '0.4s' }}>
              <div className="text-4xl mb-2">⏰</div>
              <div className="text-3xl font-bold text-purple-600 font-mono">
                {upcomingEvents.length}
              </div>
              <div className="text-text-secondary text-sm mt-1">未來10日</div>
            </div>
          </div>
        </div>
      </section>

      {/* ====================
          Main Content
          ==================== */}
      <main className="max-w-7xl mx-auto px-2 sm:px-4 py-8">
        {/* Latest Events Announcement */}
        {latestEvents.length > 0 && (
          <div className="mb-8 fdb-card p-5 slide-up">
            <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
              <span className="text-warning text-2xl">📢</span> 
              最新添加活動
              <span className="fdb-badge ml-2">{latestEvents.length} 個</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {latestEvents.map((event) => (
                <a
                  key={event.id}
                  href={`#event-${event.id}`}
                  className="block p-3 bg-bg-secondary rounded-xl hover:bg-primary/10 transition-all border border-border-light hover:border-primary-light"
                >
                  <div className="text-text-primary font-medium text-sm line-clamp-2">
                    {event.title}
                  </div>
                  <div className="text-text-secondary text-xs mt-2 flex items-center gap-1">
                    <span>📅</span>
                    {safeFormatDate(event.datetime)}
                    {event.venue && <span>· {event.venue}</span>}
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Filter Bar */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <span className="text-text-secondary text-sm flex items-center gap-1">
            <span>📍</span> 地區篩選:
          </span>
          <div className="flex flex-wrap gap-2">
            {prefectures.map(p => (
              <button
                key={p}
                onClick={() => setFilterPrefecture(p)}
                className={`fdb-badge cursor-pointer transition-all ${
                  filterPrefecture === p
                    ? '!bg-primary !text-white'
                    : 'hover:bg-primary/20'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 mb-6 border-b border-border pb-4">
          {[
            { id: 'actress', label: '女優排名', icon: '👩', count: pagination?.total || 0 },
            { id: 'calendar', label: '活動日曆', icon: '📅', count: events.length },
            { id: 'events', label: '即將舉行', icon: '🔥', count: upcomingEvents.length + todayEvents.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-5 py-2.5 rounded-xl font-medium transition-all flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-primary to-primary-light text-white shadow-lg shadow-primary/20'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                activeTab === tab.id ? 'bg-white/20' : 'bg-bg-tertiary'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* ====================
            Actress Ranking Tab
            ==================== */}
        {activeTab === 'actress' && (
          <section className="slide-up">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
              <h2 className="font-japanese text-2xl font-bold text-text-primary flex items-center gap-2">
                <span className="text-purple-600">●</span> 
                女優人氣排名
              </h2>
              <div className="flex items-center gap-3">
                <select
                  value={sort}
                  onChange={(e) => { setSort(e.target.value); setPage(1); }}
                  className="px-4 py-2 bg-bg-primary border border-border rounded-xl text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                >
                  <option value="final_score">🏆 加權總分</option>
                  <option value="event_count">📅 活動數量</option>
                  <option value="votes">❤️ 人氣度</option>
                  <option value="debut_year">🎬 出道年份</option>
                  <option value="age">🎂 年齡</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="fdb-card animate-pulse">
                    <div className="h-48 bg-bg-tertiary rounded-t-2xl"></div>
                    <div className="p-5">
                      <div className="h-6 bg-bg-tertiary rounded w-3/4 mb-3"></div>
                      <div className="h-4 bg-bg-tertiary rounded w-1/2 mb-4"></div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="h-8 bg-bg-tertiary rounded"></div>
                        <div className="h-8 bg-bg-tertiary rounded"></div>
                        <div className="h-8 bg-bg-tertiary rounded"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">😢</div>
                <p className="text-text-secondary mb-4">載入失敗，請稍後再試</p>
                <button onClick={fetchActresses} className="fdb-btn fdb-btn-primary">
                  重新載入
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {actresses.map((actress, index) => (
                    <div key={actress.id} className="slide-up" style={{ animationDelay: `${index * 0.1}s` }}>
                      <ActressCard {...actress} rank={index + 1 + (page - 1) * 12} />
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {pagination && pagination.totalPages > 1 && (
                  <div className="flex justify-center items-center gap-2 mt-10">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="fdb-btn fdb-btn-outline disabled:opacity-40"
                    >
                      ← 上一頁
                    </button>
                    
                    <span className="px-4 py-2 text-text-secondary text-sm">
                      第 {page} 頁，共 {pagination.totalPages} 頁
                    </span>
                    
                    <button
                      onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                      disabled={page === pagination.totalPages}
                      className="fdb-btn fdb-btn-outline disabled:opacity-40"
                    >
                      下一頁 →
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        )}

        {/* ====================
            Calendar Tab
            ==================== */}
        {activeTab === 'calendar' && (
          <section className="slide-up">
            <h2 className="font-japanese text-2xl font-bold text-text-primary mb-6 flex items-center gap-2">
              <span className="text-primary">📅</span> 
              活動日曆
            </h2>
            <EventCalendar events={events} />
          </section>
        )}

        {/* ====================
            Events Tab
            ==================== */}
        {activeTab === 'events' && (
          <section className="slide-up">
            <h2 className="font-japanese text-2xl font-bold text-text-primary mb-6 flex items-center gap-2">
              <span className="text-warning">🔥</span> 
              即將舉行活動
            </h2>

            {/* Today's Events */}
            {todayEvents.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-danger mb-4 flex items-center gap-2">
                  <span className="animate-pulse">⚡</span>
                  今日活動 ({todayEvents.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {todayEvents.map((event) => (
                    <EventCard key={event.id} {...event} showActress={true} />
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming Events */}
            {upcomingEvents.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-success mb-4 flex items-center gap-2">
                  <span>📅</span>
                  未來10日活動 ({upcomingEvents.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {upcomingEvents.slice(0, 30).map((event) => (
                    <EventCard key={event.id} {...event} showActress={true} />
                  ))}
                  {upcomingEvents.length > 30 && (
                    <div className="col-span-full text-center py-4">
                      <p className="text-text-secondary text-sm">
                        仲有 {upcomingEvents.length - 30} 個活動...
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {todayEvents.length === 0 && upcomingEvents.length === 0 && (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">📅</div>
                <p className="text-text-secondary">暫無即將舉行的活動</p>
              </div>
            )}
          </section>
        )}
      </main>

      {/* ====================
          Footer
          ==================== */}
      <footer className="bg-bg-primary border-t border-border mt-16 py-10">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="text-2xl font-bold text-text-primary mb-2 font-japanese">
            AV 女優イベント情報
          </div>
          <p className="text-text-secondary text-sm">
            資料來源：各官方網站 · 最後更新：{lastUpdate || '--'}
          </p>
          <div className="mt-4 text-xs text-text-tertiary">
            本網站僅供資訊分享用途，非官方網站
          </div>
        </div>
      </footer>
    </div>
  );
}
