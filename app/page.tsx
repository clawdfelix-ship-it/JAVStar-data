'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import ActressCard from '@/components/ActressCard';
import EventCard from '@/components/EventCard';
import EventCalendar from '@/components/EventCalendar';

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

export default function HomePage() {
  const [actresses, setActresses] = useState<Actress[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [stats, setStats] = useState({ actressCount: 0, eventCount: 0 });
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState('final_score');

  // Fetch events
  useEffect(() => {
    fetchEvents();
  }, []);

  // Fetch actresses
  useEffect(() => {
    fetchActresses();
  }, [page, search, sort]);

  async function fetchEvents() {
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
  }

  async function fetchActresses() {
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
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchActresses();
  };

  // Filter events for today and upcoming
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tenDaysLater = new Date(today);
  tenDaysLater.setDate(tenDaysLater.getDate() + 10);

  const todayEvents = events.filter(e => {
    const eventDate = new Date(e.datetime);
    eventDate.setHours(0, 0, 0, 0);
    return eventDate.getTime() === today.getTime();
  });

  const upcomingEvents = events.filter(e => {
    const eventDate = new Date(e.datetime);
    eventDate.setHours(0, 0, 0, 0);
    return eventDate.getTime() > today.getTime() && eventDate.getTime() <= tenDaysLater.getTime();
  });

  return (
    <div className="min-h-screen bg-primary">
      {/* Hero Section */}
      <header className="header-gradient">
        <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
          {/* Main Title */}
          <div className="text-center mb-8">
            <h1 className="font-japanese text-3xl md:text-5xl font-bold text-text-primary mb-2">
              AV 女優イベント情報
            </h1>
            <p className="text-text-secondary text-lg">
              日本 AV 女優最新活動情報平台
            </p>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
            <div className="relative flex items-center">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜尋女優名字..."
                className="w-full px-4 py-3 md:py-4 pr-12 bg-secondary border border-border rounded-xl text-text-primary placeholder-text-secondary focus:outline-none focus:border-accent text-base md:text-lg"
              />
              <button
                type="submit"
                className="absolute right-3 md:right-4 p-2 text-text-secondary hover:text-accent transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </div>
          </form>

          {/* Stats Bar */}
          <div className="flex justify-center gap-6 md:gap-12 mt-8">
            <div className="text-center">
              <div className="font-mono text-2xl md:text-4xl font-bold text-accent">
                {stats.actressCount > 0 ? stats.actressCount : '-'}
              </div>
              <div className="text-text-secondary text-sm md:text-base">女優總數</div>
            </div>
            <div className="text-center">
              <div className="font-mono text-2xl md:text-4xl font-bold text-success">
                {stats.eventCount > 0 ? stats.eventCount : '-'}
              </div>
              <div className="text-text-secondary text-sm md:text-base">即將舉行活動</div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-2 sm:px-4 py-6 md:py-8 overflow-x-hidden">
        {/* Today's Events */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-japanese text-xl font-semibold text-text-primary flex items-center gap-2">
              <span className="text-accent">●</span> 本日開催イベント
            </h2>
            {todayEvents.length > 0 && (
              <span className="px-2 py-1 bg-accent/20 text-accent text-xs rounded-full font-medium">
                {todayEvents.length} 個活動
              </span>
            )}
          </div>
          
          {eventsLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-secondary rounded-lg p-3 border border-border animate-pulse">
                  <div className="h-3 bg-border rounded w-1/3 mb-2"></div>
                  <div className="h-4 bg-border rounded w-2/3 mb-1"></div>
                  <div className="h-3 bg-border rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : todayEvents.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full min-w-0">
              {todayEvents.slice(0, 6).map((event) => (
                <EventCard
                  key={event.id}
                  {...event}
                />
              ))}
            </div>
          ) : (
            <div className="bg-secondary rounded-lg p-6 border border-border text-center text-text-secondary">
              今日沒有活動
            </div>
          )}
        </section>

        {/* Actress Ranking Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-japanese text-xl font-semibold text-text-primary flex items-center gap-2">
              <span className="text-purple-400">●</span> 女優排名
            </h2>
            <div className="flex items-center gap-2">
              <select
                value={sort}
                onChange={(e) => { setSort(e.target.value); setPage(1); }}
                className="px-3 py-1.5 bg-secondary border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:border-accent"
              >
                <option value="final_score">加權總分</option>
                <option value="event_count">活動數量</option>
                <option value="votes">人氣度</option>
                <option value="debut_year">出道年份</option>
                <option value="age">年齡</option>
              </select>
            </div>
            <div className="text-text-secondary text-sm">
              {loading ? '載入中...' : `${pagination?.total || 0} 位女優`}
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-secondary rounded-lg p-4 border border-border animate-pulse">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-border rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-5 bg-border rounded w-32 mb-2"></div>
                      <div className="h-4 bg-border rounded w-48"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="bg-secondary rounded-lg p-8 border border-border text-center">
              <p className="text-accent mb-4">載入失敗: {error}</p>
              <button 
                onClick={() => fetchActresses()}
                className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/80"
              >
                重試
              </button>
            </div>
          ) : actresses.length === 0 ? (
            <div className="bg-secondary rounded-lg p-8 border border-border text-center">
              <p className="text-text-secondary">暫無資料</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full min-w-0">
              {actresses.map((actress, index) => (
                <ActressCard
                  key={actress.id}
                  rank={(page - 1) * 12 + index + 1}
                  {...actress}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-6">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-secondary border border-border rounded-lg text-text-primary disabled:opacity-50 hover:border-accent min-h-[44px]"
              >
                ← 上一頁
              </button>
              <span className="text-text-secondary px-4 text-sm">
                第 {page} / {pagination.totalPages} 頁
              </span>
              <button
                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
                className="px-4 py-2 bg-secondary border border-border rounded-lg text-text-primary disabled:opacity-50 hover:border-accent min-h-[44px]"
              >
                下一頁 →
              </button>
            </div>
          )}
        </section>

        {/* Calendar Section */}
        <section className="max-w-7xl mx-auto px-2 sm:px-4 py-4 mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-japanese text-xl font-semibold text-text-primary flex items-center gap-2">
              <span className="text-yellow-400">●</span> 活動日曆
            </h2>
          </div>
          <EventCalendar
            events={events}
          />
        </section>

        {/* Today's Events */}
        {todayEvents.length > 0 && (
          <section className="mb-8 mt-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-japanese text-xl font-semibold text-text-primary flex items-center gap-2">
                <span className="text-accent">●</span> 本日開催イベント
              </h2>
              {todayEvents.length > 0 && (
                <span className="px-2 py-1 bg-accent/20 text-accent text-xs rounded-full font-medium">
                  {todayEvents.length} 個活動
                </span>
              )}
            </div>
            
            {eventsLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-secondary rounded-lg p-3 border border-border animate-pulse">
                    <div className="h-3 bg-border rounded w-1/3 mb-2"></div>
                    <div className="h-4 bg-border rounded w-2/3 mb-1"></div>
                    <div className="h-3 bg-border rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full min-w-0">
                {todayEvents.slice(0, 6).map((event) => (
                  <EventCard
                    key={event.id}
                    {...event}
                  />
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-12">
        <div className="max-w-7xl mx-auto px-4 py-6 text-center text-text-secondary text-sm">
          <p>數據來源: <a href="https://www.minnano-av.com" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">minnano-av.com</a> + <a href="https://www.av-event.jp" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">av-event.jp</a></p>
          <p className="mt-2 text-text-secondary/70">AV Intelligence © 2026 | 僅供研究用途</p>
        </div>
      </footer>
    </div>
  );
}
