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
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    fetchEvents();
  }, [prefecture, eventType]);

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
      params.set('limit', '200');

      const res = await fetch(`/api/events?${params}`);
      const d = await res.json();
      setEvents(d.events || []);
    } catch {
      setError('載入失敗');
    } finally {
      setLoading(false);
    }
  }

  function formatDate(d: string) {
    const date = new Date(d);
    return date.toLocaleDateString('ja-JP', {
      month: 'short', day: 'numeric', weekday: 'short',
      hour: '2-digit', minute: '2-digit',
    });
  }

  function getEventTypeLabel(t: string) {
    const map: Record<string, string> = {
      sign: '簽名會', debut: '出道', live: '直播活動',
      event: '實體活動', online: '線上活動', other: '其他',
    };
    return map[t] || t;
  }

  function getEventTypeColor(t: string) {
    const map: Record<string, string> = {
      sign: 'text-pink-600 bg-pink-50 border-pink-200',
      debut: 'text-amber-600 bg-amber-50 border-amber-200',
      live: 'text-blue-600 bg-blue-50 border-blue-200',
      event: 'text-purple-600 bg-purple-50 border-purple-200',
      online: 'text-teal-600 bg-teal-50 border-teal-200',
    };
    return map[t] || 'text-gray-600 bg-gray-50 border-gray-200';
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
    <div className="min-h-screen bg-[#0f0f1a] text-[#eaeaea]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#1a1a2e] border-b border-[#2a2a4a] px-4 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/" className="text-[#e94560] hover:text-[#ff6b8a] text-sm">← 返回</Link>
              <h1 className="text-lg font-bold text-white">活動列表</h1>
            </div>
            {selectedDate && (
              <button
                onClick={() => setSelectedDate(null)}
                className="text-xs px-3 py-1 bg-[#e94560] text-white rounded-lg hover:bg-[#ff6b8a] transition-colors"
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
          <div className="lg:col-span-3 flex flex-wrap gap-3 content-start">
            <select
              value={prefecture}
              onChange={e => setPrefecture(e.target.value)}
              className="bg-[#16213e] border border-[#2a2a4a] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#e94560]"
            >
              <option value="">全部地區</option>
              {prefectures.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <select
              value={eventType}
              onChange={e => setEventType(e.target.value)}
              className="bg-[#16213e] border border-[#2a2a4a] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#e94560]"
            >
              <option value="">全部類型</option>
              {eventTypes.map(t => <option key={t} value={t}>{getEventTypeLabel(t)}</option>)}
            </select>
            {(prefecture || eventType) && (
              <button
                onClick={() => { setPrefecture(''); setEventType(''); }}
                className="text-xs text-[#e94560] hover:underline px-2 py-2"
              >
                清除篩選
              </button>
            )}

            {/* Event count badge */}
            <div className="w-full text-sm text-[#6c6c8a]">
              {loading ? '載入中...' : `${events.length} 個活動`}
              {selectedDate && ` · ${grouped[selectedDate]?.length || 0} 個活動喺 ${selectedDate}`}
            </div>
          </div>
        </div>

        {/* Events list */}
        {loading ? (
          <div className="text-center py-20 text-[#6c6c8a]">載入中...</div>
        ) : error ? (
          <div className="text-center py-20 text-[#e94560]">{error}</div>
        ) : events.length === 0 ? (
          <div className="text-center py-20 text-[#6c6c8a]">
            <div className="text-4xl mb-4">📅</div>
            <p>短期內沒有活動</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(displayGrouped).sort().map(([dateKey, dayEvents]) => (
              <div key={dateKey}>
                <h2 className="text-sm font-bold text-[#a0a0a0] mb-3 flex items-center gap-2 flex-wrap">
                  <span className={`w-2 h-2 rounded-full ${dayEvents.some(e => isToday(e.datetime)) ? 'bg-[#e94560]' : 'bg-[#2a2a4a]'}`} />
                  {new Date(dateKey + 'T00:00:00').toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'long' })}
                  {holidays[dateKey] && (
                    <span className="text-xs px-2 py-0.5 bg-[#dc143c]/20 text-[#ff6b8a] border border-[#dc143c]/40 rounded font-medium">
                      🇭🇰 {holidays[dateKey]}
                    </span>
                  )}
                  {selectedDate === dateKey && (
                    <span className="text-xs px-2 py-0.5 bg-[#e94560] text-white rounded font-bold">已選擇</span>
                  )}
                </h2>
                <div className="space-y-2">
                  {dayEvents.map(ev => (
                    <a
                      key={ev.id}
                      href={ev.url || `https://www.av-event.jp/event/${ev.id}/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-4 bg-[#16213e] border border-[#2a2a4a] rounded-xl p-4 hover:border-[#e94560] transition-colors group"
                    >
                      {/* Time */}
                      <div className="text-center min-w-[60px]">
                        <div className="text-[#e94560] font-bold text-sm">
                          {new Date(ev.datetime).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      {/* Event info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs px-2 py-0.5 rounded border font-medium ${getEventTypeColor(ev.event_type)}`}>
                            {getEventTypeLabel(ev.event_type)}
                          </span>
                          {isToday(ev.datetime) && (
                            <span className="text-xs px-2 py-0.5 bg-[#e94560] text-white rounded font-bold">今日</span>
                          )}
                        </div>
                        <div className="font-bold text-white text-sm truncate group-hover:text-[#e94560] transition-colors">{ev.title}</div>
                        {ev.actress_name && (
                          <div className="text-xs text-[#6c6c8a] mt-0.5">{ev.actress_name}</div>
                        )}
                        <div className="text-xs text-[#4a4a6a] mt-1">📍 {ev.venue} · {ev.prefecture}</div>
                      </div>
                      {/* External link icon */}
                      <div className="text-[#4a4a6a] group-hover:text-[#e94560] transition-colors">
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