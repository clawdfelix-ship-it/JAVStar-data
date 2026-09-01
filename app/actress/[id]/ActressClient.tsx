'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import VoteButton from '@/components/VoteButton';
import EventCard from '@/components/EventCard';
import ActivityTimeline from '@/components/ActivityTimeline';
import { useFavorites } from '@/hooks/useFavorites';

interface ActressDetail {
  id: string;
  name_ja: string;
  name_cn: string | null;
  avatar_url: string | null;
  birthday: string | null;
  age: number | null;
  zodiac: string | null;
  height: string | null;
  bust: string | null;
  waist: string | null;
  hip: string | null;
  cup: string | null;
  agency: string | null;
  hobby: string | null;
  debut_year: number | null;
  debut_work: string | null;
  blog: string | null;
  official_site: string | null;
  tags: string | null;
  stats: {
    total_events: number;
    year_2026_events: number;
    month_04_2026_events: number;
    upcoming_events: number;
  };
  vote_count: number;
}

interface Event {
  id: string;
  title: string;
  venue: string;
  prefecture: string;
  datetime: string;
  event_type: string;
  url: string;
}

interface ActressClientProps {
  initialData: {
    actress: ActressDetail;
    events?: Event[];
    _matchingValidation?: {
      totalChecked: number;
      filteredCount: number;
      filterRate: number;
    } | null;
  };
  actressId: string;
}

