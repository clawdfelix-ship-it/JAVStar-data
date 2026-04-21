'use client';

import { useState, useEffect, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, startOfWeek, endOfWeek, addMonths, subMonths, parseISO } from 'date-fns';
import { zhTW } from 'date-fns/locale';

interface DayEvent {
  id: string;
  title: string;
  datetime: string;
  actress_name?: string;
  venue?: string;
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

export default function EventCalendar({ events, onDayClick }: EventCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvents, setSelectedEvents] = useState<DayEvent[]>([]);

  // Group events by date
  const eventsByDate = useMemo(() => {
    const map = new Map<string, DayEvent[]>();
    events.forEach(event => {
      try {
        const dateKey = format(parseISO(event.datetime), 'yyyy-MM-dd');
        const existing = map.get(dateKey) || [];
        map.set(dateKey, [...existing, event]);
      } catch (e) {
        // skip invalid dates
      }
    });
    return map;
  }, [events]);

  // Get calendar days (including padding days from prev/next months)
  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const handleDayClick = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const dayEvents = eventsByDate.get(dateKey) || [];
    setSelectedDate(date);
    setSelectedEvents(dayEvents);
    if (onDayClick) {
      onDayClick(date, dayEvents);
    }
  };

  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const goToday = () => {
    setCurrentMonth(new Date());
    handleDayClick(new Date());
  };

  const getDayInfo = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const dayEvents = eventsByDate.get(dateKey) || [];
    
    // Group by actress
    const actressMap = new Map<string, number>();
    dayEvents.forEach(e => {
      const name = e.actress_name || '不明';
      actressMap.set(name, (actressMap.get(name) || 0) + 1);
    });
    
    return {
      events: dayEvents,
      count: dayEvents.length,
      actresses: actressMap,
    };
  };

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentMonth.getMonth();
  };

  return (
    <div className="bg-neutral-100 rounded-lg border border-border overflow-hidden">
      {/* Calendar Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-primary border-b border-border">
        <button
          onClick={prevMonth}
          className="p-2 hover:bg-secondary rounded-lg transition-colors text-text-secondary hover:text-text-primary"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <div className="flex items-center gap-3">
          <span className="font-japanese text-lg font-semibold text-text-primary">
            {format(currentMonth, 'yyyy年 MM月', { locale: zhTW })}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={goToday}
            className="px-3 py-1 text-sm bg-secondary border border-border rounded-lg text-text-secondary hover:text-text-primary hover:border-accent transition-colors"
          >
            今天
          </button>
          <button
            onClick={nextMonth}
            className="p-2 hover:bg-secondary rounded-lg transition-colors text-text-secondary hover:text-text-primary"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 border-b border-border">
        {weekDays.map((day, i) => (
          <div key={i} className={`py-2 text-center text-sm font-medium ${i === 0 ? 'text-accent' : 'text-text-secondary'}`}>
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7">
        {calendarDays.map((date, i) => {
          const dayInfo = getDayInfo(date);
          const isSelected = selectedDate && isSameDay(date, selectedDate);
          const today = isToday(date);
          const inMonth = isCurrentMonth(date);
          
          return (
            <div
              key={i}
              onClick={() => handleDayClick(date)}
              className={`
                min-h-[80px] sm:min-h-[100px] p-1 sm:p-2 border-b border-r border-border cursor-pointer
                hover:bg-primary transition-colors
                ${!inMonth ? 'bg-primary/50' : ''}
                ${isSelected ? 'bg-accent/20 ring-1 ring-accent' : ''}
                ${today && !isSelected ? 'bg-success/10' : ''}
              `}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`
                  text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full
                  ${today ? 'bg-accent text-white' : inMonth ? 'text-text-primary' : 'text-text-secondary/50'}
                  ${isSelected ? 'ring-2 ring-accent' : ''}
                `}>
                  {format(date, 'd')}
                </span>
                {dayInfo.count > 0 && (
                  <span className={`
                    px-1.5 py-0.5 text-xs rounded-full font-medium
                    ${today ? 'bg-accent text-white' : 'bg-accent/20 text-accent'}
                  `}>
                    {dayInfo.count}
                  </span>
                )}
              </div>
              
              {/* Actress names */}
              {dayInfo.count > 0 && (
                <div className="space-y-0.5">
                  {Array.from(dayInfo.actresses.entries()).slice(0, 3).map(([name, count], j) => (
                    <div key={j} className="text-xs text-text-secondary truncate">
                      {count > 1 ? `${name}×${count}` : name}
                    </div>
                  ))}
                  {dayInfo.actresses.size > 3 && (
                    <div className="text-xs text-accent">
                      +{dayInfo.actresses.size - 3} more
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Selected Day Detail */}
      {selectedDate && (
        <div className="p-4 border-t border-border bg-primary">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-japanese text-lg font-semibold text-text-primary">
              {format(selectedDate, 'MM月dd日 (E)', { locale: zhTW })}
            </h3>
            <button
              onClick={() => setSelectedDate(null)}
              className="p-1 text-text-secondary hover:text-text-primary"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {selectedEvents.length === 0 ? (
            <p className="text-text-secondary text-sm">呢日冇活動</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {selectedEvents.map((event) => (
                <div key={event.id} className="flex items-start gap-2 p-2 bg-secondary rounded-lg">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-text-primary truncate">
                      {event.title}
                    </div>
                    <div className="text-xs text-text-secondary mt-0.5">
                      {event.actress_name && <span>{event.actress_name} · </span>}
                      {event.venue && <span>{event.venue}</span>}
                    </div>
                  </div>
                  <div className="text-xs text-accent whitespace-nowrap">
                    {format(parseISO(event.datetime), 'HH:mm')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
