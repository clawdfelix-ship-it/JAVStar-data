'use client';

import { useId, useState } from 'react';

interface TagStackProps {
  tags: string[];
  visibleCount?: number;
}

// LeiBox 靈感：標籤太多先收合，hover 展開；鍵盤／觸控用真實 button 點擊展開。
// 只用 transform/opacity，保持 keyboard 可用與 reduced-motion 降級。
export default function TagStack({ tags, visibleCount = 6 }: TagStackProps) {
  const [open, setOpen] = useState(false);
  const regionId = useId();
  const hasOverflow = tags.length > visibleCount;
  const visibleTags = hasOverflow && !open ? tags.slice(0, visibleCount) : tags;
  const hiddenCount = tags.length - visibleCount;

  if (!tags.length) return null;

  return (
    <div
      className="tag-stack"
      data-open={open}
      onMouseEnter={() => hasOverflow && setOpen(true)}
      onMouseLeave={() => hasOverflow && setOpen(false)}
    >
      <div id={regionId} className="tag-stack-list" aria-live="polite">
        {visibleTags.map((tag) => (
          <span key={tag} className="tag-stack-chip">
            {tag}
          </span>
        ))}
      </div>

      {hasOverflow && (
        <button
          type="button"
          className="tag-stack-toggle"
          aria-expanded={open}
          aria-controls={regionId}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? '收合' : `+${hiddenCount}`}
          <span className="sr-only">{open ? '標籤' : '更多標籤'}</span>
        </button>
      )}
    </div>
  );
}
