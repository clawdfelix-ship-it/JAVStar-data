'use client';

import Link from 'next/link';
import VoteButton from './VoteButton';

interface ActressCardProps {
  rank: number;
  id: string;
  name_ja: string;
  name_cn: string | null;
  avatar_url: string | null;
  age: number | null;
  zodiac: string | null;
  cup: string | null;
  height: string | null;
  bust: string | null;
  waist: string | null;
  hip: string | null;
  agency: string | null;
  hobby: string | null;
  debut_year: number | null;
  event_count: number;
  year_2026_events: number;
  vote_count: number;
  final_score: number;
  next_event_date?: string | null;
  next_event_title?: string | null;
}

export default function ActressCard({
  rank,
  id,
  name_ja,
  name_cn,
  avatar_url,
  age,
  cup,
  height,
  bust,
  waist,
  hip,
  event_count,
  year_2026_events,
  vote_count,
  final_score,
  next_event_date,
  next_event_title,
}: ActressCardProps) {

  const getRankClass = (r: number) => {
    if (r === 1) return 'bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-lg shadow-amber-200';
    if (r === 2) return 'bg-gradient-to-br from-gray-300 to-gray-400 text-white shadow-lg shadow-gray-200';
    if (r === 3) return 'bg-gradient-to-br from-orange-400 to-orange-500 text-white shadow-lg shadow-orange-200';
    return 'bg-gradient-to-br from-pink-400 to-pink-500 text-white shadow-lg shadow-pink-200';
  };

  // Format upcoming event: "8/9 週六" or "8/9" if no day-of-week
  const nextEventLabel = (() => {
    if (!next_event_date) return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(next_event_date));
    if (!m) return null;
    const d = new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00`);
    if (Number.isNaN(d.getTime())) return null;
    const wd = ['日','一','二','三','四','五','六'][d.getDay()];
    return `${parseInt(m[2])}/${parseInt(m[3])} 週${wd}`;
  })();

  return (
    <div className="relative bg-white rounded-xl border border-[rgba(var(--color-sakura-gray),0.6)] shadow-md overflow-hidden transition-[transform,box-shadow] duration-base ease-out active:scale-[0.98] active:-translate-y-0.5 md:hover:shadow-xl md:hover:-translate-y-1 group">
      {/* Rank Badge */}
      <div className={`absolute top-2 left-2 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold z-10 shadow-lg ${getRankClass(rank)}`}>
        {rank}
      </div>

      {/* Score Badge */}
      <div className="absolute top-2 right-2 px-2 py-1 bg-gradient-to-r from-amber-400 to-amber-500 text-white rounded-full text-[10px] font-bold shadow-md z-10">
        ⭐ {final_score}
      </div>

      {/* Avatar */}
      <Link href={`/actress/${id}`} className="block">
        <div className="aspect-[3/4] overflow-hidden bg-gradient-to-br from-pink-900/20 to-blue-900/20">
          {avatar_url ? (
            <img
              src={avatar_url}
              alt={name_ja}
              className="w-full h-full object-cover transition-transform duration-slow ease-out md:group-hover:scale-105"
              loading="eager"
              decoding="async"
              fetchPriority="high"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-5xl font-bold text-[rgba(var(--color-sakura-gray),0.8)]">{name_ja[0]}</div>
            </div>
          )}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[rgba(var(--color-sakura),0.9)] to-transparent p-2">
            <div className="flex items-center justify-center gap-1.5 text-white text-[10px]">
              {age && <span className="bg-white/10 backdrop-blur-sm px-1.5 py-0.5 rounded">{age}歳</span>}
              {cup && <span className="bg-white/10 backdrop-blur-sm px-1.5 py-0.5 rounded">C{cup}</span>}
              {height && <span className="bg-white/10 backdrop-blur-sm px-1.5 py-0.5 rounded">{height}</span>}
            </div>
          </div>
        </div>
      </Link>

      {/* Info */}
      <div className="p-3">
        <div className="mb-2">
          <Link href={`/actress/${id}`}>
            <h3 className="font-bold text-[rgb(var(--color-umenezumi))] text-base truncate group-hover:text-[rgb(var(--color-nadeshiko-dark))] transition-colors" style={{fontFamily: 'Noto Sans JP, sans-serif'}}>
              {name_ja}
            </h3>
          </Link>
          {name_cn && <p className="text-[rgb(var(--color-umenezumi-light))] text-xs truncate mt-0.5">{name_cn}</p>}
        </div>

        {/* Next event pill — primary CTA info per apple-design "purpose driven" */}
        {nextEventLabel ? (
          <Link
            href={`/actress/${id}`}
            title={next_event_title || ''}
            className="mb-2.5 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[rgba(var(--color-nadeshiko),0.12)] border border-[rgba(var(--color-nadeshiko-dark),0.35)] text-[rgb(var(--color-nadeshiko-dark))] text-xs font-semibold hover:bg-[rgba(var(--color-nadeshiko),0.22)] transition-colors"
          >
            <span aria-hidden>📅</span>
            <span className="truncate">下場 {nextEventLabel}</span>
          </Link>
        ) : (
          <div className="mb-2.5 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[rgba(var(--color-sakura-gray),0.15)] text-[rgb(var(--color-umenezumi-light))] text-xs">
            <span aria-hidden>🌙</span>
            <span className="truncate">暫無公開活動</span>
          </div>
        )}

        {/* Stats — condensed 2-col: 活動場數 + 得票 */}
        <div className="grid grid-cols-2 gap-1.5 mb-2.5">
          <div className="text-center p-1.5 rounded-lg bg-[rgba(var(--color-sakura),0.5)] border border-[rgba(var(--color-sakura-gray),0.6)]">
            <div className="text-base font-bold text-[rgb(var(--color-nadeshiko-dark))]">{event_count}</div>
            <div className="text-[9px] text-[rgb(var(--color-umenezumi))] uppercase tracking-wider">總活動</div>
          </div>
          <div className="text-center p-1.5 rounded-lg bg-[rgba(var(--color-sakura),0.5)] border border-[rgba(var(--color-sakura-gray),0.6)]">
            <div className="text-base font-bold text-[rgb(var(--color-nadeshiko-dark))]">{year_2026_events}</div>
            <div className="text-[9px] text-[rgb(var(--color-umenezumi))] uppercase tracking-wider">2026</div>
          </div>
        </div>

        {/* Vote + CTA Row — bumped touch target to 44px min height */}
        <div className="flex items-center gap-2">
          <VoteButton actressId={id} initialCount={vote_count} size="sm" className="flex-1 justify-center min-h-[44px]" />
          <Link
            href={`/actress/${id}`}
            className="flex-1 min-h-[44px] flex items-center justify-center bg-[rgb(var(--color-nadeshiko-dark))] hover:bg-[rgb(var(--color-nadeshiko))] active:scale-[0.98] text-white rounded-lg font-medium text-xs text-center transition-[background-color,transform] duration-base ease-out shadow-md"
          >
            詳情 →
          </Link>
        </div>
      </div>
    </div>
  );
}