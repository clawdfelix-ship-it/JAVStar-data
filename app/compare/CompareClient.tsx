'use client';

import { useState } from 'react';
import Link from 'next/link';
import Logo from '@/components/Logo';
import ComparePicker, { type CompareActress } from '@/components/ComparePicker';

// 2026-09-11：搜尋統一走 ComparePicker（mode=quick trigram + IME/Abort），
// 揀中先 fetch /api/actresses/[id] 拎完整資料。唔再自寫 doSearch。

function getAgeDisplay(a: CompareActress): string {
  if (a.age) return `${a.age}歳`;
  return '—';
}

function getBodyDisplay(a: CompareActress): string {
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
  const [sel1, setSel1] = useState<CompareActress | null>(null);
  const [sel2, setSel2] = useState<CompareActress | null>(null);
  const [loading1, setLoading1] = useState(false);
  const [loading2, setLoading2] = useState(false);

  const pick1 = (a: CompareActress) => {
    // shell（詳情未返）vs full（數據齊）——用 vote_count/event_count 有冇值分辨
    const isShell = a.event_count === 0 && a.vote_count === 0 && a.age === null;
    setLoading1(isShell);
    setSel1(a);
    if (!isShell) setLoading1(false);
  };
  const pick2 = (a: CompareActress) => {
    const isShell = a.event_count === 0 && a.vote_count === 0 && a.age === null;
    setLoading2(isShell);
    setSel2(a);
    if (!isShell) setLoading2(false);
  };

  const rows: { label: string; v1: string; v2: string; best: 'a' | 'b' | 'tie' }[] = sel1 && sel2 ? [
    { label: '年齡', v1: getAgeDisplay(sel1), v2: getAgeDisplay(sel2), best: getBest(sel1.age, sel2.age, false) },
    { label: '身高', v1: sel1.height || '—', v2: sel2.height || '—', best: 'tie' },
    { label: '罩杯', v1: sel1.cup || '—', v2: sel2.cup || '—', best: 'tie' },
    { label: '三圍', v1: getBodyDisplay(sel1), v2: getBodyDisplay(sel2), best: 'tie' },
    { label: '星座', v1: sel1.zodiac || '—', v2: sel2.zodiac || '—', best: 'tie' },
    { label: '出道', v1: sel1.debut_year ? String(sel1.debut_year) : '—', v2: sel2.debut_year ? String(sel2.debut_year) : '—', best: 'tie' },
    { label: '2026活動', v1: String(sel1.year_2026_events), v2: String(sel2.year_2026_events), best: getBest(sel1.year_2026_events, sel2.year_2026_events, true) },
    { label: '總活動', v1: String(sel1.event_count), v2: String(sel2.event_count), best: getBest(sel1.event_count, sel2.event_count, true) },
    { label: '本月票數', v1: String(sel1.vote_count), v2: String(sel2.vote_count), best: getBest(sel1.vote_count, sel2.vote_count, true) },
    { label: '評分', v1: String(sel1.final_score), v2: String(sel2.final_score), best: getBest(sel1.final_score, sel2.final_score, true) },
    { label: '事務所', v1: sel1.agency || '—', v2: sel2.agency || '—', best: 'tie' },
    { label: '興趣', v1: sel1.hobby || '—', v2: sel2.hobby || '—', best: 'tie' },
  ] : [];

  function WinnerDot({ best, who }: { best: string; who: 'a' | 'b' }) {
    if (best !== who) return null;
    return <span className="ml-1 text-[10px]" style={{ color: 'rgb(var(--color-gold))' }}>★</span>;
  }

  return (
    <div className="min-h-screen bg-white text-[rgb(var(--color-umenezumi))]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[rgba(var(--color-sakura),0.5)] border-b border-[rgba(var(--color-sakura-gray),0.6)] px-4 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <Logo size={30} withText={false} />
          <Link href="/" className="text-[rgb(var(--color-nadeshiko-dark))] hover:text-[rgb(var(--color-nadeshiko))] text-sm">← 返回</Link>
          <h1 className="text-lg font-bold text-[rgb(var(--color-umenezumi))]">女優比較</h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <ComparePicker
            side="a"
            label="女優 A"
            selected={sel1}
            loadingDetail={loading1}
            onSelect={pick1}
            onClear={() => { setSel1(null); setLoading1(false); }}
          />
          <ComparePicker
            side="b"
            label="女優 B"
            selected={sel2}
            loadingDetail={loading2}
            onSelect={pick2}
            onClear={() => { setSel2(null); setLoading2(false); }}
          />
        </div>

        {/* Comparison Table */}
        {sel1 && sel2 && (
          <div className="bg-white rounded-xl border border-[rgba(var(--color-sakura-gray),0.6)] overflow-hidden">
            <div className="grid grid-cols-3 border-b border-[rgba(var(--color-sakura-gray),0.6)] bg-[rgba(var(--color-sakura),0.5)]">
              <div className="p-3 text-xs text-[rgb(var(--color-umenezumi-light))]">屬性</div>
              <div className="p-3 text-center">
                <Link href={`/actress/${sel1.id}`} className="text-[rgb(var(--color-nadeshiko-dark))] font-bold truncate block hover:underline">
                  {sel1.name_ja}
                </Link>
              </div>
              <div className="p-3 text-center">
                <Link href={`/actress/${sel2.id}`} className="text-[rgb(var(--color-kamenozoki-dark))] font-bold truncate block hover:underline">
                  {sel2.name_ja}
                </Link>
              </div>
            </div>
            {rows.map((row, i) => (
              <div key={i} className={`grid grid-cols-3 border-b border-[rgba(var(--color-sakura-gray),0.6)] last:border-0 ${i % 2 === 0 ? 'bg-white/30' : ''}`}>
                <div className="p-3 text-[rgb(var(--color-umenezumi-light))] text-sm">{row.label}</div>
                <div className={`p-3 text-center text-sm font-medium ${row.best === 'a' ? 'text-green-600' : 'text-[rgb(var(--color-umenezumi))]'}`}>
                  {row.v1}<WinnerDot best={row.best} who="a" />
                </div>
                <div className={`p-3 text-center text-sm font-medium ${row.best === 'b' ? 'text-[rgb(var(--color-kamenozoki-dark))]' : 'text-[rgb(var(--color-umenezumi))]'}`}>
                  {row.v2}<WinnerDot best={row.best} who="b" />
                </div>
              </div>
            ))}
          </div>
        )}

        {(!sel1 || !sel2) && (
          <div className="text-center py-16 text-[rgb(var(--color-umenezumi))]">
            <div className="text-4xl mb-4">⚖️</div>
            <p>選擇兩位女優比較</p>
            <p className="text-xs text-[rgb(var(--color-umenezumi-light))] mt-1">支援日文原名、假名、羅馬字同中文別名搜尋</p>
          </div>
        )}
      </main>
    </div>
  );
}
