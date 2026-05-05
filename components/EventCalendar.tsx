'use client';

import { useState, useEffect, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, startOfWeek, endOfWeek, addMonths, subMonths, parseISO, differenceInDays } from 'date-fns';
import { zhTW } from 'date-fns/locale';

function safeNewDate(dateStr: string | undefined | null): Date {
  if (!dateStr) return new Date(0);
  try {
    const d = parseISO(dateStr);
    return isNaN(d.getTime()) ? new Date(0) : d;
  } catch { return new Date(0); }
}

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
  let dt = new Date(0);
  try { dt = parseISO(event.datetime); } catch { /* use epoch */ }
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

function getEventTypeInfo(title: string, type: string): { label: string; class: string } {
  if (!type || type === 'other') {
    if (title.includes('見面會')) return { label: '見面會', class: 'fdb-badge-primary' };
    if (title.includes('攝影會')) return { label: '攝影會', class: 'fdb-badge-purple' };
    if (title.includes('TRE')) return { label: 'TRE', class: 'fdb-badge-danger' };
    if (title.includes('簽名')) return { label: '簽名會', class: 'fdb-badge-success' };
    if (title.includes('出道') || title.includes('新星')) return { label: '出道活動', class: 'fdb-badge-warning' };
    return { label: '實體活動', class: 'fdb-badge' };
  }
  const m: Record<string, { label: string; class: string }> = {
    sign: { label: '簽名會', class: 'fdb-badge-primary' },
    debut: { label: '出道活動', class: 'fdb-badge-warning' },
    live: { label: 'LIVE', class: 'fdb-badge-success' },
    talk: { label: '座談會', class: 'fdb-badge-purple' },
    sale: { label: '發售會', class: 'fdb-badge-warning' },
    meeting: { label: '見面會', class: 'fdb-badge-primary' },
    photo: { label: '攝影會', class: 'fdb-badge-purple' },
    other: { label: '實體活動', class: 'fdb-badge' },
  };
  return m[type] || { label: '實體活動', class: 'fdb-badge' };
}

