'use client';

import { useState, useEffect } from 'react';

// Event type
interface EventItem {
  name: string;
  actress: string;
  date: string; // YYYY-MM-DD
  url: string;
}

// Hardcoded events - NIPPON COLORS theme
const EVENTS: EventItem[] = [
  {
    name: '香港粉絲攝影會',
    actress: 'NIA',
    date: '2026-05-30',
    url: 'https://javstarmeet.com/collections/nia/products/%F0%9F%93%B8-nia-%E9%A6%99%E6%B8%AF%E7%B2%89%E7%B5%B2%E6%94%9D%E5%BD%B1%E6%9C%83-2026%E5%B9%B45%E6%9C%8830%E6%97%A5',
  },
  {
    name: 'OFF會',
    actress: 'NIA',
    date: '2026-05-30',
    url: 'https://javstarmeet.com/collections/off%E6%9C%83/products/%F0%9D%BD%EF%B8%8F-nia-off%E6%9C%83-2026%E5%B9%B45%E6%9C%8830%E6%97%A5-%E5%85%A5%E5%A0%B4%E5%88%B8',
  },
  {
    name: '香港粉絲攝影會',
    actress: '小島南',
    date: '2026-06-06',
    url: 'https://javstarmeet.com/collections/%E5%B0%8F%E5%B3%B6%E5%8D%97/products/%F0%9F%93%B8-%E5%B0%8F%E5%B3%B6%E5%8D%97-%E9%A6%99%E6%B8%AF%E7%B2%89%E7%B5%B2%E6%94%9D%E5%BD%B1%E6%9C%83-2026%E5%B9%B46%E6%9C%886%E6%97%A5',
  },
  {
    name: 'OFF會',
    actress: '小島南',
    date: '2026-06-06',
    url: 'https://javstarmeet.com/collections/off%E6%9C%83/products/%F0%9D%BD%EF%B8%8F-%E5%B0%8F%E5%B3%B6%E5%8D%97-off%E6%9C%83-2026%E5%B9%B46%E6%9C%886%E6%97%A5-%E5%85%A5%E5%A0%B4%E5%88%B8',
  },
];

function getDaysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  const diffMs = target.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

function getActiveEvents(): EventItem[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return EVENTS.filter((e) => {
    const eventDate = new Date(e.date);
    eventDate.setHours(0, 0, 0, 0);
    return eventDate >= today;
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export default function EventBanner() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    // Check localStorage for 24h dismiss
    const dismissedUntil = localStorage.getItem('event-banner-dismissed');
    if (dismissedUntil) {
      const until = parseInt(dismissedUntil, 10);
      if (Date.now() < until) {
        setDismissed(true);
        return;
      } else {
        localStorage.removeItem('event-banner-dismissed');
      }
    }

    const activeEvents = getActiveEvents();
    if (activeEvents.length === 0) {
      setDismissed(true);
      return;
    }

    setVisible(true);
  }, []);

  // Auto-rotate every 6 seconds if multiple events
  useEffect(() => {
    const activeEvents = getActiveEvents();
    if (activeEvents.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((i) => (i + 1) % activeEvents.length);
    }, 6000);

    return () => clearInterval(interval);
  }, []);

  if (!visible || dismissed) return null;

  const activeEvents = getActiveEvents();
  const current = activeEvents[currentIndex];
  const daysLeft = getDaysUntil(current.date);

  const handleDismiss = () => {
    // Dismiss for 24 hours
    const until = Date.now() + 24 * 60 * 60 * 1000;
    localStorage.setItem('event-banner-dismissed', until.toString());
    setDismissed(true);
  };

  return (
    <div
      className="sticky top-0 z-50 w-full"
      style={{ backgroundColor: '#1a1a2e' }}
    >
      <div className="relative max-w-7xl mx-auto px-4 py-2.5">
        <div className="flex items-center justify-between gap-3">
          {/* Left: Event info */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Event icon */}
            <span className="text-lg flex-shrink-0">📸</span>

            {/* Event details - scrolls if needed on mobile */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="font-bold text-white text-sm md:text-base"
                  style={{ color: '#ff6b9d' }}
                >
                  【{current.actress}】
                </span>
                <span className="text-white text-sm md:text-base font-medium">
                  {current.name}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-gray-400 text-xs md:text-sm">
                  📅 {current.date}
                </span>
                <span
                  className="text-xs md:text-sm font-bold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: '#ff6b9d', color: '#1a1a2e' }}
                >
                  {daysLeft > 0 ? `⏰ ${daysLeft}日後` : '🔥 今日'}
                </span>
              </div>
            </div>
          </div>

          {/* Right: CTA + Dismiss */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Dot indicators for multiple events */}
            {activeEvents.length > 1 && (
              <div className="hidden sm:flex items-center gap-1">
                {activeEvents.map((_, i) => (
                  <span
                    key={i}
                    className="w-1.5 h-1.5 rounded-full transition-all"
                    style={{
                      backgroundColor: i === currentIndex ? '#ff6b9d' : '#4a4a6a',
                    }}
                  />
                ))}
              </div>
            )}

            {/* CTA Button */}
            <a
              href={current.url}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1 px-4 py-2 rounded-lg font-bold text-sm transition-all hover:opacity-90"
              style={{ backgroundColor: '#ff6b9d', color: '#1a1a2e' }}
            >
              購票 →
            </a>

            {/* Mobile CTA */}
            <a
              href={current.url}
              target="_blank"
              rel="noopener noreferrer"
              className="sm:hidden flex items-center justify-center w-8 h-8 rounded-lg"
              style={{ backgroundColor: '#ff6b9d' }}
            >
              <span className="text-sm" style={{ color: '#1a1a2e' }}>🎫</span>
            </a>

            {/* Dismiss button */}
            <button
              onClick={handleDismiss}
              className="flex items-center justify-center w-7 h-7 rounded-full hover:bg-white/10 transition-colors"
              aria-label="關閉"
            >
              <span className="text-gray-400 text-lg hover:text-white">✕</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}