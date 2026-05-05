import React from 'react';

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

function safeNewDate(datetime: string): Date {
  if (!datetime) return new Date(0);
  const d = new Date(datetime);
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
            <span className="fdb-badge bg-gradient-to-r from-red-100 to-red-50 text-red-600 border border-red-200 pulse-animation">
              🔥 今日
            </span>
          )}
          {tomorrow && (
            <span className="fdb-badge bg-gradient-to-r from-amber-100 to-amber-50 text-amber-600 border border-amber-200">
              ⚡ 聽日
            </span>
          )}
        </div>
        
        <span className="fdb-badge fdb-badge-primary">
          {getEventTypeLabel(event_type, title)}
        </span>
      </div>

      {/* Venue Location */}
      {venue && (
        <div className="flex items-center gap-2 mb-3 p-2.5 bg-sakura-gray/20 rounded-lg">
          <span className="text-kamenozoki-dark">📍</span>
          <span className="text-sm text-text-secondary truncate">
            {venue}{prefecture ? ` (${prefecture})` : ''}
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
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-nadeshiko-light to-nadeshiko flex items-center justify-center text-white text-xs font-japanese font-bold">
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
