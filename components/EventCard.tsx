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

function getEventTypeColor(type: string, title: string): string {
  const t = getInferredEventType(type, title);
  const colors: Record<string, string> = {
    sign: 'bg-blue-600',
    debut: 'bg-yellow-500',
    live: 'bg-green-600',
    talk: 'bg-purple-600',
    sale: 'bg-orange-600',
    meeting: 'bg-blue-600',
    photo: 'bg-purple-600',
    tre: 'bg-red-600',
    other: 'bg-neutral-600',
  };
  return colors[t] || 'bg-neutral-600';
}

function getDaysUntil(datetime: string): number {
  const eventDate = new Date(datetime);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  eventDate.setHours(0, 0, 0, 0);
  return Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function UrgencyBadge({ datetime }: { datetime: string }) {
  const days = getDaysUntil(datetime);
  if (days < 0) return null;
  if (days <= 1) return <span className="px-2 py-0.5 bg-red-600 text-white text-xs rounded font-bold animate-pulse">🔥 今日</span>;
  if (days <= 3) return <span className="px-2 py-0.5 bg-orange-500 text-white text-xs rounded font-bold">⚡ {days}日後</span>;
  if (days <= 7) return <span className="px-2 py-0.5 bg-yellow-500 text-black text-xs rounded">📅 {days}日內</span>;
  return null;
}

function isUpcoming(datetime: string): boolean {
  return new Date(datetime) > new Date();
}

function isToday(datetime: string): boolean {
  const today = new Date();
  const eventDate = new Date(datetime);
  return eventDate.toDateString() === today.toDateString();
}

function formatDateTime(datetime: string): string {
  const date = new Date(datetime);
  return date.toLocaleString('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
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
  const statusColor = today ? 'border-l-4 border-l-accent' : upcoming ? 'border-l-4 border-l-success' : 'opacity-60';

  return (
    <div className={`bg-secondary rounded-lg p-4 border border-border ${statusColor}`}>
      {/* Header: Date + Type + Urgency */}
      <div className="flex flex-wrap justify-between items-start gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-text-secondary text-sm">
            {formatDateTime(datetime)}
          </span>
          {today && (
            <span className="px-2 py-0.5 bg-accent text-white text-xs rounded font-bold">
              今日
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 ${getEventTypeColor(event_type, title)} text-white text-xs rounded`}>
            {getEventTypeLabel(event_type, title)}
          </span>
          <UrgencyBadge datetime={datetime} />
        </div>
      </div>

      {/* Venue (prominent) */}
      {venue && (
        <div className="flex items-center gap-1.5 text-text-secondary text-xs mb-2 bg-primary/50 rounded px-2 py-1">
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="truncate">{venue}{prefecture ? ` (${prefecture})` : ''}</span>
        </div>
      )}

      {/* Title */}
      <h3 className="font-japanese text-text-primary font-semibold mb-2 line-clamp-2">
        {title}
      </h3>

      {/* Actress (optional) */}
      {showActress && actress_name && (
        <div className="flex items-center gap-2 mb-3">
          {actress_avatar && (
            <img 
              src={actress_avatar} 
              alt={actress_name}
              className="w-6 h-6 rounded-full object-cover"
              loading="lazy"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          )}
          <span className="text-text-secondary text-sm">
            {actress_name}
          </span>
        </div>
      )}

      {/* Footer */}
      <div className="flex justify-between items-center pt-3 border-t border-border">
        <span className="text-text-secondary/50 text-xs font-mono">
          {id.length > 8 ? `#${id.slice(0, 8)}` : id}
        </span>
        <a 
          href={url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-accent text-sm hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          查看詳情 →
        </a>
      </div>
    </div>
  );
}

export default React.memo(EventCardComponent);