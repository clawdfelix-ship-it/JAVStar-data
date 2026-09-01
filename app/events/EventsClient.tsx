'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import CalendarMonth from './CalendarMonth';

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

export default function EventsClient() {
  const [events, setEvents] = useState<Event[]>([]);
  const [holidays, setHolidays] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prefecture, setPrefecture] = useState('');
  const [eventType, setEventType] = useState('');
  const [region, setRegion] = useState('all');
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    fetchEvents();
  }, [prefecture, eventType, region]);

  useEffect(() => {
    fetch('/api/holidays')
      .then(r => r.json())
      .then(d => {
        const map: Record<string, string> = {};
        (d.holidays || []).forEach((h: { date: string; name: string }) => {
          map[h.date] = h.name;
        });
        setHolidays(map);
      })
      .catch(() => {});
  }, []);

  async function fetchEvents() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (prefecture) params.set('prefecture', prefecture);
      if (eventType) params.set('type', eventType);
      if (region && region !== 'all') params.set('region', region);
      params.set('limit', '200');

      const res = await fetch(`/api/events?${params}`);
      const d = await res.json();
      setEvents(d.data || []);
    } catch {
      setError('載入失敗');
    } finally {
      setLoading(false);
    }
  }

  function formatDate(d: string) {
    const date = new Date(d.includes('T') ? d : d + 'T00:00:00+09:00');
    return date.toLocaleDateString('ja-JP', {
      month: 'short', day: 'numeric', weekday: 'short',
    });
  }

  function getEventTypeLabel(t: string) {
    const map: Record<string, string> = {
      dvd: 'DVD/即売', photo: '撮影会', offkai: 'オフ会', meet: '店頭/サイン', other: '其他活動',
    };
    return map[t] || t;
  }

  function getEventTypeColor(t: string) {
    const map: Record<string, string> = {
      dvd: 'text-[rgb(var(--color-nadeshiko-dark))] bg-[rgba(var(--color-sakura-gray),0.4)] border-[rgba(var(--color-nadeshiko),0.3)]',
      photo: 'text-amber-600 bg-[rgba(251,191,36,0.15)] border-[rgba(251,191,36,0.3)]',
      offkai: 'text-blue-600 bg-[rgba(59,130,246,0.15)] border-[rgba(59,130,246,0.3)]',
      meet: 'text-emerald-700 bg-[rgba(16,185,129,0.13)] border-[rgba(16,185,129,0.3)]',
      other: 'text-[rgb(var(--color-umenezumi))] bg-[rgba(var(--color-sakura-gray),0.3)] border-[rgba(var(--color-sakura-gray),0.5)]',
    };
    return map[t] || map.other;
  }

  function isToday(d: string) {
    const date = new Date(d);
    const now = new Date();
    return date.toDateString() === now.toDateString();
  }

  // Group events by date
  const grouped: Record<string, Event[]> = {};
  events.forEach(ev => {
    const dateKey = ev.datetime.split('T')[0];
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(ev);
  });

  // Filtered grouped events (if date selected, only show that date)
  const displayGrouped = selectedDate
    ? { [selectedDate]: grouped[selectedDate] || [] }
    : grouped;

  const prefectures = [...new Set(events.map(e => e.prefecture).filter(Boolean))].sort();
  const eventTypes = [...new Set(events.map(e => e.event_type).filter(Boolean))].sort();

  // Events for calendar (only future events)
  const calendarEvents = events.filter(e => new Date(e.datetime) > new Date());

  return (
    <div className="min-h-screen bg-white text-text-primary">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-white/70 backdrop-blur-xl backdrop-saturate-150 supports-[backdrop-filter]:bg-white/60 px-4 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/" className="text-primary-dark hover:text-pink-700 text-sm">← 返回</Link>
              <h1 className="text-lg font-bold text-text-primary">活動列表</h1>
            </div>
            {selectedDate && (
              <button
                onClick={() => setSelectedDate(null)}
                className="text-xs px-3 py-1 bg-primary-dark text-white rounded-lg hover:opacity-90 transition-colors"
              >
                顯示全部日期
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Calendar + Filters row */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
          {/* Calendar */}
          <div className="lg:col-span-1">
            <CalendarMonth
              events={calendarEvents}
              currentMonth={currentMonth}
              onMonthChange={setCurrentMonth}
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
            />
          </div>

          {/* Filters (right side) */}
          <div className="lg:col-span-3 flex flex-col gap-3">
            {/* Region tabs */}
            <div className="flex gap-1 bg-sakura-gray rounded-lg p-1">
              {[['all','全部'],['japan','日本'],['online','オンライン'],['taiwan','台灣'],['hk','香港']].map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setRegion(val)}
                  className={`flex-1 text-sm px-3 py-1.5 rounded-md font-medium transition-colors ${
                    region === val
                      ? 'bg-white text-primary-dark shadow-sm'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-3 content-start">
            <select
              value={prefecture}
              onChange={e => setPrefecture(e.target.value)}
              className="bg-white border border-border text-text-primary text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-primary"
            >
              <option value="">全部地區</option>
              {prefectures.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <select
              value={eventType}
              onChange={e => setEventType(e.target.value)}
              className="bg-white border border-border text-text-primary text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-primary"
            >
              <option value="">全部類型</option>
              {eventTypes.map(t => <option key={t} value={t}>{getEventTypeLabel(t)}</option>)}
            </select>
            {(prefecture || eventType) && (
              <button
                onClick={() => { setPrefecture(''); setEventType(''); }}
                className="text-xs text-[rgb(var(--color-nadeshiko-dark))] hover:underline px-2 py-2"
              >
                清除篩選
              </button>
            )}
            </div>

            {/* Event count badge */}
            <div className="w-full text-sm text-text-tertiary">
              {loading ? '載入中...' : `${events.length} 個活動`}
              {selectedDate && ` · ${grouped[selectedDate]?.length || 0} 個活動喺 ${selectedDate}`}
            </div>
          </div>
        </div>

        {/* Events list */}
        {loading ? (
          <div className="text-center py-20 text-text-secondary">載入中...</div>
        ) : error ? (
          <div className="text-center py-20 text-primary-dark">{error}</div>
        ) : events.length === 0 ? (
          <div className="text-center py-20 text-text-secondary">
            <div className="text-4xl mb-4">📅</div>
            <p>短期內沒有活動</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(displayGrouped).sort().map(([dateKey, dayEvents]) => (
              <div key={dateKey}>
                <h2 className="text-sm font-bold text-text-secondary mb-3 flex items-center gap-2 flex-wrap">
                  <span className={`w-2 h-2 rounded-full ${dayEvents.some(e => isToday(e.datetime)) ? 'bg-primary-dark' : 'bg-sakura-gray'}`} />
                  {new Date(dateKey + 'T00:00:00').toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'long' })}
                  {holidays[dateKey] && (
                    <span className="text-xs px-2 py-0.5 bg-red-50 text-red-600 border border-red-200 rounded font-medium">
                      🇭🇰 {holidays[dateKey]}
                    </span>
                  )}
                  {selectedDate === dateKey && (
                    <span className="text-xs px-2 py-0.5 bg-primary-dark text-white rounded font-bold">已選擇</span>
                  )}
                </h2>
                <div className="space-y-2">
                  {dayEvents.map(ev => (
                    <a
                      key={ev.id}
                      href={ev.url || `https://www.av-event.jp/event/${ev.id}/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-4 bg-white border border-border rounded-xl p-4 hover:border-primary transition-colors group"
                    >
                      {/* Time / weekday — source has no start time for date-only events */}
                      <div className="text-center min-w-[60px]">
                        <div className="text-primary-dark font-bold text-sm">
                          {new Date(ev.datetime.includes('T') ? ev.datetime : ev.datetime + 'T00:00:00+09:00').toLocaleDateString('ja-JP', { weekday: 'short' })}
                        </div>
                      </div>
                      {/* Event info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs px-2 py-0.5 rounded border font-medium ${getEventTypeColor(ev.event_type)}`}>
                            {getEventTypeLabel(ev.event_type)}
                          </span>
                          {isToday(ev.datetime) && (
                            <span className="text-xs px-2 py-0.5 rounded border font-bold" style={{backgroundColor:'rgb(var(--color-nadeshiko-dark))', color:'white'}}>今日</span>
                          )}
                        </div>
                        <div className="font-bold text-text-primary text-sm truncate group-hover:text-primary-dark transition-colors">{ev.title}</div>
                        {ev.actress_name && (
                          <div className="text-xs text-text-tertiary mt-0.5">{ev.actress_name}</div>
                        )}
                        {ev.prefecture === 'オンライン' ? (
                          <div className="text-xs text-text-tertiary mt-1">🌐 オンライン活動</div>
                        ) : (
                          <div className="text-xs text-text-tertiary mt-1">📍 {ev.venue || ev.prefecture}{ev.venue && ev.prefecture && ev.venue !== ev.prefecture ? ` · ${ev.prefecture}` : ''}</div>
                        )}
                      </div>
                      {/* External link icon */}
                      <div className="text-text-tertiary group-hover:text-primary-dark transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}