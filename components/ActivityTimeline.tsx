'use client';

import { useMemo } from 'react';

interface TimelineEvent {
  id: string;
  title: string;
  venue: string;
  prefecture: string;
  datetime: string;
  event_type: string;
  url: string;
}

interface ActivityTimelineProps {
  events: TimelineEvent[];
  maxItems?: number;
}

/**
 * 活動時間軸組件
 * 按月份分組顯示活動，時間軸視覺效果
 */
export default function ActivityTimeline({ events, maxItems }: ActivityTimelineProps) {
  // 按日期分組 + 排序
  const groupedEvents = useMemo(() => {
    // 先按日期排序（最新在前）
    const sorted = [...events].sort((a, b) => 
      new Date(b.datetime).getTime() - new Date(a.datetime).getTime()
    );

    // 限制顯示數量
    const limited = maxItems ? sorted.slice(0, maxItems) : sorted;

    // 按月份分組
    const groups: { [key: string]: TimelineEvent[] } = {};
    
    limited.forEach(event => {
      const date = new Date(event.datetime);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(event);
    });

    // 按月份排序（最新在前）
    return Object.entries(groups)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([month, items]) => ({
        month,
        monthLabel: formatMonthLabel(month),
        events: items,
      }));
  }, [events, maxItems]);

  function formatMonthLabel(monthKey: string): string {
    const [year, month] = monthKey.split('-');
    const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
    return `${year}年 ${monthNames[parseInt(month) - 1]}`;
  }

  function formatEventDate(datetime: string): string {
    const date = new Date(datetime);
    const day = date.getDate();
    const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
    const weekDay = weekDays[date.getDay()];
    const time = date.toLocaleTimeString('ja-JP', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
    
    return `${day}日 (${weekDay}) ${time}`;
  }

  function getEventTypeIcon(eventType: string): string {
    const type = eventType.toLowerCase();
    if (type.includes('sign') || type.includes('簽名') || type.includes('サイン')) return '✍️';
    if (type.includes('photo') || type.includes('撮影') || type.includes('攝影')) return '📸';
    if (type.includes('birth') || type.includes('生日') || type.includes('バース')) return '🎂';
    if (type.includes('event') || type.includes('見面') || type.includes('イベント')) return '🎫';
    return '🎉';
  }

  function getEventTypeColor(eventType: string): string {
    const type = eventType.toLowerCase();
    if (type.includes('sign') || type.includes('簽名') || type.includes('サイン')) return 'from-blue-500 to-cyan-500';
    if (type.includes('photo') || type.includes('撮影') || type.includes('攝影')) return 'from-purple-500 to-pink-500';
    if (type.includes('birth') || type.includes('生日') || type.includes('バース')) return 'from-amber-500 to-orange-500';
    if (type.includes('event') || type.includes('見面') || type.includes('イベント')) return 'from-emerald-500 to-teal-500';
    return 'from-gray-500 to-slate-500';
  }

  if (events.length === 0) {
    return (
      <div className="fdb-card p-12 text-center">
        <span className="text-5xl mb-4 block">📭</span>
        <p className="text-text-secondary text-lg">暫時未有活動記錄</p>
        <p className="text-text-tertiary text-sm mt-2">稍後再睇啦，很快就有新活動！</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {groupedEvents.map((group) => (
        <div key={group.month} className="relative">
          {/* 月份標題 */}
          <div className="sticky top-20 z-10 mb-6">
            <div className="inline-flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-nadeshiko-strong to-nadeshiko-dark flex items-center justify-center text-white text-xl shadow-lg">
                📅
              </div>
              <div>
                <h3 className="font-japanese text-xl font-bold text-text-primary">
                  {group.monthLabel}
                </h3>
                <p className="text-text-tertiary text-sm">
                  {group.events.length} 個活動
                </p>
              </div>
            </div>
          </div>

          {/* 時間軸活動列表 */}
          <div className="relative pl-6 border-l-2 border-nadeshiko-light/30 ml-6 space-y-6">
            {group.events.map((event, index) => (
              <div key={event.id} className="relative">
                {/* 時間軸圓點 */}
                <div className="absolute -left-[29px] top-4 w-5 h-5 rounded-full bg-white border-4 border-nadeshiko shadow-md z-10" />
                
                {/* 活動卡片 - Froala Design Blocks style */}
                <div className="fdb-card p-5 hover:shadow-lg transition-shadow group">
                  <div className="flex items-start gap-4">
                    {/* 活動類型圖標 */}
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getEventTypeColor(event.event_type)} flex items-center justify-center text-xl flex-shrink-0 shadow-md`}>
                      {getEventTypeIcon(event.event_type)}
                    </div>

                    {/* 活動內容 */}
                    <div className="flex-1 min-w-0">
                      {/* 日期 + 時間 */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-nadeshiko-light/30 text-nadeshiko-dark rounded-lg text-sm font-semibold">
                          📍 {formatEventDate(event.datetime)}
                        </span>
                        <span className="text-text-tertiary text-sm">
                          {event.prefecture}
                        </span>
                      </div>

                      {/* 活動標題 */}
                      <h4 className="font-japanese text-lg font-bold text-text-primary mb-2 group-hover:text-nadeshiko-dark transition-colors line-clamp-2">
                        {event.title}
                      </h4>

                      {/* 場地 */}
                      <div className="flex items-center gap-2 text-text-secondary text-sm mb-3">
                        <span>🏢</span>
                        <span className="truncate">{event.venue}</span>
                      </div>

                      {/* 底部操作欄 */}
                      <div className="flex items-center justify-between pt-3 border-t border-border">
                        <span className="text-xs text-text-tertiary px-2 py-1 bg-bg-secondary rounded-lg">
                          {event.event_type}
                        </span>
                        <a
                          href={event.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="fdb-btn fdb-btn-sm fdb-btn-outline text-nadeshiko-dark border-nadeshiko hover:bg-nadeshiko-light/20"
                        >
                          查看詳情 →
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
