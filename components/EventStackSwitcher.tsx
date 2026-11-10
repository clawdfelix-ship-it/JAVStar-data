'use client';

import { useId, useState } from 'react';
import { ChevronLeft, ChevronRight, MapPin } from 'lucide-react';

export interface StackEvent {
  id: string;
  title: string;
  date_iso: string | null;
  prefecture: string | null;
  venue: string | null;
  event_type: string | null;
}

interface EventStackSwitcherProps {
  events: StackEvent[];
  typeLabels: Record<string, string>;
}

function formatDate(iso: string) {
  const d = new Date(`${iso}T00:00:00+08:00`);
  const weekday = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()];
  return { md: `${d.getMonth() + 1}/${d.getDate()}`, weekday: `週${weekday}` };
}

export default function EventStackSwitcher({ events, typeLabels }: EventStackSwitcherProps) {
  const [index, setIndex] = useState(0);
  const labelId = useId();
  const count = events.length;

  if (!count) return null;

  const go = (next: number) => setIndex(((next % count) + count) % count);
  const active = events[index];
  const { md, weekday } = formatDate(active.date_iso as string);
  const region = (active.prefecture || '').includes('台') || (active.prefecture || '').includes('臺') ? '台北' : '香港';
  const label = typeLabels[active.event_type || ''] || '活動';

  return (
    <div className="event-stack" aria-labelledby={labelId}>
      <div id={labelId} className="sr-only">即將活動，第 {index + 1} 項，共 {count} 項</div>

      <div className="event-stack-stage" aria-live="polite">
        {events.map((event, i) => {
          const position = (i - index + count) % count;
          const hidden = position > 2;
          return (
            <article
              key={event.id}
              className={`event-stack-card event-stack-position-${position}`}
              aria-hidden={position !== 0}
              hidden={hidden}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="event-stack-date">
                  <strong>{md}</strong>
                  <span>{weekday}</span>
                </div>
                <span className="event-stack-region">{region}</span>
              </div>
              <h4 className="event-stack-title">{event.title}</h4>
              <div className="event-stack-meta">
                <span>{label}</span>
                {event.venue && (
                  <span className="inline-flex min-w-0 items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    <span className="truncate">{event.venue}</span>
                  </span>
                )}
              </div>
            </article>
          );
        })}
      </div>

      <div className="event-stack-footer">
        <div className="event-stack-dots" aria-label="選擇活動">
          {events.map((event, i) => (
            <button
              key={event.id}
              type="button"
              className={`event-stack-dot ${i === index ? 'is-active' : ''}`}
              aria-label={`睇第 ${i + 1} 個活動`}
              aria-current={i === index ? 'true' : undefined}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
        <div className="event-stack-actions">
          <button type="button" className="event-stack-nav" aria-label="上一個活動" onClick={() => go(index - 1)}>
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
          <span className="event-stack-count" aria-hidden>{index + 1}/{count}</span>
          <button type="button" className="event-stack-nav" aria-label="下一個活動" onClick={() => go(index + 1)}>
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
