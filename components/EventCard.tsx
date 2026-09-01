import React from 'react';
import { Flame, Zap, MapPin } from 'lucide-react';

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
  // DB now stores canonical types derived by the events trigger: dvd / photo / offkai / other
  if (type && ['dvd', 'photo', 'offkai', 'other'].includes(type)) return type;
  if (title.includes('撮影会') || title.includes('攝影會')) return 'photo';
  if (title.includes('オフ会') || title.includes('見面會')) return 'offkai';
  if (title.includes('サイン会') || title.includes('簽名') || title.includes('即売会') || title.includes('DVD') || title.includes('発売')) return 'dvd';
  return 'other';
}

function getEventTypeLabel(type: string, title: string): string {
  const t = getInferredEventType(type, title);
  const labels: Record<string, string> = {
    dvd: 'DVD/即売',
    photo: '撮影会',
    offkai: 'オフ会',
    other: '活動',
  };
  return labels[t] || '活動';
}

function safeNewDate(datetime: string): Date {
  if (!datetime) return new Date(0);
  // Handle both ISO (2026-07-25T00:00:00Z) and date-only (2026-07-25) formats
  const d = new Date(datetime.includes('T') ? datetime : datetime + 'T00:00:00+09:00');
  return isNaN(d.getTime()) ? new Date(0) : d;
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
  // date-only events (YYYY-MM-DD) have no real start time in the source data;
  // showing a fabricated 09:00 is misleading. Show the weekday instead.
  if (!datetime.includes('T')) {
    const date = safeNewDate(datetime);
    return date.toLocaleDateString('ja-JP', { weekday: 'short' });
  }
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

  return (
    <a 
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`fdb-card block p-4 ${!upcoming ? 'opacity-60' : ''}`}
    >
      {/* Top Row: Date + Type + Status */}
      <div className="flex flex-wrap justify-between items-start gap-2 mb-3">
        <div className="flex items-center gap-2">
          {/* Date Box - NIPPON COLORS style */}
          <div className="flex flex-col items-center justify-center bg-nadeshiko-light/20 rounded-lg px-3 py-2 min-w-[65px]">
            <span className="text-xs text-nadeshiko-dark font-medium">
              {formatDateShort(datetime)}
            </span>
            <span className="font-mono text-sm font-bold text-nadeshiko-dark">
              {formatTime(datetime)}
            </span>
          </div>
          
          {today && (
            <span className="fdb-badge bg-gradient-to-r from-red-100 to-red-50 text-red-600 border border-red-200 pulse-animation flex items-center gap-1">
              <Flame className="w-3 h-3" />
              <span>今日</span>
            </span>
          )}
          {tomorrow && (
            <span className="fdb-badge bg-gradient-to-r from-amber-100 to-amber-50 text-amber-600 border border-amber-200 flex items-center gap-1">
              <Zap className="w-3 h-3" />
              <span>聽日</span>
            </span>
          )}
        </div>
        
        <span className="fdb-badge fdb-badge-primary">
          {getEventTypeLabel(event_type, title)}
        </span>
      </div>

      {/* Venue Location */}
      {(venue || prefecture) && (
        <div className="flex items-center gap-2 mb-3 p-2.5 bg-sakura-gray/20 rounded-lg">
          <MapPin className="w-4 h-4 text-[rgb(var(--color-kamenozoki-dark))] shrink-0" />
          <span className="text-sm text-text-secondary truncate">
            {prefecture === 'オンライン'
              ? '🌐 オンライン活動'
              : <>{venue}{prefecture && venue !== prefecture ? ` (${prefecture})` : ''}</>}
          </span>
        </div>
      )}

      {/* Event Title */}
      <h3 className="font-japanese font-semibold text-text-primary text-sm leading-relaxed line-clamp-2 mb-3">
        {title}
      </h3>

      {/* Actress Info */}
      {showActress && actress_name && (
        <div className="flex items-center gap-2 mb-3 p-2.5 bg-sakura-gray/20 rounded-lg">
          {actress_avatar ? (
            <img 
              src={actress_avatar} 
              alt={actress_name}
              className="w-7 h-7 rounded-full object-cover border-2 border-white shadow-sm"
              loading="lazy"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[rgb(var(--color-nadeshiko-dark))] to-[rgb(var(--color-nadeshiko-strong))] flex items-center justify-center text-white text-xs font-japanese font-bold">
              {(actress_name || '?')[0]}
            </div>
          )}
          <span className="text-sm text-text-secondary font-medium truncate">
            {actress_name}
          </span>
        </div>
      )}

      {/* Footer */}
      <div className="flex justify-between items-center pt-3 mt-3 border-t border-border">
        <span className="text-xs text-text-tertiary font-mono">
          #{id.length > 8 ? id.slice(0, 8) : id}
        </span>
        <span className="text-xs text-nadeshiko-dark font-medium flex items-center gap-1">
          詳情 →
        </span>
      </div>
    </a>
  );
}

export default React.memo(EventCardComponent);