function EventDetailModal({ event, onClose }: { event: DayEvent; onClose: () => void }) {
  const typeInfo = getEventTypeInfo(event.title, event.event_type || '');
  const eventDate = safeNewDate(event.datetime || null);
  const daysUntil = differenceInDays(eventDate, new Date());
  
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', handler); document.body.style.overflow = ''; };
  }, [onClose]);
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 fade-in">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-bg-primary rounded-2xl shadow-xl overflow-hidden border border-border-light">
        {/* Top gradient bar */}
        <div className="h-2 bg-gradient-to-r from-primary to-primary-light opacity-80" />
        
        <div className="p-6">
          {/* Close button */}
          <button 
            onClick={onClose} 
            className="absolute top-4 right-4 p-2 text-text-secondary hover:text-text-primary transition-colors rounded-lg hover:bg-bg-secondary"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          {/* Type badge */}
          <div className="mb-3">
            <span className={typeInfo.class}>{typeInfo.label}</span>
          </div>
          
          {/* Title */}
          <h2 className="font-japanese text-xl font-bold text-text-primary mb-4 leading-tight pr-8">
            {event.title}
          </h2>
          
          {/* Actress info */}
          {event.actress_name && (
            <div className="flex items-center gap-3 mb-4 p-3 bg-bg-secondary rounded-xl">
              {event.actress_avatar ? (
                <img 
                  src={event.actress_avatar} 
                  alt={event.actress_name}
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-primary/30"
                  loading="lazy"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-japanese font-bold text-lg flex-shrink-0">
                  {(event.actress_name || '?')[0]}
                </div>
              )}
              <div>
                <div className="text-text-primary font-medium">{event.actress_name}</div>
                <div className="text-text-secondary text-xs">出演</div>
              </div>
            </div>
          )}
          
          {/* Event details */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-2 bg-bg-secondary rounded-lg">
              <span className="text-lg">📅</span>
              <div>
                <div className="text-xs text-text-secondary">日期</div>
                <div className="text-text-primary font-medium">
                  {format(eventDate, 'yyyy年MM月dd日 (E)', { locale: zhTW })}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-2 bg-bg-secondary rounded-lg">
              <span className="text-lg">🕐</span>
              <div>
                <div className="text-xs text-text-secondary">時間</div>
                <div className="text-text-primary font-medium font-mono">
                  {format(eventDate, 'HH:mm')}
                </div>
              </div>
            </div>
            
            {event.venue && (
              <div className="flex items-center gap-3 p-2 bg-bg-secondary rounded-lg">
                <span className="text-lg">📍</span>
                <div>
                  <div className="text-xs text-text-secondary">地點</div>
                  <div className="text-text-primary font-medium">{event.venue}</div>
                </div>
              </div>
            )}
            
            {event.prefecture && (
              <div className="flex items-center gap-3 p-2 bg-bg-secondary rounded-lg">
                <span className="text-lg">🌏</span>
                <div>
                  <div className="text-xs text-text-secondary">地區</div>
                  <div className="text-text-primary font-medium">{event.prefecture}</div>
                </div>
              </div>
            )}
            
            {daysUntil >= 0 && (
              <div className="flex items-center gap-3 p-2 bg-bg-secondary rounded-lg">
                <span className="text-lg">⏰</span>
                <div>
                  <div className="text-xs text-text-secondary">倒計</div>
                  <div className={daysUntil <= 3 ? 'text-danger font-bold' : 'text-text-primary font-medium'}>
                    {daysUntil === 0 ? '今日舉行' : `${daysUntil}日後`}
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Action buttons */}
          <div className="mt-6 flex gap-3">
            {event.url && (
              <a 
                href={event.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="fdb-btn fdb-btn-primary flex-1"
              >
                查看原文
              </a>
            )}
            <button 
              onClick={() => downloadICS(event)} 
              className="fdb-btn fdb-btn-outline flex-1"
            >
              下載日曆
            </button>
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
      const dateKey = format(safeNewDate(ev.datetime || null), 'yyyy-MM-dd');
      if (!map.has(dateKey)) { 
        map.set(dateKey, []); 
        actressMap.set(dateKey, new Set()); 
      }
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

  // Get heat color based on event count
  const getHeatColor = (count: number): string => {
    if (count >= 4) return 'bg-danger/20 hover:bg-danger/30';
    if (count >= 2) return 'bg-warning/20 hover:bg-warning/30';
    if (count >= 1) return 'bg-success/20 hover:bg-success/30';
    return 'hover:bg-bg-secondary';
  };

  return (
    <div className="calendar-container slide-up">
      {/* Calendar Header - Froala style */}
      <div className="calendar-header bg-gradient-to-r from-primary to-primary-light text-white">
        <button 
          onClick={() => setCurrentMonth(m => subMonths(m, 1))} 
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <h2 className="font-japanese text-lg font-semibold">
          {format(currentMonth, 'yyyy年 M月', { locale: zhTW })}
        </h2>
        
        <button 
          onClick={() => setCurrentMonth(m => addMonths(m, 1))} 
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
      
      {/* Week days header */}
      <div className="calendar-grid">
        {weekDays.map((d, i) => (
          <div key={i} className="calendar-day-header">
            {d}
          </div>
        ))}
        
        {/* Days grid */}
        {calendarDays.map((day, i) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const dayEvents = monthEvents.map.get(dateKey) || [];
          const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          const today = isToday(day);
          const heatColor = getHeatColor(dayEvents.length);
          
          return (
            <div 
              key={i} 
              onClick={() => handleDayClick(day, dayEvents)} 
              className={`
                calendar-day transition-all duration-200
                ${heatColor}
                ${!isCurrentMonth ? 'opacity-40' : ''}
                ${isSelected ? 'bg-primary/20 ring-2 ring-primary' : ''}
              `}
            >
              <div className={`
                calendar-day-number
                ${today ? 'bg-primary text-white' : ''}
              `}>
                {format(day, 'd')}
              </div>
              
              {dayEvents.length > 0 && (
                <div className="space-y-1">
                  {Array.from(monthEvents.actressMap.get(dateKey) || []).slice(0, 3).map((name, j) => {
                    const ev = dayEvents.find(e => e.actress_name === name);
                    return (
                      <div 
                        key={j} 
                        onClick={(e) => { if (ev) handleEventClick(e, ev); }}
                        className="text-xs truncate text-text-secondary hover:text-primary cursor-pointer"
                      >
                        {name}
                      </div>
                    );
                  })}
                  {dayEvents.length > 3 && (
                    <div className="text-xs text-primary font-medium">
                      +{dayEvents.length - 3}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Selected date panel */}
      {selectedDate && (
        <div className="p-4 border-t border-border bg-bg-secondary">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-japanese text-lg font-semibold text-text-primary">
              {format(selectedDate, 'MM月dd日 (E)', { locale: zhTW })}
            </h3>
            <button 
              onClick={() => setSelectedDate(null)} 
              className="p-1 text-text-secondary hover:text-text-primary transition-colors rounded-lg hover:bg-bg-tertiary"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {selectedEvents.length === 0 ? (
            <div className="text-center py-8 text-text-secondary">
              <div className="text-4xl mb-2">📅</div>
              <p className="text-sm">呢日冇活動</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {selectedEvents.map((ev) => (
                <div 
                  key={ev.id} 
                  onClick={(e) => handleEventClick(e, ev)} 
                  className="flex items-start gap-3 p-3 bg-bg-primary rounded-xl hover:shadow-md cursor-pointer transition-all border border-border-light"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-text-primary line-clamp-2">
                      {ev.title}
                    </div>
                    <div className="text-xs text-text-secondary mt-1 flex items-center gap-1 flex-wrap">
                      {ev.actress_name && <span className="fdb-badge-primary">👤 {ev.actress_name}</span>}
                      {ev.venue && <span className="fdb-badge">📍 {ev.venue}</span>}
                    </div>
                  </div>
                  <div className="text-xs text-primary font-mono whitespace-nowrap bg-primary/10 px-2 py-1 rounded-md">
                    {format(safeNewDate(ev.datetime || null), 'HH:mm')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Event detail modal */}
      {selectedEvent && (
        <EventDetailModal 
          event={selectedEvent} 
          onClose={() => setSelectedEvent(null)} 
        />
      )}
    </div>
  );
}
