'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
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
    <div className="min-h-screen bg-primary">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-secondary border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <a href="/" className="text-accent hover:underline">← 返回排名</a>
            <span className="text-text-secondary">|</span>
            <span className="font-japanese text-lg">女優詳細</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-2 md:px-4 py-6 md:py-8">
        {loading ? (
          <div className="space-y-4">
            <div className="skeleton h-64 w-full rounded-lg" />
            <div className="skeleton h-32 w-full rounded-lg" />
          </div>
        ) : error && !actress ? (
          <div className="bg-secondary rounded-lg p-8 border border-border text-center">
            <p className="text-accent mb-4">載入失敗: {error}</p>
            <button onClick={() => fetchActress()} className="px-4 py-2 bg-accent text-white rounded-lg">
              重試
            </button>
          </div>
        ) : actress ? (
          <>
            {/* Profile card */}
            <div className="bg-secondary rounded-lg border border-border overflow-hidden mb-8">
              <div className="p-6">
                <div className="flex flex-col md:flex-row items-center md:items-start gap-4 md:gap-6">
                  {/* Avatar with gradient backdrop */}
                  <div className="relative flex-shrink-0">
                    <div className="absolute inset-0 bg-gradient-to-br from-accent/30 to-purple-500/30 rounded-full blur-xl" />
                    <div className="relative w-28 h-28 md:w-40 md:h-40 rounded-full bg-primary overflow-hidden ring-4 ring-accent/50 shadow-2xl shadow-accent/20">
                      {actress.avatar_url ? (
                        <img src={actress.avatar_url} alt={actress.name_ja} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-5xl font-japanese text-text-secondary">
                          {actress.name_ja[0]}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Main info */}
                  <div className="flex-1">
                    <h1 className="font-japanese text-2xl sm:text-3xl font-bold text-text-primary mb-1 text-center md:text-left">
                      {actress.name_ja}
                    </h1>
                    {actress.name_cn && (
                      <p className="text-text-secondary text-lg mb-4">{actress.name_cn}</p>
                    )}

                    {/* Quick badges - enhanced with icons */}
                    <div className="flex flex-wrap gap-2 mb-6">
                      {actress.age && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-accent/15 text-accent rounded-full text-sm font-semibold border border-accent/20">
                          🎂 {actress.age}歲
                        </span>
                      )}
                      {actress.zodiac && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/15 text-purple-300 rounded-full text-sm border border-purple-500/20">
                          ✨ {actress.zodiac}
                        </span>
                      )}
                      {actress.cup && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-pink-500/15 text-pink-300 rounded-full text-sm font-mono border border-pink-500/20">
                          💋 Cup {actress.cup}
                        </span>
                      )}
                      {actress.debut_year && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-success/15 text-success rounded-full text-sm border border-success/20">
                          🎬 {actress.debut_year} 出道
                        </span>
                      )}
                    </div>

                    {/* Stats grid - enhanced cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                      <div className="bg-gradient-to-br from-accent/20 to-accent/5 rounded-xl p-3 sm:p-4 text-center border border-accent/20 hover:border-accent/40 transition-colors">
                        <div className="font-mono text-2xl sm:text-3xl font-bold text-accent">{actress.stats.total_events}</div>
                        <div className="text-text-secondary text-xs sm:text-sm mt-1 sm:mt-2">📊 總活動</div>
                      </div>
                      <div className="bg-gradient-to-br from-success/20 to-success/5 rounded-xl p-3 sm:p-4 text-center border border-success/20 hover:border-success/40 transition-colors">
                        <div className="font-mono text-2xl sm:text-3xl font-bold text-success">{actress.stats.year_2026_events}</div>
                        <div className="text-text-secondary text-xs sm:text-sm mt-1 sm:mt-2">📅 2026 年</div>
                      </div>
                      <div className="bg-gradient-to-br from-yellow-400/20 to-yellow-400/5 rounded-xl p-3 sm:p-4 text-center border border-yellow-400/20 hover:border-yellow-400/40 transition-colors">
                        <div className="font-mono text-2xl sm:text-3xl font-bold text-yellow-400">{actress.stats.month_04_2026_events}</div>
                        <div className="text-text-secondary text-xs sm:text-sm mt-1 sm:mt-2">🗓️ 4月活動</div>
                      </div>
                      <div className="bg-gradient-to-br from-blue-400/20 to-blue-400/5 rounded-xl p-3 sm:p-4 text-center border border-blue-400/20 hover:border-blue-400/40 transition-colors">
                        <div className="font-mono text-2xl sm:text-3xl font-bold text-blue-400">{actress.vote_count}</div>
                        <div className="text-text-secondary text-xs sm:text-sm mt-1 sm:mt-2">❤️ 投票</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Profile details grid - enhanced with icons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8 pt-6 border-t border-border">
                  {actress.birthday && (
                    <div className="flex flex-col">
                      <span className="text-text-secondary text-xs uppercase tracking-wide">生日</span>
                      <span className="font-japanese text-text-primary mt-1">
                        {formatDate(actress.birthday)} ({calculateAge(actress.birthday)}歲)
                      </span>
                    </div>
                  )}
                  {actress.height && (
                    <div className="flex flex-col">
                      <span className="text-text-secondary text-xs uppercase tracking-wide">身高</span>
                      <span className="font-japanese text-text-primary mt-1">{actress.height}cm</span>
                    </div>
                  )}
                  {actress.bust && actress.waist && actress.hip && (
                    <div className="flex flex-col">
                      <span className="text-text-secondary text-xs uppercase tracking-wide">三圍</span>
                      <span className="font-mono text-text-primary mt-1">
                        B{actress.bust} / W{actress.waist} / H{actress.hip}
                      </span>
                    </div>
                  )}
                  {actress.agency && (
                    <div className="flex flex-col">
                      <span className="text-text-secondary text-xs uppercase tracking-wide">事務所</span>
                      <span className="text-text-primary mt-1">{actress.agency}</span>
                    </div>
                  )}
                  {actress.hobby && (
                    <div className="flex flex-col">
                      <span className="text-text-secondary text-xs uppercase tracking-wide">愛好</span>
                      <span className="text-text-primary mt-1">{actress.hobby}</span>
                    </div>
                  )}
                  {actress.debut_work && (
                    <div className="flex flex-col">
                      <span className="text-text-secondary text-xs uppercase tracking-wide">出道作品</span>
                      <span className="text-text-primary mt-1 text-sm">{actress.debut_work}</span>
                    </div>
                  )}
                </div>

                {/* Tags */}
                {actress.tags && parseTags(actress.tags).length > 0 && (
                  <div className="mt-6 pt-6 border-t border-border">
                    <span className="text-text-secondary text-xs uppercase tracking-wide block mb-3">標籤</span>
                    <div className="flex flex-wrap gap-2">
                      {parseTags(actress.tags).map((tag, i) => (
                        <span
                          key={i}
                          className="px-3 py-1 bg-accent/10 text-accent/90 border border-accent/30 rounded-full text-sm hover:bg-accent/20 transition-colors cursor-default"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* External links - enhanced buttons */}
                {(actress.blog || actress.official_site) && (
                  <div className="mt-6 pt-6 border-t border-border">
                    <span className="text-text-secondary text-xs uppercase tracking-wide block mb-3">🔗 外部連結</span>
                    <div className="flex flex-wrap gap-3">
                      {actress.official_site && (
                        <a
                          href={actress.official_site}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-accent to-pink-500 text-white rounded-xl hover:from-accent/90 hover:to-pink-500/90 transition-all text-sm font-semibold shadow-lg shadow-accent/25 hover:shadow-accent/40 hover:-translate-y-0.5"
                        >
                          🌐 官網
                        </a>
                      )}
                      {actress.blog && (
                        <a
                          href={actress.blog}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-500/20 to-purple-600/20 border border-purple-500/30 text-purple-300 rounded-xl hover:from-purple-500/30 hover:to-purple-600/30 hover:border-purple-500/50 transition-all text-sm font-medium"
                        >
                          📝 博客
                        </a>
                      )}
                      <a
                        href={`https://www.minnano-av.com/actress/${actress.id}.html`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary border border-border text-text-primary rounded-xl hover:border-accent hover:text-accent transition-all text-sm font-medium"
                      >
                        📺 minnano-av
                      </a>
                      <a
                        href={`https://www.av-event.jp/search/?q=${encodeURIComponent(actress.name_ja)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary border border-border text-text-primary rounded-xl hover:border-accent hover:text-accent transition-all text-sm font-medium"
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
              <h2 className="font-japanese text-xl font-semibold text-text-primary mb-6">
                活動記錄 <span className="text-text-secondary font-normal">({events.length})</span>
              </h2>

              {events.length === 0 ? (
                <div className="bg-secondary rounded-lg p-8 border border-border text-center">
                  <p className="text-text-secondary">暫無活動記錄</p>
                </div>
              ) : (
                <div className="grid gap-4">
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
