import React from 'react';
import Link from 'next/link';

interface EventCardProps {
  id: string;
  title: string;
  venue: string;
  prefecture: string;
  datetime: string;
  event_type: string;
  url: string;
  actress_name?: string;
  actress_avatar?: string;
  showActress?: boolean;
}

function getInferredEventType(type: string, title: string): string {
  if (type && type !== 'other') return type;
  if (title.includes('見面會')) return 'meeting';
  if (title.includes('攝影會')) return 'photo';
  if (title.includes('TRE')) return 'tre';
  if (title.includes('簽名')) return 'sign';
  if (title.includes('出道') || title.includes('新星')) return 'debut';
  return 'other';
}

function getEventTypeLabel(type: string, title: string): string {
  const t = getInferredEventType(type, title);
  const labels: Record<string, string> = {
    sign: '簽名會',
    debut: '出道活動',
    live: 'LIVE',
    talk: '座談會',
    sale: '發售會',
    meeting: '見面會',
    photo: '攝影會',
    tre: 'TRE',
    other: '實體活動',
  };
  return labels[t] || '實體活動';
}

function getEventTypeBadgeClass(type: string, title: string): string {
  const t = getInferredEventType(type, title);
  const classes: Record<string, string> = {
    sign: 'fdb-badge-primary',
    debut: 'fdb-badge-warning',
    live: 'fdb-badge-success',
    talk: 'fdb-badge-purple',
    sale: 'fdb-badge-warning',
    meeting: 'fdb-badge-primary',
    photo: 'fdb-badge-purple',
    tre: 'fdb-badge-danger',
    other: 'fdb-badge',
  };
  return classes[t] || 'fdb-badge';
}

function safeNewDate(datetime: string): Date {
  if (!datetime) return new Date(0);
  const d = new Date(datetime);
  return isNaN(d.getTime()) ? new Date(0) : d;
}

function getDaysUntil(datetime: string): number {
  const eventDate = safeNewDate(datetime);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  eventDate.setHours(0, 0, 0, 0);
  return Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function UrgencyBadge({ datetime }: { datetime: string }) {
  const days = getDaysUntil(datetime);
  if (days < 0) return null;
  if (days <= 1) return <span className="fdb-badge-danger animate-pulse">🔥 今日</span>;
  if (days <= 3) return <span className="fdb-badge-warning">⚡ {days}日後</span>;
  if (days <= 7) return <span className="fdb-badge-success">📅 {days}日內</span>;
  return null;
}

function isUpcoming(datetime: string): boolean {
  return safeNewDate(datetime) > new Date();
}

function isToday(datetime: string): boolean {
  const today = new Date();
  const eventDate = safeNewDate(datetime);
  return eventDate.toDateString() === today.toDateString();
}

function isTomorrow(datetime: string): boolean {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const eventDate = safeNewDate(datetime);
  return eventDate.toDateString() === tomorrow.toDateString();
}

function formatDateTime(datetime: string): string {
  const date = safeNewDate(datetime);
  return date.toLocaleString('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatTime(datetime: string): string {
  const date = safeNewDate(datetime);
  return date.toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDateShort(datetime: string): string {
  const date = safeNewDate(datetime);
  return date.toLocaleDateString('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
  });
}

function EventCardComponent({ 
  id, 
  title, 
  venue, 
  prefecture, 
  datetime, 
  event_type, 
  url,
  actress_name,
  actress_avatar,
  showActress = true,
}: EventCardProps) {
  const upcoming = isUpcoming(datetime);
  const today = isToday(datetime);
  const tomorrow = isTomorrow(datetime);

  // Determine card style
  let cardClass = 'event-card';
  if (today) cardClass += ' today';
  else if (tomorrow) cardClass += ' tomorrow';
  if (!upcoming) cardClass += ' opacity-60';

  return (
    <div className={cardClass}>
      {/* Top Row: Date + Type + Urgency */}
      <div className="flex flex-wrap justify-between items-start gap-2 mb-3">
        <div className="flex items-center gap-2">
          {/* Date Box */}
          <div className="flex flex-col items-center justify-center bg-bg-tertiary rounded-md px-3 py-1.5 min-w-[60px]">
            <span className="text-caption text-text-secondary">
              {formatDateShort(datetime)}
            </span>
            <span className="font-mono text-sm font-semibold text-text-primary">
              {formatTime(datetime)}
            </span>
          </div>
          
          {today && (
            <span className="fdb-badge-danger animate-pulse">
              🔥 今日
            </span>
          )}
          {tomorrow && (
            <span className="fdb-badge-warning">
              ⚡ 聽日
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          <span className={getEventTypeBadgeClass(event_type, title)}>
            {getEventTypeLabel(event_type, title)}
          </span>
          <UrgencyBadge datetime={datetime} />
        </div>
      </div>

      {/* Venue Location */}
      {venue && (
        <div className="flex items-center gap-2 mb-3 p-2 bg-bg-secondary rounded-lg">
          <svg className="w-4 h-4 text-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="text-small text-text-secondary truncate">
            {venue}{prefecture ? ` (${prefecture})` : ''}
          </span>
        </div>
      )}

      {/* Event Title */}
      <h3 className="event-title line-clamp-2 mb-3">
        {title}
      </h3>

      {/* Actress Info */}
      {showActress && actress_name && (
        <div className="flex items-center gap-2 mb-3 p-2 bg-bg-secondary rounded-lg">
          {actress_avatar ? (
            <img 
              src={actress_avatar} 
              alt={actress_name}
              className="w-8 h-8 rounded-full object-cover border-2 border-white shadow-sm"
              loading="lazy"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-text-secondary text-sm font-japanese">
              {(actress_name || '?')[0]}
            </div>
          )}
          <span className="text-small text-text-secondary font-medium">
            {actress_name}
          </span>
        </div>
      )}

      {/* Footer Actions */}
      <div className="flex justify-between items-center pt-3 mt-3 border-t border-border-light">
        <span className="text-caption text-text-tertiary font-mono">
          #{id.length > 8 ? id.slice(0, 8) : id}
        </span>
        <a 
          href={url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="fdb-btn fdb-btn-sm fdb-btn-outline"
          onClick={(e) => e.stopPropagation()}
        >
          詳情 →
        </a>
      </div>
    </div>
  );
}

export default React.memo(EventCardComponent);