export default function ActressClient({ initialData, actressId }: ActressClientProps) {
  const [actress, setActress] = useState<ActressDetail>(initialData.actress);
  const [events, setEvents] = useState<Event[]>(initialData.events || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matchingStats, setMatchingStats] = useState(initialData._matchingValidation || null);
  const [showShareMenu, setShowShareMenu] = useState(false);
  
  // 收藏功能
  const { isFavorite, toggleFavorite } = useFavorites();

  // 如果沒有初始數據（例如生產環境首次加載），客戶端重新獲取
  useEffect(() => {
    if (!initialData || !initialData.actress) {
      fetchActress();
    }
  }, []);

  async function fetchActress() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/actresses/${actressId}`, { cache: 'no-cache' });
      if (!response.ok) throw new Error('Failed to fetch');

      const data = await response.json();
      setActress(data.actress);
      setEvents(data.events || []);
      setMatchingStats(data._matchingValidation || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo' });
  }

  function calculateAge(birthday: string | null): number | null {
    if (!birthday) return null;
    const birthDate = new Date(birthday);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }

  function parseTags(tagsStr: string | null): string[] {
    if (!tagsStr) return [];
    return tagsStr.split(',').map(t => t.trim()).filter(Boolean);
  }

  // 渲染 JSON-LD 結構化數據
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    "name": actress.name_ja,
    "alternateName": actress.name_cn || undefined,
    "image": actress.avatar_url || undefined,
    "url": `https://jav-star-data.vercel.app/actress/${actressId}`,
    "jobTitle": "AV Actress",
    "description": `${actress.name_ja} - 日本 AV 女優，${actress.stats?.total_events || 0}個活動記錄`,
  };

  // Cross-sell: check if actress has upcoming event
  const crossSellActresses: Record<string, string> = {
    'NIA': '/collections/nia',
    '小島南': '/collections/%E5%B0%8F%E5%B3%B6%E5%8D%97',
  };
  const crossSellUrl = crossSellActresses[actress.name_ja] || crossSellActresses[actress.name_cn || ''] || null;

  return (
    <div className="min-h-screen bg-bg-secondary">
      {/* Cross-sell Banner - NIPPON COLORS */}
      {crossSellUrl && (
        <div className="w-full py-2.5 text-center text-sm font-medium bg-[rgb(var(--color-kamenozoki))] text-white">
          <span className="text-white">📸 </span>
          <span style={{ color: 'rgb(var(--color-nadeshiko))' }}>{actress.name_ja}</span>
          <span className="text-white"> 香港見面會 — </span>
          <a
            href={`https://javstarmeet.com${crossSellUrl}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:opacity-80 transition-opacity"
            style={{ color: 'rgb(var(--color-nadeshiko))' }}
          >
            購票 →
          </a>
        </div>
      )}
      {/* JSON-LD 結構化數據 (SEO) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Header */}
      <header className="sticky top-0 z-50 border-b shadow-sm bg-white" style={{borderColor:'rgba(var(--color-sakura-gray),0.6)'}}>
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-primary-dark hover:text-pink-700 font-semibold transition-colors">
              ← 返回排名
            </Link>
            <span className="text-text-tertiary">|</span>
            <span className="font-japanese text-lg text-text-primary font-semibold">女優詳細</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-2 md:px-4 py-6 md:py-8">
        {loading ? (
          <div className="space-y-4">
            <div className="skeleton h-64 w-full rounded-2xl" />
            <div className="skeleton h-32 w-full rounded-2xl" />
          </div>
        ) : error && !actress ? (
          <div className="fdb-card p-8 text-center">
            <p className="text-danger mb-4 font-medium">載入失敗: {error}</p>
            <button onClick={() => fetchActress()} className="fdb-btn fdb-btn-primary">
              重試
            </button>
          </div>
        ) : actress ? (
          <>
            {/* Profile Card - WHITE BACKGROUND FOR MAX CONTRAST */}
            <div className="fdb-card overflow-hidden mb-8">
              {/* Top gradient banner */}
              <div className="h-3 bg-gradient-to-r from-primary-dark via-primary to-primary-light" />
              
              <div className="p-6 md:p-8">
                <div className="flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-8">
                  {/* Avatar - Improved styling */}
                  <div className="relative flex-shrink-0">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/40 to-purple-500/40 rounded-full blur-2xl opacity-50" />
                    <div className="relative w-28 h-28 md:w-40 md:h-40 rounded-2xl overflow-hidden ring-4 ring-white shadow-xl bg-gradient-to-br from-pink-100 to-pink-200">
                      {actress.avatar_url ? (
                        <img src={actress.avatar_url} alt={actress.name_ja} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-5xl font-japanese font-bold text-primary-dark">
                          {actress.name_ja[0]}
                        </div>
                      )}
                    </div>
                    
                    {/* 收藏按鈕 */}
                    <button
                      onClick={() => toggleFavorite({
                        id: actress.id,
                        name_ja: actress.name_ja,
                        name_cn: actress.name_cn,
                        avatar_url: actress.avatar_url,
                      })}
                      className="absolute -bottom-2 -right-2 w-12 h-12 rounded-full shadow-lg border-2 flex items-center justify-center text-2xl hover:scale-110 transition-transform z-20 bg-white border-primary-dark"
                      title={isFavorite(actress.id) ? '取消收藏' : '加入收藏'}
                    >
                      {isFavorite(actress.id) ? '❤️' : '🤍'}
                    </button>
                  </div>

                  {/* Main Info - HIGH CONTRAST TEXT */}
                  <div className="flex-1 text-center md:text-left">
                    <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                      <h1 className="font-japanese text-2xl sm:text-3xl font-bold text-text-primary">
                        {actress.name_ja}
                      </h1>
                      
                      {/* 分享按鈕 */}
                      <div className="relative">
                        <button
                          onClick={() => setShowShareMenu(!showShareMenu)}
                          className="w-10 h-10 rounded-full bg-bg-secondary hover:bg-nadeshiko-light/30 flex items-center justify-center text-xl transition-colors"
                          title="分享"
                        >
                          📤
                        </button>
                        
                        {/* 分享選單 */}
                        {showShareMenu && (
                          <div className="absolute top-full left-0 mt-2 rounded-xl shadow-xl border p-3 z-50 min-w-[180px] bg-white border-border">
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(`https://jav-star-data.vercel.app/actress/${actressId}`);
                                setShowShareMenu(false);
                                alert('已複製鏈接！');
                              }}
                              className="w-full flex items-center gap-3 px-4 py-2 hover:bg-bg-secondary rounded-lg text-left transition-colors"
                            >
                              <span>📋</span>
                              <span>複製鏈接</span>
                            </button>
                            <button
                              onClick={() => {
                                const shareUrl = 'https://twitter.com/intent/tweet?url=' + 
                                  encodeURIComponent(`https://jav-star-data.vercel.app/actress/${actressId}`) +
                                  '&text=' + encodeURIComponent(`${actress.name_ja} - JAVStar Data`);
                                window.open(shareUrl, '_blank');
                                setShowShareMenu(false);
                              }}
                              className="w-full flex items-center gap-3 px-4 py-2 hover:bg-bg-secondary rounded-lg text-left transition-colors"
                            >
                              <span>🐦</span>
                              <span>Twitter</span>
                            </button>
                            <button
                              onClick={() => {
                                const shareUrl = 'https://www.facebook.com/sharer/sharer.php?u=' + 
                                  encodeURIComponent(`https://jav-star-data.vercel.app/actress/${actressId}`);
                                window.open(shareUrl, '_blank');
                                setShowShareMenu(false);
                              }}
                              className="w-full flex items-center gap-3 px-4 py-2 hover:bg-bg-secondary rounded-lg text-left transition-colors"
                            >
                              <span>📘</span>
                              <span>Facebook</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {actress.name_cn && (
                      <p className="text-text-secondary text-lg mb-4 font-medium">{actress.name_cn}</p>
                    )}

                    {/* Quick badges - SOLID COLORS for contrast */}
                    <div className="flex flex-wrap justify-center md:justify-start gap-2 mb-6">
                      {actress.age && (
                        <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-pink-100 text-pink-700 rounded-xl text-sm font-bold border border-pink-200">
                          🎂 {actress.age}歲
                        </span>
                      )}
                      {actress.zodiac && (
                        <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-100 text-purple-700 rounded-xl text-sm font-bold border border-purple-200">
                          ✨ {actress.zodiac}
                        </span>
                      )}
                      {actress.cup && (
                        <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-100 text-rose-700 rounded-xl text-sm font-mono font-bold border border-rose-200">
                          💋 Cup {actress.cup}
                        </span>
                      )}
                      {actress.debut_year && (
                        <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-100 text-emerald-700 rounded-xl text-sm font-bold border border-emerald-200">
                          🎬 {actress.debut_year} 出道
                        </span>
                      )}
                    </div>

                    {/* Stats Grid — 2×2 mobile / 4-col desktop, unified pink theme (P0 #3) */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="bg-white rounded-xl p-4 text-center border border-border shadow-sm">
                        <div className="font-mono text-2xl sm:text-3xl font-bold text-[rgb(var(--color-nadeshiko-dark))]">{actress.stats.total_events}</div>
                        <div className="text-text-secondary text-xs sm:text-sm mt-1 font-medium">📊 總活動</div>
                      </div>
                      <div className="bg-white rounded-xl p-4 text-center border border-border shadow-sm">
                        <div className="font-mono text-2xl sm:text-3xl font-bold text-[rgb(var(--color-umenezumi))]">{actress.stats.year_2026_events}</div>
                        <div className="text-text-secondary text-xs sm:text-sm mt-1 font-medium">📅 今年活動</div>
                      </div>
                      <div className="bg-white rounded-xl p-4 text-center border border-border shadow-sm">
                        <div className="font-mono text-2xl sm:text-3xl font-bold text-[rgb(var(--color-umenezumi))]">{actress.stats.upcoming_events}</div>
                        <div className="text-text-secondary text-xs sm:text-sm mt-1 font-medium">🗓️ 未來活動</div>
                      </div>
                      <div className="bg-white rounded-xl p-4 text-center border border-border shadow-sm flex flex-col items-center justify-between">
                        <div>
                          <div className="font-mono text-2xl sm:text-3xl font-bold text-[rgb(var(--color-nadeshiko-dark))]">{actress.vote_count}</div>
                          <div className="text-text-secondary text-xs sm:text-sm mt-1 font-medium">❤️ 投票</div>
                        </div>
                        <div className="mt-2 flex justify-center">
                          <VoteButton actressId={actress.id} initialCount={actress.vote_count} size="md" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Profile details grid - CLEAR LABELS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-8 pt-6 border-t border-border">
                  {actress.birthday && (
                    <div className="flex flex-col">
                      <span className="text-text-tertiary text-xs uppercase tracking-wide font-semibold">生日</span>
                      <span className="font-japanese text-text-primary mt-1 font-medium text-lg">
                        {formatDate(actress.birthday)} ({calculateAge(actress.birthday)}歲)
                      </span>
                    </div>
                  )}
                  {actress.height && (
                    <div className="flex flex-col">
                      <span className="text-text-tertiary text-xs uppercase tracking-wide font-semibold">身高</span>
                      <span className="font-japanese text-text-primary mt-1 font-medium text-lg">{actress.height}cm</span>
                    </div>
                  )}
                  {actress.bust && actress.waist && actress.hip && (
                    <div className="flex flex-col">
                      <span className="text-text-tertiary text-xs uppercase tracking-wide font-semibold">三圍</span>
                      <span className="font-mono text-text-primary mt-1 font-medium text-lg">
                        B{actress.bust} / W{actress.waist} / H{actress.hip}
                      </span>
                    </div>
                  )}
                  {actress.agency && (
                    <div className="flex flex-col">
                      <span className="text-text-tertiary text-xs uppercase tracking-wide font-semibold">事務所</span>
                      <span className="text-text-primary mt-1 font-medium text-lg">{actress.agency}</span>
                    </div>
                  )}
                  {actress.hobby && (
                    <div className="flex flex-col">
                      <span className="text-text-tertiary text-xs uppercase tracking-wide font-semibold">愛好</span>
                      <span className="text-text-primary mt-1 font-medium text-lg">{actress.hobby}</span>
                    </div>
                  )}
                  {actress.debut_work && (
                    <div className="flex flex-col">
                      <span className="text-text-tertiary text-xs uppercase tracking-wide font-semibold">出道作品</span>
                      <span className="text-text-primary mt-1 font-medium">{actress.debut_work}</span>
                    </div>
                  )}
                </div>

                {/* Tags - DARK TEXT ON LIGHT BACKGROUND */}
                {actress.tags && parseTags(actress.tags).length > 0 && (
                  <div className="mt-6 pt-6 border-t border-border">
                    <span className="text-text-tertiary text-xs uppercase tracking-wide font-semibold block mb-3">標籤</span>
                    <div className="flex flex-wrap gap-2">
                      {parseTags(actress.tags).map((tag, i) => (
                        <span
                          key={i}
                          className="px-4 py-2 bg-bg-secondary text-text-primary border border-border rounded-xl text-sm font-medium"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* External links - HIGH CONTRAST BUTTONS */}
                {(actress.blog || actress.official_site) && (
                  <div className="mt-6 pt-6 border-t border-border">
                    <span className="text-text-tertiary text-xs uppercase tracking-wide font-semibold block mb-4">🔗 外部連結</span>
                    <div className="flex flex-wrap gap-3">
                      {actress.official_site && (
                        <a
                          href={actress.official_site}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="fdb-btn fdb-btn-primary"
                        >
                          🌐 官網
                        </a>
                      )}
                      {actress.blog && (
                        <a
                          href={actress.blog}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="fdb-btn fdb-btn-outline"
                        >
                          📝 博客
                        </a>
                      )}
                      <a
                        href={`https://www.minnano-av.com/actress${actress.id}.html`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="fdb-btn fdb-btn-outline"
                      >
                        📺 minnano-av
                      </a>
                      <a
                        href={`https://www.av-event.jp/search/?q=${encodeURIComponent(actress.name_ja)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="fdb-btn fdb-btn-outline"
                      >
                        🎫 av-event
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Events section */}
            <div>
              <h2 className="font-japanese text-xl font-bold text-text-primary mb-4 flex items-center gap-2 flex-wrap">
                <span className="text-pink-600">●</span>
                活動記錄 
                <span className="text-text-secondary font-normal text-base">
                  (顯示 {events.length} 個{matchingStats && matchingStats.filteredCount > 0 ? `，已自動過濾 ${matchingStats.filteredCount} 個錯配` : ''})
                </span>
              </h2>
              
              {/* 配對校驗提示 - 解釋為什麼數量與首頁不一致 */}
              {matchingStats && matchingStats.filteredCount > 0 && (
                <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <div className="flex items-start gap-3">
                    <span className="text-xl">⚠️</span>
                    <div>
                      <p className="font-medium text-amber-800">已自動過濾 {matchingStats.filteredCount} 個錯誤配對的活動</p>
                      <p className="text-sm text-amber-700 mt-1">
                        活動標題不包含女優姓名「{actress?.name_ja}」，可能是數據爬蟲時配對錯誤。
                        已自動隱藏以保證數據準確性。
                      </p>
                      <p className="text-xs text-amber-600 mt-2">
                        💡 首頁顯示的是原始數據庫統計，未經過濾，因此數量可能不一致
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 活動時間軸 */}
              <ActivityTimeline events={events} />
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}
