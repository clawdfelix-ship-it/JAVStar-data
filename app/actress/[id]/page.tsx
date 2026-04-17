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

      <main className="max-w-7xl mx-auto px-4 py-8">
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
                <div className="flex flex-col md:flex-row items-start gap-6">
                  {/* Avatar */}
                  <div className="w-40 h-40 rounded-full bg-primary overflow-hidden flex-shrink-0 ring-4 ring-accent/30">
                    {actress.avatar_url ? (
                      <img src={actress.avatar_url} alt={actress.name_ja} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-5xl font-japanese text-text-secondary">
                        {actress.name_ja[0]}
                      </div>
                    )}
                  </div>

                  {/* Main info */}
                  <div className="flex-1">
                    <h1 className="font-japanese text-3xl font-bold text-text-primary mb-1">
                      {actress.name_ja}
                    </h1>
                    {actress.name_cn && (
                      <p className="text-text-secondary text-lg mb-4">{actress.name_cn}</p>
                    )}

                    {/* Quick badges */}
                    <div className="flex flex-wrap gap-2 mb-6">
                      {actress.age && (
                        <span className="px-3 py-1 bg-accent/20 text-accent rounded-full text-sm font-medium">
                          {actress.age}歲
                        </span>
                      )}
                      {actress.zodiac && (
                        <span className="px-3 py-1 bg-primary text-text-secondary rounded-full text-sm">
                          ♓ {actress.zodiac}
                        </span>
                      )}
                      {actress.cup && (
                        <span className="px-3 py-1 bg-primary text-text-secondary rounded-full text-sm font-mono">
                          Cup: {actress.cup}
                        </span>
                      )}
                      {actress.debut_year && (
                        <span className="px-3 py-1 bg-success/20 text-success rounded-full text-sm">
                          出道: {actress.debut_year}
                        </span>
                      )}
                    </div>

                    {/* Stats grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="bg-primary rounded-lg p-4 text-center">
                        <div className="font-mono text-2xl font-bold text-accent">{actress.stats.total_events}</div>
                        <div className="text-text-secondary text-sm mt-1">總活動數</div>
                      </div>
                      <div className="bg-primary rounded-lg p-4 text-center">
                        <div className="font-mono text-2xl font-bold text-success">{actress.stats.year_2026_events}</div>
                        <div className="text-text-secondary text-sm mt-1">2026 年</div>
                      </div>
                      <div className="bg-primary rounded-lg p-4 text-center">
                        <div className="font-mono text-2xl font-bold text-yellow-400">{actress.stats.month_04_2026_events}</div>
                        <div className="text-text-secondary text-sm mt-1">4 月活動</div>
                      </div>
                      <div className="bg-primary rounded-lg p-4 text-center">
                        <div className="font-mono text-2xl font-bold text-blue-400">{actress.vote_count}</div>
                        <div className="text-text-secondary text-sm mt-1">投票數</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Profile details grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-4 mt-8 pt-6 border-t border-border">
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

                {/* External links */}
                {(actress.blog || actress.official_site) && (
                  <div className="mt-6 pt-6 border-t border-border">
                    <span className="text-text-secondary text-xs uppercase tracking-wide block mb-3">外部連結</span>
                    <div className="flex flex-wrap gap-3">
                      {actress.official_site && (
                        <a
                          href={actress.official_site}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/80 transition-colors text-sm font-medium"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                          </svg>
                          官網
                        </a>
                      )}
                      {actress.blog && (
                        <a
                          href={actress.blog}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-primary border border-border text-text-primary rounded-lg hover:border-accent transition-colors text-sm"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                          </svg>
                          博客
                        </a>
                      )}
                      <a
                        href={`https://www.minnano-av.com/actress/${actress.id}.html`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-primary border border-border text-text-primary rounded-lg hover:border-accent transition-colors text-sm"
                      >
                        minnano-av
                      </a>
                      <a
                        href={`https://www.av-event.jp/search/?q=${encodeURIComponent(actress.name_ja)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-primary border border-border text-text-primary rounded-lg hover:border-accent transition-colors text-sm"
                      >
                        av-event.jp
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
