'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import EventCard from '@/components/EventCard';

interface ActressDetail {
  id: string;
  name_ja: string;
  name_cn: string | null;
  avatar_url: string | null;
  birthday: string | null;
  age: number | null;
  zodiac: string | null;
  height: string | null;
  bust: string | null;
  waist: string | null;
  hip: string | null;
  cup: string | null;
  agency: string | null;
  hobby: string | null;
  debut_year: number | null;
  debut_work: string | null;
  blog: string | null;
  official_site: string | null;
  tags: string | null;
  stats: {
    total_events: number;
    year_2026_events: number;
    month_04_2026_events: number;
    upcoming_events: number;
  };
  vote_count: number;
}

interface Event {
  id: string;
  title: string;
  venue: string;
  prefecture: string;
  datetime: string;
  event_type: string;
  url: string;
}

export default function ActressPage() {
  const params = useParams();
  const id = params.id as string;

  const [actress, setActress] = useState<ActressDetail | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchActress();
  }, [id]);

  async function fetchActress() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/actresses/${id}`);
      if (!response.ok) throw new Error('Failed to fetch');

      const data = await response.json();
      setActress(data.actress);
      setEvents(data.events || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      // Show demo data
      setActress({
        id,
        name_ja: '河北彩伽',
        name_cn: null,
        avatar_url: null,
        birthday: '1998-03-15',
        age: 28,
        zodiac: 'うお座',
        height: '158',
        bust: '85',
        waist: '58',
        hip: '86',
        cup: 'E',
        agency: 'C-more Entertainment',
        hobby: '料理・映画鑑賞',
        debut_year: 2021,
        debut_work: '河北彩伽 デビュー作品',
        blog: 'https://blog.example.com',
        official_site: 'https://example.com',
        tags: '熟女,美巨尻,スレンダー',
        stats: {
          total_events: 47,
          year_2026_events: 23,
          month_04_2026_events: 4,
          upcoming_events: 2,
        },
        vote_count: 128,
      });
      setEvents([
        { id: 'e1', title: '河北彩伽 サイン会 in 秋葉原', venue: '秋葉原RAD', prefecture: '東京', datetime: '2026-04-20T14:00:00+09:00', event_type: 'sign', url: '#' },
        { id: 'e2', title: '河北彩伽 デビュー5周年イベント', venue: '新宿バラガ', prefecture: '東京', datetime: '2026-04-25T19:00:00+09:00', event_type: 'debut', url: '#' },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo' });
  }

  function calculateAge(birthday: string | null): number | null {
    if (!birthday) return null;
    const birthDate = new Date(birthday);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }

  function parseTags(tagsStr: string | null): string[] {
    if (!tagsStr) return [];
    return tagsStr.split(',').map(t => t.trim()).filter(Boolean);
  }

  return (
    <div className="min-h-screen bg-bg-secondary">
      {/* Header - High Contrast */}
      <header className="sticky top-0 z-50 bg-white border-b border-border-dark shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-primary-dark hover:text-pink-700 font-semibold transition-colors">
              ← 返回排名
            </Link>
            <span className="text-text-tertiary">|</span>
            <span className="font-japanese text-lg text-text-primary font-semibold">女優詳細</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-2 md:px-4 py-6 md:py-8">
        {loading ? (
          <div className="space-y-4">
            <div className="skeleton h-64 w-full rounded-2xl" />
            <div className="skeleton h-32 w-full rounded-2xl" />
          </div>
        ) : error && !actress ? (
          <div className="fdb-card p-8 text-center">
            <p className="text-danger mb-4 font-medium">載入失敗: {error}</p>
            <button onClick={() => fetchActress()} className="fdb-btn fdb-btn-primary">
              重試
            </button>
          </div>
        ) : actress ? (
          <>
            {/* Profile Card - WHITE BACKGROUND FOR MAX CONTRAST */}
            <div className="fdb-card overflow-hidden mb-8">
              {/* Top gradient banner */}
              <div className="h-3 bg-gradient-to-r from-primary-dark via-primary to-primary-light" />
              
              <div className="p-6 md:p-8">
                <div className="flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-8">
                  {/* Avatar - Improved styling */}
                  <div className="relative flex-shrink-0">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/40 to-purple-500/40 rounded-full blur-2xl opacity-50" />
                    <div className="relative w-28 h-28 md:w-40 md:h-40 rounded-2xl overflow-hidden ring-4 ring-white shadow-xl bg-gradient-to-br from-pink-100 to-pink-200">
                      {actress.avatar_url ? (
                        <img src={actress.avatar_url} alt={actress.name_ja} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-5xl font-japanese font-bold text-primary-dark">
                          {actress.name_ja[0]}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Main Info - HIGH CONTRAST TEXT */}
                  <div className="flex-1 text-center md:text-left">
                    <h1 className="font-japanese text-2xl sm:text-3xl font-bold text-text-primary mb-2">
                      {actress.name_ja}
                    </h1>
                    {actress.name_cn && (
                      <p className="text-text-secondary text-lg mb-4 font-medium">{actress.name_cn}</p>
                    )}

                    {/* Quick badges - SOLID COLORS for contrast */}
                    <div className="flex flex-wrap justify-center md:justify-start gap-2 mb-6">
                      {actress.age && (
                        <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-pink-100 text-pink-700 rounded-xl text-sm font-bold border border-pink-200">
                          🎂 {actress.age}歲
                        </span>
                      )}
                      {actress.zodiac && (
                        <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-100 text-purple-700 rounded-xl text-sm font-bold border border-purple-200">
                          ✨ {actress.zodiac}
                        </span>
                      )}
                      {actress.cup && (
                        <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-100 text-rose-700 rounded-xl text-sm font-mono font-bold border border-rose-200">
                          💋 Cup {actress.cup}
                        </span>
                      )}
                      {actress.debut_year && (
                        <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-100 text-emerald-700 rounded-xl text-sm font-bold border border-emerald-200">
                          🎬 {actress.debut_year} 出道
                        </span>
                      )}
                    </div>

                    {/* Stats Grid - WHITE CARDS with DARK TEXT */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-xl p-4 text-center border border-pink-200">
                        <div className="font-mono text-2xl sm:text-3xl font-bold text-pink-700">{actress.stats.total_events}</div>
                        <div className="text-text-secondary text-sm mt-1 font-medium">📊 總活動</div>
                      </div>
                      <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-4 text-center border border-emerald-200">
                        <div className="font-mono text-2xl sm:text-3xl font-bold text-emerald-700">{actress.stats.year_2026_events}</div>
                        <div className="text-text-secondary text-sm mt-1 font-medium">📅 2026 年</div>
                      </div>
                      <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-4 text-center border border-amber-200">
                        <div className="font-mono text-2xl sm:text-3xl font-bold text-amber-700">{actress.stats.month_04_2026_events}</div>
                        <div className="text-text-secondary text-sm mt-1 font-medium">🗓️ 4月活動</div>
                      </div>
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 text-center border border-blue-200">
                        <div className="font-mono text-2xl sm:text-3xl font-bold text-blue-700">{actress.vote_count}</div>
                        <div className="text-text-secondary text-sm mt-1 font-medium">❤️ 投票</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Profile details grid - CLEAR LABELS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-8 pt-6 border-t border-border">
                  {actress.birthday && (
                    <div className="flex flex-col">
                      <span className="text-text-tertiary text-xs uppercase tracking-wide font-semibold">生日</span>
                      <span className="font-japanese text-text-primary mt-1 font-medium text-lg">
                        {formatDate(actress.birthday)} ({calculateAge(actress.birthday)}歲
                      </span>
                    </div>
                  )}
                  {actress.height && (
                    <div className="flex flex-col">
                      <span className="text-text-tertiary text-xs uppercase tracking-wide font-semibold">身高</span>
                      <span className="font-japanese text-text-primary mt-1 font-medium text-lg">{actress.height}cm</span>
                    </div>
                  )}
                  {actress.bust && actress.waist && actress.hip && (
                    <div className="flex flex-col">
                      <span className="text-text-tertiary text-xs uppercase tracking-wide font-semibold">三圍</span>
                      <span className="font-mono text-text-primary mt-1 font-medium text-lg">
                        B{actress.bust} / W{actress.waist} / H{actress.hip}
                      </span>
                    </div>
                  )}
                  {actress.agency && (
                    <div className="flex flex-col">
                      <span className="text-text-tertiary text-xs uppercase tracking-wide font-semibold">事務所</span>
                      <span className="text-text-primary mt-1 font-medium text-lg">{actress.agency}</span>
                    </div>
                  )}
                  {actress.hobby && (
                    <div className="flex flex-col">
                      <span className="text-text-tertiary text-xs uppercase tracking-wide font-semibold">愛好</span>
                      <span className="text-text-primary mt-1 font-medium text-lg">{actress.hobby}</span>
                    </div>
                  )}
                  {actress.debut_work && (
                    <div className="flex flex-col">
                      <span className="text-text-tertiary text-xs uppercase tracking-wide font-semibold">出道作品</span>
                      <span className="text-text-primary mt-1 font-medium">{actress.debut_work}</span>
                    </div>
                  )}
                </div>

                {/* Tags - DARK TEXT ON LIGHT BACKGROUND */}
                {actress.tags && parseTags(actress.tags).length > 0 && (
                  <div className="mt-6 pt-6 border-t border-border">
                    <span className="text-text-tertiary text-xs uppercase tracking-wide font-semibold block mb-3">標籤</span>
                    <div className="flex flex-wrap gap-2">
                      {parseTags(actress.tags).map((tag, i) => (
                        <span
                          key={i}
                          className="px-4 py-2 bg-bg-secondary text-text-primary border border-border rounded-xl text-sm font-medium"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* External links - HIGH CONTRAST BUTTONS */}
                {(actress.blog || actress.official_site) && (
                  <div className="mt-6 pt-6 border-t border-border">
                    <span className="text-text-tertiary text-xs uppercase tracking-wide font-semibold block mb-4">🔗 外部連結</span>
                    <div className="flex flex-wrap gap-3">
                      {actress.official_site && (
                        <a
                          href={actress.official_site}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="fdb-btn fdb-btn-primary"
                        >
                          🌐 官網
                        </a>
                      )}
                      {actress.blog && (
                        <a
                          href={actress.blog}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="fdb-btn fdb-btn-outline"
                        >
                          📝 博客
                        </a>
                      )}
                      <a
                        href={`https://www.minnano-av.com/actress/${actress.id}.html`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="fdb-btn fdb-btn-outline"
                      >
                        📺 minnano-av
                      </a>
                      <a
                        href={`https://www.av-event.jp/search/?q=${encodeURIComponent(actress.name_ja)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="fdb-btn fdb-btn-outline"
                      >
                        🎫 av-event
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Events section */}
            <div>
              <h2 className="font-japanese text-xl font-bold text-text-primary mb-6 flex items-center gap-2">
                <span className="text-pink-600">●</span>
                活動記錄 
                <span className="text-text-secondary font-normal text-base">({events.length})</span>
              </h2>

              {events.length === 0 ? (
                <div className="fdb-card p-8 text-center">
                  <p className="text-text-secondary">暫無活動記錄</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {events.map((event) => (
                    <EventCard key={event.id} {...event} showActress={false} />
                  ))}
                </div>
              )}
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}
