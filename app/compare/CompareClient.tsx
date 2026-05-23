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

function getAgeDisplay(a: Actress): string {
  if (a.age) return `${a.age}歳`;
  return '—';
}

function getBodyDisplay(a: Actress): string {
  if (a.bust && a.waist && a.hip) return `B${a.bust} / W${a.waist} / H${a.hip}`;
  if (a.bust) return `B${a.bust}`;
  return '—';
}

function getBest(a: number | null, b: number | null, higher: boolean): 'a' | 'b' | 'tie' {
  if (a == null && b == null) return 'tie';
  if (a == null) return 'b';
  if (b == null) return 'a';
  if (higher) return a > b ? 'a' : a < b ? 'b' : 'tie';
  return a < b ? 'a' : a > b ? 'b' : 'tie';
}

export default function CompareClient() {
  const [actresses, setActresses] = useState<Actress[]>([]);
  const [s1, setS1] = useState('');
  const [s2, setS2] = useState('');
  const [sel1, setSel1] = useState<Actress | null>(null);
  const [sel2, setSel2] = useState<Actress | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/actresses?limit=500')
      .then(r => r.json())
      .then(d => { setActresses(d.data || []); setLoading(false); });
  }, []);

  const f1 = actresses.filter(a =>
    a.name_ja.includes(s1) || (a.name_cn && a.name_cn.includes(s1))
  ).slice(0, 15);

  const f2 = actresses.filter(a =>
    a.name_ja.includes(s2) || (a.name_cn && a.name_cn.includes(s2))
  ).slice(0, 15);

  const rows: { label: string; v1: string; v2: string; best: 'a' | 'b' | 'tie' }[] = sel1 && sel2 ? [
    { label: '年齡', v1: getAgeDisplay(sel1), v2: getAgeDisplay(sel2), best: getBest(sel1.age, sel2.age, false) },
    { label: '身高', v1: sel1.height || '—', v2: sel2.height || '—', best: 'tie' },
    { label: '罩杯', v1: sel1.cup || '—', v2: sel2.cup || '—', best: 'tie' },
    { label: '三圍', v1: getBodyDisplay(sel1), v2: getBodyDisplay(sel2), best: 'tie' },
    { label: '星座', v1: sel1.zodiac || '—', v2: sel2.zodiac || '—', best: 'tie' },
    { label: '出道', v1: sel1.debut_year ? String(sel1.debut_year) : '—', v2: sel2.debut_year ? String(sel2.debut_year) : '—', best: 'tie' },
    { label: '2026活動', v1: String(sel1.year_2026_events), v2: String(sel2.year_2026_events), best: getBest(sel1.year_2026_events, sel2.year_2026_events, true) },
    { label: '總活動', v1: String(sel1.event_count), v2: String(sel2.event_count), best: getBest(sel1.event_count, sel2.event_count, true) },
    { label: '投票數', v1: String(sel1.vote_count), v2: String(sel2.vote_count), best: getBest(sel1.vote_count, sel2.vote_count, true) },
    { label: '評分', v1: String(sel1.final_score), v2: String(sel2.final_score), best: getBest(sel1.final_score, sel2.final_score, true) },
    { label: '事務所', v1: sel1.agency || '—', v2: sel2.agency || '—', best: 'tie' },
    { label: '興趣', v1: sel1.hobby || '—', v2: sel2.hobby || '—', best: 'tie' },
  ] : [];

  function WinnerDot({ best, who }: { best: string; who: 'a' | 'b' }) {
    if (best !== who) return null;
    return <span className="ml-1 text-[10px]">★</span>;
  }

  return (
    <div className="min-h-screen bg-[#0f0f1a] text-[#eaeaea]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#1a1a2e] border-b border-[#2a2a4a] px-4 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <Link href="/" className="text-[#e94560] hover:text-[#ff6b8a] text-sm">← 返回</Link>
          <h1 className="text-lg font-bold text-white">女優比較</h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-20 text-[#a0a0a0]">載入中...</div>
        ) : (
          <>
            {/* Selectors */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              {/* Selector 1 */}
              <div className="bg-[#16213e] rounded-xl p-4 border border-[#2a2a4a]">
                <div className="text-xs text-[#a0a0a0] mb-2">女優 A</div>
                {sel1 ? (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#e94560]/20 flex items-center justify-center text-[#e94560] font-bold text-lg">{sel1.name_ja[0]}</div>
                    <div>
                      <div className="text-white font-medium">{sel1.name_ja}</div>
                      {sel1.name_cn && <div className="text-[#6c6c8a] text-xs">{sel1.name_cn}</div>}
                    </div>
                    <button onClick={() => setSel1(null)} className="ml-auto text-xs text-[#e94560] hover:underline">移除</button>
                  </div>
                ) : (
                  <input
                    type="text" placeholder="搜尋..." value={s1}
                    onChange={e => { setS1(e.target.value); setSel1(null); }}
                    className="w-full bg-[#0f0f1a] border border-[#2a2a4a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#6c6c8a] focus:outline-none focus:border-[#e94560]"
                  />
                )}
                {s1 && !sel1 && (
                  <div className="mt-1 space-y-1 max-h-48 overflow-y-auto">
                    {f1.map(a => (
                      <button key={a.id} onClick={() => { setSel1(a); setS1(''); }}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#1a2744] text-sm flex items-center gap-2 transition-colors">
                        <span className="text-[#e94560] font-bold">{a.name_ja[0]}</span>
                        <span className="text-white">{a.name_ja}</span>
                        {a.name_cn && <span className="text-[#6c6c8a] text-xs">{a.name_cn}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Selector 2 */}
              <div className="bg-[#16213e] rounded-xl p-4 border border-[#2a2a4a]">
                <div className="text-xs text-[#a0a0a0] mb-2">女優 B</div>
                {sel2 ? (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#60a5fa]/20 flex items-center justify-center text-[#60a5fa] font-bold text-lg">{sel2.name_ja[0]}</div>
                    <div>
                      <div className="text-white font-medium">{sel2.name_ja}</div>
                      {sel2.name_cn && <div className="text-[#6c6c8a] text-xs">{sel2.name_cn}</div>}
                    </div>
                    <button onClick={() => setSel2(null)} className="ml-auto text-xs text-[#60a5fa] hover:underline">移除</button>
                  </div>
                ) : (
                  <input
                    type="text" placeholder="搜尋..." value={s2}
                    onChange={e => { setS2(e.target.value); setSel2(null); }}
                    className="w-full bg-[#0f0f1a] border border-[#2a2a4a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#6c6c8a] focus:outline-none focus:border-[#60a5fa]"
                  />
                )}
                {s2 && !sel2 && (
                  <div className="mt-1 space-y-1 max-h-48 overflow-y-auto">
                    {f2.map(a => (
                      <button key={a.id} onClick={() => { setSel2(a); setS2(''); }}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#1a2744] text-sm flex items-center gap-2 transition-colors">
                        <span className="text-[#60a5fa] font-bold">{a.name_ja[0]}</span>
                        <span className="text-white">{a.name_ja}</span>
                        {a.name_cn && <span className="text-[#6c6c8a] text-xs">{a.name_cn}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Comparison Table */}
            {sel1 && sel2 && (
              <div className="bg-[#16213e] rounded-xl border border-[#2a2a4a] overflow-hidden">
                <div className="grid grid-cols-3 border-b border-[#2a2a4a] bg-[#1a1a2e]">
                  <div className="p-3 text-xs text-[#6c6c8a]">屬性</div>
                  <div className="p-3 text-center">
                    <div className="text-[#e94560] font-bold truncate">{sel1.name_ja}</div>
                  </div>
                  <div className="p-3 text-center">
                    <div className="text-[#60a5fa] font-bold truncate">{sel2.name_ja}</div>
                  </div>
                </div>
                {rows.map((row, i) => (
                  <div key={i} className={`grid grid-cols-3 border-b border-[#2a2a4a] last:border-0 ${i % 2 === 0 ? 'bg-[#0f0f1a]/30' : ''}`}>
                    <div className="p-3 text-[#6c6c8a] text-sm">{row.label}</div>
                    <div className={`p-3 text-center text-sm font-medium ${row.best === 'a' ? 'text-[#4ade80]' : 'text-[#eaeaea]'}`}>
                      {row.v1}<WinnerDot best={row.best} who="a" />
                    </div>
                    <div className={`p-3 text-center text-sm font-medium ${row.best === 'b' ? 'text-[#60a5fa]' : 'text-[#eaeaea]'}`}>
                      {row.v2}<WinnerDot best={row.best} who="b" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {(!sel1 || !sel2) && (
              <div className="text-center py-16 text-[#4a4a6a]">
                <div className="text-4xl mb-4">⚖️</div>
                <p>選擇兩位女優比較</p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}