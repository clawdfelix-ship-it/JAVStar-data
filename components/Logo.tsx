import Link from 'next/link';

/**
 * Brand logo — IG-safe: no adult wording anywhere.
 * Mark: dark-navy line-art calendar with an overlapping pink-gradient star.
 * Wordmark: J-STAR (bold) / CALENDAR (light) / 星動行程追蹤平台 (Chinese subtitle).
 * Mirrors public/favicon.svg.
 *
 * size = icon box width/height in px; withText shows the stacked wordmark.
 */
function StarCalendarMark({ size }: { size: number }) {
  // 5-point star, golden-ratio inner radius, lower-right overlapping the calendar.
  const star =
    'M60.5 47.5 L64.9 61.0 L79.0 61.0 L67.6 69.3 L72.0 82.8 L60.5 74.4 L49.0 82.8 L53.4 69.3 L42.0 61.0 L56.1 61.0 Z';
  return (
    <svg viewBox="0 0 100 100" style={{ width: size, height: size }} aria-hidden>
      <defs>
        <linearGradient id="logoStarGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F4A6A6" />
          <stop offset="1" stopColor="#B83D5E" />
        </linearGradient>
      </defs>
      {/* Calendar body: line-art rounded rect */}
      <rect x="22" y="30" width="48" height="47" rx="7" fill="#ffffff" stroke="#2F4053" strokeWidth="3.6" />
      {/* Binding rings */}
      <rect x="34.5" y="21" width="4.6" height="15" rx="2.3" fill="#2F4053" />
      <rect x="53" y="21" width="4.6" height="15" rx="2.3" fill="#2F4053" />
      {/* Vertical page lines */}
      <line x1="34" y1="45" x2="34" y2="69" stroke="#2F4053" strokeWidth="2.2" strokeLinecap="round" opacity="0.35" />
      <line x1="46" y1="45" x2="46" y2="69" stroke="#2F4053" strokeWidth="2.2" strokeLinecap="round" opacity="0.35" />
      <line x1="58" y1="45" x2="58" y2="69" stroke="#2F4053" strokeWidth="2.2" strokeLinecap="round" opacity="0.35" />
      {/* Overlapping filled star in front */}
      <path d={star} fill="url(#logoStarGrad)" stroke="#ffffff" strokeWidth="2.6" strokeLinejoin="round" />
    </svg>
  );
}

export default function Logo({
  size = 56,
  withText = true,
  href = '/',
  className = '',
}: {
  size?: number;
  withText?: boolean;
  href?: string;
  className?: string;
}) {
  const inner = (
    <span className={`inline-flex flex-col items-center ${className}`}>
      <StarCalendarMark size={size} />
      {withText && (
        <span className="mt-1.5 flex flex-col items-center leading-none">
          <span
            className="font-extrabold tracking-tight text-[#2F4053]"
            style={{ fontSize: size * 0.34 }}
          >
            J-STAR
          </span>
          <span
            className="mt-0.5 font-light tracking-[0.22em] text-[#2F4053]"
            style={{ fontSize: size * 0.22 }}
          >
            CALENDAR
          </span>
          <span
            className="mt-1 font-medium tracking-[0.05em] text-[#5b6b7c]"
            style={{ fontSize: size * 0.19 }}
          >
            星動行程追蹤平台
          </span>
        </span>
      )}
    </span>
  );

  if (!href) return inner;
  return (
    <Link href={href} className="inline-block transition-transform duration-fast ease-out hover:scale-[1.03] active:scale-[0.98]">
      {inner}
    </Link>
  );
}
