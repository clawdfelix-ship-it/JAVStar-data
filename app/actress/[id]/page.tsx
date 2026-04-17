'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import EventCard from '@/components/EventCard';

interface ActressDetail {
  id: string;
  name_ja: string;
  name_cn: string;
  birthday: string | null;
  height: number | null;
  bust: number | null;
  waist: number | null;
  hip: number | null;
  debut_date: string | null;
  avatar_url: string | null;
  stats: {
    total_events: number;
    year_2026_events: number;
    month_04_2026_events: number;
    upcoming_events: number;
  };
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
        name_cn: '',
        birthday: '1998-03-15',
        height: 158,
        bust: 85,
        waist: 58,
        hip: 86,
        debut_date: '2021-04-15',
        avatar_url: null,
        stats: {
          total_events: 47,
          year_2026_events: 23,
          month_04_2026_events: 4,
          upcoming_events: 2,
        },
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
                <div className="flex items-start gap-6">
                  {/* Avatar */}
                  <div className="w-32 h-32 rounded-full bg-primary overflow-hidden flex-shrink-0">
                    {actress.avatar_url ? (
                      <img src={actress.avatar_url} alt={actress.name_ja} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-5xl font-japanese text-text-secondary">
                        {actress.name_ja[0]}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1">
                    <h1 className="font-japanese text-3xl font-bold text-text-primary mb-2">
                      {actress.name_ja}
                    </h1>
                    {actress.name_cn && (
                      <p className="text-text-secondary text-lg mb-4">{actress.name_cn}</p>
                    )}

                    {/* Stats grid */}
                    <div className="grid grid-cols-4 gap-4 mt-6">
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
                        <div className="font-mono text-2xl font-bold text-blue-400">{actress.stats.upcoming_events}</div>
                        <div className="text-text-secondary text-sm mt-1">即將舉行</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bio details */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-6 border-t border-border">
                  {actress.birthday && (
                    <div>
                      <div className="text-text-secondary text-sm">生日</div>
                      <div className="font-japanese text-text-primary mt-1">
                        {formatDate(actress.birthday)} ({calculateAge(actress.birthday)}歲)
                      </div>
                    </div>
                  )}
                  {actress.height && (
                    <div>
                      <div className="text-text-secondary text-sm">身高</div>
                      <div className="font-japanese text-text-primary mt-1">{actress.height}cm</div>
                    </div>
                  )}
                  {actress.bust && (
                    <div>
                      <div className="text-text-secondary text-sm">三圍</div>
                      <div className="font-japanese text-text-primary mt-1">
                        B{actress.bust} / W{actress.waist} / H{actress.hip}
                      </div>
                    </div>
                  )}
                  {actress.debut_date && (
                    <div>
                      <div className="text-text-secondary text-sm">出道</div>
                      <div className="font-japanese text-text-primary mt-1">{formatDate(actress.debut_date)}</div>
                    </div>
                  )}
                </div>
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

            {/* External links */}
            <div className="mt-8 pt-6 border-t border-border">
              <h3 className="text-text-secondary text-sm mb-4">外部連結</h3>
              <div className="flex gap-4">
                <a 
                  href={`https://www.minnano-av.com/actress/${actress.id}.html`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-primary border border-border rounded-lg text-text-primary hover:border-accent"
                >
                  minnano-av.com
                </a>
                <a 
                  href={`https://www.av-event.jp/search/?q=${encodeURIComponent(actress.name_ja)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-primary border border-border rounded-lg text-text-primary hover:border-accent"
                >
                  av-event.jp
                </a>
              </div>
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}