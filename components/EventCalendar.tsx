'use client';

import { useState, useEffect, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, startOfWeek, endOfWeek, addMonths, subMonths, parseISO, differenceInDays } from 'date-fns';
import { zhTW } from 'date-fns/locale';

interface DayEvent {
  id: string;
  title: string;
  datetime: string;
  actress_name?: string;
  actress_avatar?: string;
  venue?: string;
  prefecture?: string;
  event_type?: string;
  url?: string;
}

interface CalendarDay {
  date: Date;
  events: DayEvent[];
}

interface EventCalendarProps {
  events: DayEvent[];
  onDayClick?: (date: Date, dayEvents: DayEvent[]) => void;
}

const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

function generateICS(event: DayEvent): string {
  const dt = parseISO(event.datetime);
  const dtEnd = new Date(dt.getTime() + 2 * 60 * 60 * 1000);
  const formatICS = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const uid = `${event.id}@av-intelligence.local`;
  const summary = event.title || 'AV Event';
  const description = [event.actress_name, event.venue, event.prefecture].filter(Boolean).join(' | ');
  const location = [event.venue, event.prefecture].filter(Boolean).join(', ');
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//AV Intelligence//Event//EN',
    'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'BEGIN:VEVENT',
    `UID:${uid}`, `DTSTAMP:${formatICS(new Date())}`, `DTSTART:${formatICS(dt)}`,
    `DTEND:${formatICS(dtEnd)}`, `SUMMARY:${summary}`,
    description ? `DESCRIPTION:${description}` : '',
    location ? `LOCATION:${location}` : '',
    event.url ? `URL:${event.url}` : '',
    'END:VEVENT', 'END:VCALENDAR',
  ].filter(Boolean).join('\r\n');
}

