'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Gift, Dice5, User, Star, Sparkles, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface Actress {
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
}

interface DailyActressBoxProps {
  actresses: Actress[];
}

// 抽卡階段：idle → charging → meteor → impact → pause → flip → silhouette → reveal → done
type GachaPhase =
  | 'idle'
  | 'charging'
  | 'meteor'
  | 'impact'
  | 'pause'
  | 'flip'
  | 'silhouette'
  | 'reveal'
  | 'done';

type Rarity = {
  key: 'rare' | 'epic' | 'legend';
  label: string;
  stars: number;
  color: string;
  glow: string;
};

const RARITY_TABLE: Record<Rarity['key'], Rarity> = {
  rare: {
    key: 'rare',
    label: '稀有',
    stars: 3,
    color: '#60a5fa',
    glow: 'rgba(96,165,250,0.45)',
  },
  epic: {
    key: 'epic',
    label: '史詩',
    stars: 4,
    color: '#c084fc',
    glow: 'rgba(192,132,252,0.5)',
  },
  legend: {
    key: 'legend',
    label: '傳說',
    stars: 5,
    color: '#f5c542',
    glow: 'rgba(245,197,66,0.6)',
  },
};

// 停頓一拍：8 粒光點由四周聚向中心
const CONVERGE_DOTS = [
  { dx: 56, dy: 56 }, { dx: -56, dy: 56 }, { dx: 56, dy: -56 }, { dx: -56, dy: -56 },
  { dx: 0, dy: 66 }, { dx: 0, dy: -66 }, { dx: 66, dy: 0 }, { dx: -66, dy: 0 },
];

// 余韵：慢漂光點
const DRIFT_DOTS = [
  { left: '18%', bottom: '12%', delay: '0s' },
  { left: '72%', bottom: '20%', delay: '1.4s' },
  { left: '46%', bottom: '8%', delay: '2.6s' },
];

