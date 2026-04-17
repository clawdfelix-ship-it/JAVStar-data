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

function getEventTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    sign: '簽名會',
    debut: '出道活動',
    live: 'LIVE',
    talk: '座談會',
    sale: '發售會',
    other: '其他',
  };
  return labels[type] || type;
}

function getEventTypeColor(type: string): string {
  const colors: Record<string, string> = {
    sign: 'bg-blue-600',
    debut: 'bg-accent',
    live: 'bg-success',
    talk: 'bg-purple-600',
    sale: 'bg-yellow-600',
    other: 'bg-border',
  };
  return colors[type] || 'bg-border';
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

export default function EventCard({ 
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
      {/* Header: Date + Type */}
      <div className="flex justify-between items-start mb-3">
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
        <span className={`px-2 py-0.5 ${getEventTypeColor(event_type)} text-white text-xs rounded`}>
          {getEventTypeLabel(event_type)}
        </span>
      </div>

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
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          )}
          <span className="text-text-secondary text-sm">
            {actress_name}
          </span>
        </div>
      )}

      {/* Venue */}
      <div className="flex items-center gap-2 text-text-secondary text-sm mb-3">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span>{venue}</span>
        {prefecture && (
          <span className="text-text-secondary/70">({prefecture})</span>
        )}
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center pt-3 border-t border-border">
        <span className="text-text-secondary text-xs">
          ID: {id}
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