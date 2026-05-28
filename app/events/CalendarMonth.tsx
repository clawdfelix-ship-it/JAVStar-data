'use client';

import { useState } from 'react';

interface DayEvent {
  id: string;
  title: string;
  datetime: string;
  event_type: string;
}

interface CalendarProps {
  events: DayEvent[];
  currentMonth: Date;
  onMonthChange: (m: Date) => void;
  selectedDate: string | null;
  onDateSelect: (d: string | null) => void;
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];
const MONTHS = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];

export default function CalendarMonth({ events, currentMonth, onMonthChange, selectedDate, onDateSelect }: CalendarProps) {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  // Build event map by date string
  const eventMap: Record<string, DayEvent[]> = {};
  events.forEach(ev => {
    const dateStr = ev.datetime.split('T')[0];
    if (!eventMap[dateStr]) eventMap[dateStr] = [];
    eventMap[dateStr].push(ev);
  });

  // Calendar grid
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date().toISOString().split('T')[0];

  // Event type colors
  const typeColors: Record<string, string> = {
    sign: 'bg-[#e94560]',
    debut: 'bg-amber-500',
    live: 'bg-blue-500',
    event: 'bg-purple-500',
    online: 'bg-teal-500',
  };

  function prevMonth() {
    onMonthChange(new Date(year, month - 1, 1));
  }

  function nextMonth() {
    onMonthChange(new Date(year, month + 1, 1));
  }

  function isSelected(dateStr: string) {
    return selectedDate === dateStr;
  }

  return (
    <div className="bg-white border border-border rounded-xl p-4">
      {/* Header: month navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-sakura-gray hover:bg-sakura-gray/60 text-text-primary transition-colors"
        >
          ←
        </button>
        <div className="text-center">
          <div className="text-text-primary font-bold">{MONTHS[month]} {year}</div>
        </div>
        <button
          onClick={nextMonth}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#1a1a2e] hover:bg-[#2a2a4a] text-white transition-colors"
        >
          →
        </button>
      </div>

      {/* Weekday labels */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((d, i) => (
          <div key={d} className={`text-center text-xs py-1 font-medium ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-text-tertiary'}`}>
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {/* Empty cells for days before month starts */}
        {Array.from({ length: firstDay }, (_, i) => (
          <div key={`empty-${i}`} className="h-10" />
        ))}

        {/* Days of month */}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const dayEvents = eventMap[dateStr] || [];
          const isToday = dateStr === today;
          const isSelectedDay = isSelected(dateStr);
          const isPast = dateStr < today;
          const dayOfWeek = new Date(year, month, day).getDay();

          return (
            <button
              key={dateStr}
              onClick={() => onDateSelect(dayEvents.length > 0 ? (isSelectedDay ? null : dateStr) : null)}
              disabled={dayEvents.length === 0}
              className={`
                relative h-10 rounded-lg flex flex-col items-center justify-center text-xs transition-all
                ${dayEvents.length === 0 ? 'opacity-30 cursor-default' : 'hover:bg-[#2a2a4a] cursor-pointer'}
                ${isToday ? 'ring-1 ring-primary' : ''}
                ${isSelectedDay ? 'bg-primary-dark text-white' : 'bg-sakura text-text-primary'}
                ${isPast && !isToday && !isSelectedDay ? 'opacity-50' : ''}
              `}
              title={dayEvents.length > 0 ? `${dayEvents.length}個活動` : ''}
            >
              <span className={`font-medium ${isSelectedDay ? 'text-white' : dayOfWeek === 0 ? 'text-red-500' : dayOfWeek === 6 ? 'text-blue-500' : 'text-text-primary'}`}>
                {day}
              </span>
              {dayEvents.length > 0 && (
                <div className="flex gap-0.5 absolute bottom-0.5">
                  {dayEvents.slice(0, 3).map((ev, ei) => (
                    <span
                      key={ev.id}
                      className={`w-1 h-1 rounded-full ${isSelectedDay ? 'bg-white' : typeColors[ev.event_type] || 'bg-[#e94560]'}`}
                    />
                  ))}
                  {dayEvents.length > 3 && <span className="text-[10px] text-text-tertiary">+</span>}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border">
        <span className="text-xs text-text-tertiary">活動類型：</span>
        {Object.entries({ sign: '簽名', debut: '出道', live: '直播', event: '實體', online: '線上' }).map(([k, v]) => (
          <span key={k} className="flex items-center gap-1 text-xs text-text-tertiary">
            <span className={`w-2 h-2 rounded-full ${typeColors[k] || 'bg-gray-400'}`} />
            {v}
          </span>
        ))}
      </div>
    </div>
  );
}