import Link from 'next/link';

/**
 * Brand logo — IG-safe: no adult wording anywhere.
 *
 * 2026-09-14 起換成 JCHING 原設計切圖（粉紅圓潤實星 + 白卡粉線 + JCHING/JCHING CALENDAR）：
 *   withText=true  → /brand-logo-full.png（icon + JCHING + JCHING CALENDAR，直向）
 *   withText=false → /brand-logo-mark.png（淨 icon，header／compare 用）
 *
 * size = 顯示寬度 px（內部用 CSS var --logo-size 驅動），可用 className 喺
 * breakpoint 覆蓋，例如 className="md:[--logo-size:120px]"。
 * 純光柵圖、冇 SVG gradient id，舊版多實例重複 id 令粒星變無色嘅問題一併消失。
 */
export default function Logo({
  size = 88,
  withText = true,
  href = '/',
  className = '',
}: {
  size?: number;
  withText?: boolean;
  href?: string;
  className?: string;
}) {
  const src = withText ? '/brand-logo-full.png' : '/brand-logo-mark.png';
  const alt = 'JCHING CALENDAR'; // (品牌字已喺圖入面)
  const inner = (
    <span
      className={`inline-flex flex-col items-center ${className}`}
      style={{ ['--logo-size' as string]: `${size}px` } as React.CSSProperties}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        width={withText ? 790 : 512}
        height={withText ? 1039 : 447}
        draggable={false}
        style={{
          width: 'var(--logo-size)',
          height: 'auto',
          display: 'block',
        }}
      />
    </span>
  );

  if (!href) return inner;
  return (
    <Link href={href} aria-label="JCHING CALENDAR 首頁" className="inline-block transition-transform duration-fast ease-out hover:scale-[1.03] active:scale-[0.98]">
      {inner}
    </Link>
  );
}
