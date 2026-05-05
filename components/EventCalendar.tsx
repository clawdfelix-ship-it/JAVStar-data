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

function EventDetailModal({ event, onClose }: { event: DayEvent; onClose: () => void }) {
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
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-froala-lg overflow-hidden border border-border">
        {/* Top gradient bar - NIPPON COLORS */}
        <div className="h-2 bg-gradient-to-r from-nadeshiko-dark to-nadeshiko" />
        
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
          
          {/* Title */}
          <h2 className="font-japanese text-xl font-bold text-text-primary mb-4 leading-tight pr-8">
            {event.title}
          </h2>
          
          {/* Actress info */}
          {event.actress_name && (
            <div className="flex items-center gap-3 mb-4 p-3 bg-sakura-gray/20 rounded-xl">
              {event.actress_avatar ? (
                <img 
                  src={event.actress_avatar} 
                  alt={event.actress_name}
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-nadeshiko/30"
                  loading="lazy"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-nadeshiko-light to-nadeshiko flex items-center justify-center text-white font-japanese font-bold text-lg flex-shrink-0">
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
            <div className="flex items-center gap-3 p-2 bg-sakura-gray/20 rounded-lg">
              <span className="text-lg">📅</span>
              <div>
                <div className="text-xs text-text-secondary">日期</div>
                <div className="text-text-primary font-medium">
                  {format(eventDate, 'yyyy年MM月dd日 (E)', { locale: zhTW })}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-2 bg-sakura-gray/20 rounded-lg">
              <span className="text-lg">🕐</span>
              <div>
                <div className="text-xs text-text-secondary">時間</div>
                <div className="text-text-primary font-medium font-mono">
                  {format(eventDate, 'HH:mm')}
                </div>
              </div>
            </div>
            
            {event.venue && (
              <div className="flex items-center gap-3 p-2 bg-sakura-gray/20 rounded-lg">
                <span className="text-lg">📍</span>
                <div>
                  <div className="text-xs text-text-secondary">地點</div>
                  <div className="text-text-primary font-medium">{event.venue}</div>
                </div>
              </div>
            )}
            
            {event.prefecture && (
              <div className="flex items-center gap-3 p-2 bg-sakura-gray/20 rounded-lg">
                <span className="text-lg">🌏</span>
                <div>
                  <div className="text-xs text-text-secondary">地區</div>
                  <div className="text-text-primary font-medium">{event.prefecture}</div>
                </div>
              </div>
            )}
            
            {daysUntil >= 0 && (
              <div className="flex items-center gap-3 p-2 bg-sakura-gray/20 rounded-lg">
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

  // NIPPON COLORS Heat map - 梅鼠色系漸變
  const getHeatColor = (count: number): string => {
    if (count >= 4) return 'bg-gradient-to-br from-red-100 to-red-50 hover:from-red-200';
    if (count >= 2) return 'bg-gradient-to-br from-amber-50 to-amber-100 hover:from-amber-100';
    if (count >= 1) return 'bg-gradient-to-br from-nadeshiko-light/40 to-sakura hover:from-nadeshiko-light/60';
    return 'hover:bg-sakura-gray/20';
  };

  return (
    <div className="slide-up">
      {/* Calendar Header - Froala + NIPPON COLORS style */}
      <div className="bg-gradient-to-r from-nadeshiko-dark to-nadeshiko text-white rounded-t-2xl p-4 flex items-center justify-between">
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
      
      {/* Calendar body */}
      <div className="fdb-card rounded-t-none border-t-0">
        {/* Week days header */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map((d, i) => (
            <div key={i} className="text-center text-sm font-semibold text-text-secondary py-2">
              {d}
            </div>
          ))}
        </div>
        
        {/* Days grid */}
        <div className="grid grid-cols-7 gap-1">
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
                  min-h-[80px] p-2 rounded-xl cursor-pointer transition-all duration-200
                  ${heatColor}
                  ${!isCurrentMonth ? 'opacity-40' : ''}
                  ${isSelected ? 'ring-2 ring-nadeshiko shadow-lg shadow-nadeshiko/30' : ''}
                `}
              >
                <div className={`
                  text-sm font-semibold mb-1 w-7 h-7 flex items-center justify-center rounded-lg ${
                    today 
                      ? 'bg-gradient-to-br from-nadeshiko-dark to-nadeshiko text-white shadow-md' 
                      : 'text-text-primary'
                  }`}>
                  {format(day, 'd')}
                </div>
                
                {dayEvents.length > 0 && (
                  <div className="space-y-0.5">
                    {Array.from(monthEvents.actressMap.get(dateKey) || []).slice(0, 2).map((name, j) => (
                      <div 
                        key={j} 
                        onClick={(e) => { if (dayEvents[j]) handleEventClick(e, dayEvents[j]); }}
                        className="text-[10px] truncate text-text-secondary hover:text-nadeshiko-dark cursor-pointer font-medium"
                      >
                        {name.length > 4 ? name.slice(0, 4) : name}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="text-[10px] text-nadeshiko-dark font-bold">
                        +{dayEvents.length - 2}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Selected date panel */}
      {selectedDate && (
        <div className="fdb-card mt-4 !rounded-t-2xl">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="font-japanese text-lg font-semibold text-text-primary">
              {format(selectedDate, 'MM月dd日 (E)', { locale: zhTW })}
            </h3>
            <button 
              onClick={() => setSelectedDate(null)} 
              className="p-1 text-text-secondary hover:text-text-primary transition-colors rounded-lg hover:bg-bg-secondary"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="p-4">
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
                    className="flex items-start gap-3 p-3 bg-sakura-gray/20 rounded-xl hover:shadow-md cursor-pointer transition-all"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-text-primary line-clamp-2">
                        {ev.title}
                      </div>
                      <div className="text-xs text-text-secondary mt-1 flex items-center gap-1 flex-wrap">
                        {ev.actress_name && <span className="fdb-badge fdb-badge-primary">👤 {ev.actress_name}</span>}
                        {ev.venue && <span className="fdb-badge">📍 {ev.venue}</span>}
                      </div>
                    </div>
                    <div className="text-xs text-nadeshiko-dark font-mono whitespace-nowrap bg-nadeshiko-light/30 px-2 py-1 rounded-md font-semibold">
                      {format(safeNewDate(ev.datetime || null), 'HH:mm')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
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
