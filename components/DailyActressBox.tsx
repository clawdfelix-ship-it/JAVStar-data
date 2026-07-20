'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

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

export default function DailyActressBox({ actresses }: DailyActressBoxProps) {
  const [selectedActress, setSelectedActress] = useState<Actress | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [futureActresses, setFutureActresses] = useState<Actress[]>([]);

  // 獲取未來有活動的女優
  useEffect(() => {
    fetchFutureActresses();
  }, [actresses]);

  const fetchFutureActresses = async () => {
    try {
      const res = await fetch('/api/events');
      const data = await res.json();
      
      // 過濾未來有活動的女優
      const now = new Date();
      const uniqueActressIds = new Set<string>();
      
      if (data.data && Array.isArray(data.data)) {
        data.data.forEach((e: any) => {
          // 檢查活動日期是否為未來
          const eventDate = new Date(e.datetime);
          if (eventDate > now && e.actress_id) {
            uniqueActressIds.add(e.actress_id);
          }
        });
      }
      
      console.log('未來活動女優 ID 數量:', uniqueActressIds.size);
      console.log('女優列表總數:', actresses.length);
      
      // 過濾出女優列表入面有未來活動的
      let filtered = actresses.filter(a => {
        const hasFutureEvent = uniqueActressIds.has(a.id);
        const has2026Events = a.year_2026_events > 0;
        return hasFutureEvent || has2026Events; // 任一條件符合即可
      });
      
      console.log('過濾後女優數量:', filtered.length);
      
      // 如果過濾後太少，就用評分最高的 50 個
      if (filtered.length < 5) {
        console.log('過濾後數量太少，使用評分排序');
        filtered = [...actresses].sort((a, b) => b.final_score - a.final_score).slice(0, 50);
      }
      
      // 按人氣評分排序，只取頭 50 名
      const sortedByScore = filtered.sort((a, b) => b.final_score - a.final_score).slice(0, 50);
      
      setFutureActresses(sortedByScore);
    } catch (error) {
      console.error('獲取未來活動失敗:', error);
      // 如果失敗，默認用評分最高的 50 個
      const sorted = [...actresses].sort((a, b) => b.final_score - a.final_score);
      setFutureActresses(sorted.slice(0, 50));
    }
  };

  const handleRandomPick = () => {
    if (futureActresses.length === 0 || isSpinning) return;

    setIsSpinning(true);

    const shuffled = [...futureActresses].sort(() => Math.random() - 0.5);

    let spins = 0;
    const maxSpins = 15;
    const interval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * shuffled.length);
      setSelectedActress(shuffled[randomIndex]);
      spins++;

      if (spins >= maxSpins) {
        clearInterval(interval);
        const finalIndex = Math.floor(Math.random() * shuffled.length);
        setSelectedActress(shuffled[finalIndex]);
        setIsSpinning(false);
      }
    }, 100);
  };

  return (
    <section className="py-6 px-4 bg-gradient-to-r from-pink-500/10 to-purple-500/10 border-y border-border">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-center gap-6">
          {/* 左邊：標題 + 按鈕 (mobile: order-2 排結果框之後) */}
          <div className="order-2 md:order-1 flex flex-col items-center md:items-start text-center md:text-left">
            <h2 className="text-xl md:text-2xl font-bold text-text-primary flex items-center gap-2 justify-center md:justify-start">
              <span className="text-2xl">🎁</span>
              今日女優盲盒
              <span className="text-xs font-normal text-text-secondary ml-2">
                DAILY ACTRESS
              </span>
            </h2>
            <p className="text-text-tertiary mt-1 text-sm">
              隨機抽取未來有活動嘅 Top 50 人氣女優，睇下今日嘅運氣！
            </p>
            <p className="text-[10px] text-text-tertiary mt-1">
              未來活動人數：{futureActresses.length} 位
            </p>
            <button
              onClick={handleRandomPick}
              disabled={futureActresses.length === 0 || isSpinning}
              className="mt-4 px-6 py-2.5 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg font-medium text-sm hover:from-pink-600 hover:to-purple-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              {isSpinning ? '🎰 抽取中...' : '🎲 立即抽取'}
            </button>
          </div>

          {/* 右邊：結果顯示 (mobile: order-1 top) */}
          <div className="order-1 md:order-2 min-w-[200px] flex justify-center">
            {selectedActress ? (
              <Link 
                href={`/actress/${selectedActress.id}`}
                className={`block bg-white rounded-xl shadow-lg overflow-hidden border-2 ${isSpinning ? 'border-pink-400 animate-pulse' : 'border-transparent hover:border-pink-300'} transition-all duration-300 cursor-pointer hover:shadow-xl`}
              >
                <div className="relative">
                  {/* 女優頭像 */}
                  <div className="aspect-square w-40 mx-auto overflow-hidden bg-gray-100">
                    {selectedActress.avatar_url ? (
                      <img
                        src={selectedActress.avatar_url}
                        alt={selectedActress.name_cn || selectedActress.name_ja}
                        className={`w-full h-full object-cover ${isSpinning ? 'blur-sm' : ''}`}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl text-gray-400">
                        👤
                      </div>
                    )}
                  </div>

                  {/* 女優資料 */}
                  <div className="p-4 text-center">
                    {/* 主名（可點擊） */}
                    <h3 className="font-bold text-text-primary text-lg hover:text-pink-500 transition-colors">
                      {selectedActress.name_ja}
                    </h3>
                    <p className="text-[10px] text-pink-400 mt-1">👆 點擊查看詳情</p>
                    {/* 其他名稱 / 曾用名 */}
                    {selectedActress.name_cn && selectedActress.name_cn !== selectedActress.name_ja && (
                      <div className="mt-1">
                        <span className="text-[10px] text-text-tertiary">其他名稱：</span>
                        <span className="text-xs text-text-secondary ml-1">
                          {selectedActress.name_cn}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-center gap-2 mt-2 flex-wrap">
                      {selectedActress.cup && (
                        <span className="px-2 py-0.5 bg-pink-100 text-pink-700 rounded-full text-xs">
                          {selectedActress.cup}
                        </span>
                      )}
                      {selectedActress.age && (
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs">
                          {selectedActress.age} 歲
                        </span>
                      )}
                      {selectedActress.year_2026_events > 0 && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
                          {selectedActress.year_2026_events} 場活動
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ) : (
              <div className="bg-white/50 rounded-xl border-2 border-dashed border-gray-300 w-40 h-52 flex flex-col items-center justify-center">
                <span className="text-4xl mb-2">❓</span>
                <p className="text-text-tertiary text-xs text-center">
                  點擊按鈕<br />抽取今日女優
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