export default function DailyActressBox({ actresses }: DailyActressBoxProps) {
  const [selectedActress, setSelectedActress] = useState<Actress | null>(null);
  const [rarity, setRarity] = useState<Rarity | null>(null);
  const [phase, setPhase] = useState<GachaPhase>('idle');
  const [futureActresses, setFutureActresses] = useState<Actress[]>([]);
  const [showHelp, setShowHelp] = useState(false);

  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const runIdRef = useRef(0);
  const reducedMotionRef = useRef(false);

  const isAnimating =
    phase !== 'idle' && phase !== 'done';

  // 獲取未來有活動的女優
  useEffect(() => {
    fetchFutureActresses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actresses]);

  useEffect(() => {
    reducedMotionRef.current =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  // unmount 清晒所有計時器
  useEffect(() => {
    return () => {
      runIdRef.current += 1;
      timersRef.current.forEach(clearTimeout);
    };
  }, []);

  const schedule = useCallback((fn: () => void, ms: number) => {
    const t = setTimeout(fn, ms);
    timersRef.current.push(t);
  }, []);

  const fetchFutureActresses = async () => {
    try {
      // 卡池＝未來 30 日有港台活動嘅女優（2026-11 修訂）
      const now = new Date();
      const windowEnd = new Date(now);
      windowEnd.setDate(windowEnd.getDate() + 30);

      const [hkRes, twRes] = await Promise.all([
        fetch('/api/events?region=hk&limit=200'),
        fetch('/api/events?region=taiwan&limit=200'),
      ]);
      const hkJson = await hkRes.json();
      const twJson = await twRes.json();
      const rows: any[] = [...(hkJson.data || []), ...(twJson.data || [])];

      // 直接由 event rows 建池（events API 已 JOIN name_ja/name_cn/avatar_url），
      // 唔依賴外嚟 actresses prop（佢只係隨機一頁 100 個，覆蓋唔到全池）
      const poolMap = new Map<string, Actress>();
      rows.forEach((e) => {
        if (!e.actress_id || !e.date_iso) return;
        const d = new Date(`${e.date_iso}T00:00:00+08:00`);
        if (d >= new Date(`${now.toISOString().slice(0, 10)}T00:00:00+08:00`) && d <= windowEnd) {
          if (!poolMap.has(e.actress_id)) {
            poolMap.set(e.actress_id, {
              id: e.actress_id,
              name_ja: e.name_ja || '',
              name_cn: e.name_cn || null,
              avatar_url: e.avatar_url || null,
              age: null, zodiac: null, cup: null, height: null,
              bust: null, waist: null, hip: null, agency: null, hobby: null,
              debut_year: null, event_count: 0, year_2026_events: 0,
              vote_count: 0, final_score: 0,
            });
          }
        }
      });

      setFutureActresses([...poolMap.values()]);
    } catch (error) {
      console.error('獲取未來港台活動失敗:', error);
      // 寧願卡池清空都唔好用人氣後備，保住「未來30日港台場」規則
      setFutureActresses([]);
    }
  };

  // 加權隨機稀有度：稀有 80%／史詩 15%／傳說 5%（同抽中邊位女優脫鈎）
  const rollRarity = (): Rarity => {
    const r = Math.random();
    if (r < 0.05) return RARITY_TABLE.legend;
    if (r < 0.2) return RARITY_TABLE.epic;
    return RARITY_TABLE.rare;
  };

  const handleRandomPick = () => {
    if (futureActresses.length === 0 || isAnimating) return;

    // 清走上一輪殘留計時器
    runIdRef.current += 1;
    const runId = runIdRef.current;
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];

    const shuffled = [...futureActresses].sort(() => Math.random() - 0.5);
    const finalPick = shuffled[Math.floor(Math.random() * shuffled.length)];
    const pickedRarity = rollRarity();

    // reduced-motion：直接出結果，唔播動畫
    if (reducedMotionRef.current) {
      setSelectedActress(finalPick);
      setRarity(pickedRarity);
      setPhase('done');
      return;
    }

    const alive = () => runIdRef.current === runId;

    // 1. 按下蓄力 0.15s
    setPhase('charging');
    schedule(() => {
      if (!alive()) return;
      // 2+3. 流星 1.3s（藍→紫→金，CSS 內置變色閃爍）
      setPhase('meteor');
    }, 150);

    // 4. 落地衝擊：波紋＋震動 0.55s
    schedule(() => {
      if (!alive()) return;
      setPhase('impact');
    }, 1450);

    // 5. 停頓一拍：光點聚合 0.55s
    schedule(() => {
      if (!alive()) return;
      setPhase('pause');
    }, 2000);

    // 預先鎖定結果，等翻牌時卡面有圖
    schedule(() => {
      if (!alive()) return;
      setSelectedActress(finalPick);
      setRarity(pickedRarity);
      // 6. 翻牌 0.7s
      setPhase('flip');
    }, 2550);

    // 8. 金邊剪影 0.45s
    schedule(() => {
      if (!alive()) return;
      setPhase('silhouette');
    }, 3250);

    // 上色＋9. 星級逐亮／名字落下（CSS animation-delay 接手）
    schedule(() => {
      if (!alive()) return;
      setPhase('reveal');
    }, 3700);

    // 10. 余韵呼吸
    schedule(() => {
      if (!alive()) return;
      setPhase('done');
    }, 4250);
  };

  const buttonLabel =
    phase === 'charging' ? '蓄力中…'
    : phase === 'meteor' ? '流星降臨…'
    : phase === 'impact' ? '衝擊！'
    : phase === 'pause' ? '即將揭曉…'
    : phase === 'flip' || phase === 'silhouette' ? '開卡中…'
    : phase === 'reveal' ? '揭曉！'
    : '立即抽取';

  return (
    <section className="py-6 px-4 bg-gradient-to-r from-pink-500/10 to-purple-500/10 border-y border-border">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-center gap-6">
          {/* 左邊：標題 + 按鈕 (mobile: order-2 排結果框之後) */}
          <div className="order-2 md:order-1 flex flex-col items-center md:items-start text-center md:text-left">
            <h2 className="text-xl md:text-2xl font-bold text-text-primary flex items-center gap-2 justify-center md:justify-start">
              <Gift className="w-6 h-6 text-pink-500" />
              今日女優盲盒
              <span className="text-xs font-normal text-text-secondary ml-2">
                DAILY ACTRESS
              </span>
            </h2>
            <p className="text-text-tertiary mt-1 text-sm">
              隨機抽取未來 30 日有港台活動嘅女優，睇下今日嘅運氣！
            </p>
            <p className="text-[10px] text-text-tertiary mt-1">
              未來活動人數：{futureActresses.length} 位
            </p>
            <button
              onClick={handleRandomPick}
              disabled={futureActresses.length === 0 || isAnimating}
              className={`mt-4 px-6 py-2.5 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-lg font-medium text-sm hover:from-pink-700 hover:to-purple-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center gap-2 ${
                phase === 'charging' ? 'gacha-charging' : ''
              }`}
            >
              <Dice5 className={`w-4 h-4 ${isAnimating ? 'animate-spin' : ''}`} />
              {buttonLabel}
            </button>
          </div>

          {/* 右邊：結果顯示 (mobile: order-1 top) */}
          <div className="order-1 md:order-2 min-w-[200px] flex justify-center">
            <div className="relative">
              {/* 2+3. 流星（飛越卡區） */}
              {phase === 'meteor' && (
                <div className="absolute inset-0 overflow-visible pointer-events-none z-20">
                  <span className="gacha-meteor" />
                </div>
              )}

              {selectedActress && rarity && phase !== 'idle' ? (
                <Link
                  href={`/actress/${selectedActress.id}`}
                  className={`block ${phase === 'impact' ? 'gacha-shaking' : ''}`}
                  style={{ width: '12rem' }}
                  aria-label={`查看 ${selectedActress.name_ja} 詳情`}
                >
                  {/* 卡面區：翻牌場景 */}
                  <div
                    className="gacha-flip-scene relative w-48 aspect-square rounded-t-xl overflow-hidden bg-gray-100 gacha-thickness"
                    style={{
                      border: `2px solid ${phase === 'done' || phase === 'reveal' || phase === 'silhouette' ? rarity.color : 'rgba(244,114,182,0.6)'}`,
                      boxShadow: isAnimating ? `0 0 24px -4px ${rarity.glow}` : undefined,
                    }}
                  >
                    {/* 4a. 落地波紋 */}
                    {phase === 'impact' && <span className="gacha-ripple" />}

                    {/* 5. 停頓光點聚合 */}
                    {phase === 'pause' &&
                      CONVERGE_DOTS.map((d, i) => (
                        <span
                          key={i}
                          className="gacha-converge-dot"
                          style={{ ['--dx' as string]: `${d.dx}px`, ['--dy' as string]: `${d.dy}px` }}
                        />
                      ))}

                    <div
                      className="w-full h-full"
                    >
                      {/* 翻牌：未到 flip 階段顯示卡背；reduced-motion 直接出卡面（唔用 3D 結構，避免停喺背面） */}
                      {reducedMotionRef.current ? (
                        <div className="relative w-full h-full">
                          {selectedActress.avatar_url ? (
                            <img
                              src={selectedActress.avatar_url}
                              alt={selectedActress.name_cn || selectedActress.name_ja}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-4xl text-gray-400">
                              <User className="w-12 h-12" />
                            </div>
                          )}
                          <span
                            className="absolute top-1.5 right-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full text-white shadow"
                            style={{ backgroundColor: rarity.color }}
                          >
                            {rarity.label}
                          </span>
                        </div>
                      ) : (phase === 'flip' || phase === 'silhouette' || phase === 'reveal' || phase === 'done') ? (
                        <div className="gacha-flip-inner">
                          {/* 卡背（翻轉時喺背面） */}
                          <div className="gacha-face gacha-face-back gacha-card-back flex items-center justify-center">
                            <Sparkles className="w-10 h-10 text-pink-300/80" />
                          </div>
                          {/* 卡面 */}
                          <div className="gacha-face relative">
                            {selectedActress.avatar_url ? (
                              <img
                                src={selectedActress.avatar_url}
                                alt={selectedActress.name_cn || selectedActress.name_ja}
                                className={`w-full h-full object-cover ${
                                  phase === 'silhouette'
                                    ? 'gacha-silhouette'
                                    : 'gacha-revealed'
                                } ${phase === 'done' ? 'gacha-breathe' : ''}`}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-4xl text-gray-400">
                                <User className="w-12 h-12" />
                              </div>
                            )}

                            {/* 7. 金光爆發（史詩／傳說） */}
                            {phase === 'reveal' && rarity.key !== 'rare' && (
                              <span className="gacha-burst" />
                            )}
                            {phase === 'reveal' && rarity.key === 'legend' && (
                              <span className="gacha-rays" />
                            )}

                            {/* 6. 翻完高光掃過 */}
                            {phase === 'silhouette' && <span className="gacha-sheen" />}

                            {/* 稀有度角章 */}
                            <span
                              className="absolute top-1.5 right-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full text-white shadow"
                              style={{ backgroundColor: rarity.color }}
                            >
                              {rarity.label}
                            </span>
                          </div>
                        </div>
                      ) : (
                        /* flip 之前：靜態卡背（蓄力／流星／衝擊／停頓階段） */
                        <div className="w-full h-full gacha-card-back flex items-center justify-center">
                          <Sparkles className={`w-10 h-10 text-pink-300/80 ${isAnimating ? 'animate-pulse' : ''}`} />
                        </div>
                      )}
                    </div>

                    {/* 10. 余韵慢漂光點 */}
                    {phase === 'done' &&
                      DRIFT_DOTS.map((d, i) => (
                        <span
                          key={i}
                          className="gacha-drift-dot"
                          style={{ left: d.left, bottom: d.bottom, animationDelay: d.delay }}
                        />
                      ))}
                  </div>

                  {/* 女優資料：只留星級＋名字，固定高度令每張卡一致 */}
                  <div
                    className="px-3 py-3 text-center bg-white rounded-b-xl border-2 border-t-0 h-[88px] flex flex-col justify-center"
                    style={{
                      borderColor:
                        phase === 'done' || phase === 'reveal' || phase === 'silhouette'
                          ? rarity.color
                          : 'rgba(244,114,182,0.6)',
                    }}
                  >
                    {/* 9. 星級逐亮（0.12s 一顆） */}
                    <div className="flex justify-center gap-0.5 mb-1.5" style={{ minHeight: '1rem' }}>
                      {(phase === 'reveal' || phase === 'done') &&
                        Array.from({ length: rarity.stars }).map((_, i) => (
                          <span
                            key={i}
                            className="gacha-star"
                            style={{ animationDelay: `${i * 0.12}s`, color: rarity.color }}
                          >
                            <Star className="w-4 h-4" fill="currentColor" strokeWidth={0} />
                          </span>
                        ))}
                    </div>

                    {/* 主名：最後落下（成張卡已係 Link，呢度用 span 避免巢狀 <a>） */}
                    {phase === 'reveal' || phase === 'done' ? (
                      <span className="gacha-name-drop inline-block font-bold text-text-primary text-base leading-tight truncate px-1">
                        {selectedActress.name_ja}
                      </span>
                    ) : (
                      <h3 className="font-bold text-text-primary text-base opacity-60">？？？</h3>
                    )}
                  </div>
                </Link>
              ) : (
                <div className="bg-gradient-to-br from-nadeshiko-light/40 to-white rounded-xl border border-nadeshiko/30 shadow-sm w-48 aspect-[192/280] flex flex-col items-center justify-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center">
                    <Gift className="w-6 h-6 text-nadeshiko-dark" />
                  </div>
                  <p className="text-text-secondary text-xs text-center font-medium px-3 leading-relaxed">
                    未抽取<br /><span className="text-text-tertiary font-normal">按「立即抽取」試試今日運氣</span>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 卡片稀有度點計：可展開簡介 */}
        <div className="mx-auto mt-6 max-w-3xl overflow-hidden rounded-2xl border border-pink-200/60 bg-white/70">
          <button
            type="button"
            onClick={() => setShowHelp((v) => !v)}
            aria-expanded={showHelp}
            className="flex min-h-[48px] w-full items-center gap-2.5 px-5 py-3 text-left"
          >
            <HelpCircle className="h-4 w-4 shrink-0 text-pink-600" />
            <span className="flex-1 text-sm font-bold text-text-primary">
              卡片稀有度點計？
            </span>
            {showHelp
              ? <ChevronUp className="h-4 w-4 shrink-0 text-text-tertiary" />
              : <ChevronDown className="h-4 w-4 shrink-0 text-text-tertiary" />}
          </button>

          {showHelp && (
            <div className="space-y-4 px-5 pb-5 text-sm leading-relaxed text-text-secondary">
              <div>
                <p className="font-bold text-text-primary">① 女優卡池</p>
                <p className="mt-1">
                  卡池淨係包含<strong>未來 30 日內（由今日起計）有香港或台灣公開活動</strong>嘅女優，活動過咗或超出 30 日就會自動離池；每次抽卡喺池內隨機抽出一位，每位機會均等。
                </p>
              </div>
              <div>
                <p className="font-bold text-text-primary">② 稀有度（同抽中邊位女優脫鈎）</p>
                <p className="mt-1">稀有度係獨立擲骰，純睇運氣，唔關女優名氣事：</p>
                <ul className="mt-2 space-y-1.5">
                  {[
                    { r: RARITY_TABLE.rare, p: '80%', note: '藍色邊框 · ★★★' },
                    { r: RARITY_TABLE.epic, p: '15%', note: '紫色邊框 · ★★★★ · 開卡有金光爆發' },
                    { r: RARITY_TABLE.legend, p: '5%', note: '金色邊框 · ★★★★★ · 開卡有光芒放射' },
                  ].map(({ r, p, note }) => (
                    <li key={r.key} className="flex items-center gap-3">
                      <span
                        className="inline-flex h-7 w-14 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                        style={{ backgroundColor: r.color }}
                      >
                        {r.label}
                      </span>
                      <span className="font-bold" style={{ color: r.color }}>{p}</span>
                      <span className="text-xs text-text-tertiary">{note}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <p className="text-xs text-text-tertiary">
                即平均每 20 抽大約有 1 張傳說、3 張史詩；結果只係趣味收集，唔影響活動資料。
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