function downloadICS(event: DayEvent) {
  const blob = new Blob([generateICS(event)], { type: 'text/calendar;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `event-${event.id}.ics`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function getEventTypeInfo(title: string, type: string): { label: string; color: string } {
  if (!type || type === 'other') {
    if (title.includes('見面會')) return { label: '見面會', color: 'bg-blue-600' };
    if (title.includes('攝影會')) return { label: '攝影會', color: 'bg-purple-600' };
    if (title.includes('TRE')) return { label: 'TRE', color: 'bg-red-600' };
    if (title.includes('簽名')) return { label: '簽名會', color: 'bg-green-600' };
    if (title.includes('出道') || title.includes('新星')) return { label: '出道活動', color: 'bg-yellow-500' };
    return { label: '實體活動', color: 'bg-neutral-600' };
  }
  const m: Record<string, { label: string; color: string }> = {
    sign: { label: '簽名會', color: 'bg-blue-600' }, debut: { label: '出道活動', color: 'bg-yellow-500' },
    live: { label: 'LIVE', color: 'bg-green-600' }, talk: { label: '座談會', color: 'bg-purple-600' },
    sale: { label: '發售會', color: 'bg-orange-600' }, meeting: { label: '見面會', color: 'bg-blue-600' },
    photo: { label: '攝影會', color: 'bg-purple-600' }, other: { label: '實體活動', color: 'bg-neutral-600' },
  };
  return m[type] || { label: '實體活動', color: 'bg-neutral-600' };
}

function EventDetailModal({ event, onClose }: { event: DayEvent; onClose: () => void }) {
  const typeInfo = getEventTypeInfo(event.title, event.event_type || '');
  const eventDate = parseISO(event.datetime);
  const daysUntil = differenceInDays(eventDate, new Date());
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', handler); document.body.style.overflow = ''; };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-secondary border border-border rounded-2xl shadow-2xl overflow-hidden">
        <div className={`h-2 ${typeInfo.color} opacity-80`} />
        <div className="p-6">
          <button onClick={onClose} className="absolute top-4 right-4 p-2 text-text-secondary hover:text-text-primary transition-colors rounded-lg hover:bg-primary">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          <div className="mb-3"><span className={`inline-block px-3 py-1 ${typeInfo.color} text-white text-xs rounded-full font-medium`}>{typeInfo.label}</span></div>
          <h2 className="font-japanese text-xl font-bold text-text-primary mb-4 leading-tight pr-8">{event.title}</h2>
          {event.actress_name && (
            <div className="flex items-center gap-3 mb-4 p-3 bg-primary rounded-xl">
              {event.actress_avatar
                ? <img src={event.actress_avatar} alt={event.actress_name} className="w-10 h-10 rounded-full object-cover ring-2 ring-accent/30" loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                : <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-accent font-japanese font-bold text-lg flex-shrink-0">{event.actress_name[0]}</div>
              }
              <div><div className="text-text-primary font-medium">{event.actress_name}</div><div className="text-text-secondary text-xs">出演</div></div>
            </div>
          )}
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-text-secondary"><span className="w-12 flex-shrink-0">📅 日期</span><span className="text-text-primary">{format(eventDate, 'yyyy年MM月dd日 (E)', { locale: zhTW })}</span></div>
            <div className="flex items-center gap-2 text-text-secondary"><span className="w-12 flex-shrink-0">🕐 時間</span><span className="text-text-primary">{format(eventDate, 'HH:mm')}</span></div>
            {event.venue && <div className="flex items-center gap-2 text-sm"><span className="w-12 flex-shrink-0 text-text-secondary">📍 地點</span><span className="text-text-primary">{event.venue}</span></div>}
            {event.prefecture && <div className="flex items-center gap-2 text-sm"><span className="w-12 flex-shrink-0 text-text-secondary">🌏 地區</span><span className="text-text-primary">{event.prefecture}</span></div>}
            {daysUntil >= 0 && <div className="flex items-center gap-2 text-sm"><span className="w-12 flex-shrink-0 text-text-secondary">⏰ 倒計</span><span className={daysUntil <= 3 ? 'text-accent font-bold' : 'text-text-primary'}>{daysUntil === 0 ? '今日舉行' : `${daysUntil}日後`}</span></div>}
          </div>
          <div className="mt-4 flex gap-2">
            {event.url && <a href={event.url} target="_blank" rel="noopener noreferrer" className="flex-1 px-4 py-2.5 bg-accent hover:bg-accent/80 text-white rounded-xl text-center font-medium transition-colors text-sm">查看原文</a>}
            <button onClick={() => downloadICS(event)} className="flex-1 px-4 py-2.5 bg-primary hover:bg-border border border-border text-text-primary rounded-xl text-center font-medium transition-colors text-sm">下載日曆</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EventCalendar({ events, onDayClick }: EventCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvents, setSelectedEvents] = useState<DayEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<DayEvent | null>(null);

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth));
    const end = endOfWeek(endOfMonth(currentMonth));
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const monthEvents = useMemo(() => {
    const map = new Map<string, DayEvent[]>();
    const actressMap = new Map<string, Set<string>>();
    events.forEach(ev => {
      const dateKey = format(parseISO(ev.datetime), 'yyyy-MM-dd');
      if (!map.has(dateKey)) { map.set(dateKey, []); actressMap.set(dateKey, new Set()); }
      map.get(dateKey)!.push(ev);
      if (ev.actress_name) actressMap.get(dateKey)!.add(ev.actress_name);
    });
    return { map, actressMap };
  }, [events]);

  function handleDayClick(date: Date, dayEvents: DayEvent[]) {
    setSelectedDate(date);
    setSelectedEvents(dayEvents);
    if (onDayClick) onDayClick(date, dayEvents);
  }

  function handleEventClick(e: React.MouseEvent, ev: DayEvent) {
    e.stopPropagation();
    setSelectedEvent(ev);
  }

  return (
    <div className="bg-secondary rounded-2xl border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <button onClick={() => setCurrentMonth(m => subMonths(m, 1))} className="p-2 hover:bg-primary rounded-lg transition-colors"><svg className="w-5 h-5 text-text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></button>
        <h2 className="font-japanese text-lg font-semibold text-text-primary">{format(currentMonth, 'yyyy年 M月', { locale: zhTW })}</h2>
        <button onClick={() => setCurrentMonth(m => addMonths(m, 1))} className="p-2 hover:bg-primary rounded-lg transition-colors"><svg className="w-5 h-5 text-text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg></button>
      </div>
      {/* Week days */}
      <div className="grid grid-cols-7 border-b border-border">
        {weekDays.map((d, i) => <div key={i} className={`py-2 text-center text-sm font-medium ${i === 0 ? 'text-red-500' : 'text-text-secondary'}`}>{d}</div>)}
      </div>
      {/* Days grid */}
      <div className="grid grid-cols-7">
        {calendarDays.map((day, i) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const dayEvents = monthEvents.map.get(dateKey) || [];
          const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          const today = isToday(day);
          const hasEvents = dayEvents.length > 0;
          return (
            <div key={i} onClick={() => handleDayClick(day, dayEvents)} className={`min-h-20 p-1.5 border-b border-r border-border cursor-pointer transition-colors hover:bg-primary/50 ${!isCurrentMonth ? 'bg-primary/30 opacity-50' : ''} ${isSelected ? 'bg-accent/20' : ''} ${today ? 'bg-accent/10' : ''}`}>
              <div className={`w-7 h-7 flex items-center justify-center rounded-full text-sm mb-1 ${today ? 'bg-accent text-white font-bold' : 'text-text-primary'}`}>{format(day, 'd')}</div>
              {dayEvents.length > 0 && (
                <div className="space-y-0.5">
                  {Array.from(monthEvents.actressMap.get(dateKey) || []).slice(0, 3).map((name, j) => {
                    const ev = dayEvents.find(e => e.actress_name === name);
                    return <div key={j} onClick={(e) => { if (ev) handleEventClick(e, ev); }} className={`text-xs truncate hover:text-accent cursor-pointer ${isSelected ? 'text-accent' : 'text-text-secondary'}`}>{name}</div>;
                  })}
                  {dayEvents.length > 3 && <div className="text-xs text-accent">+{dayEvents.length - 3}</div>}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {/* Selected date panel */}
      {selectedDate && (
        <div className="p-4 border-t border-border bg-primary">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-japanese text-lg font-semibold text-text-primary">{format(selectedDate, 'MM月dd日 (E)', { locale: zhTW })}</h3>
            <button onClick={() => setSelectedDate(null)} className="p-1 text-text-secondary hover:text-text-primary"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
          </div>
          {selectedEvents.length === 0 ? <p className="text-text-secondary text-sm">呢日冇活動</p> : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {selectedEvents.map((ev) => (
                <div key={ev.id} onClick={(e) => handleEventClick(e, ev)} className="flex items-start gap-2 p-2 bg-secondary rounded-lg hover:bg-accent/10 cursor-pointer transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-text-primary truncate">{ev.title}</div>
                    <div className="text-xs text-text-secondary mt-0.5">{ev.actress_name && <span>{ev.actress_name} · </span>}{ev.venue && <span>{ev.venue}</span>}</div>
                  </div>
                  <div className="text-xs text-accent whitespace-nowrap">{format(parseISO(ev.datetime), 'HH:mm')}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {selectedEvent && <EventDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />}
    </div>
  );
}
