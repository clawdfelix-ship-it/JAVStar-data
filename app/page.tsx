'use client';

import { useState, useEffect } from 'react';
import ActressCard from '@/components/ActressCard';

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

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function HomePage() {
  const [actresses, setActresses] = useState<Actress[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchActresses();
  }, [page, search]);

  async function fetchActresses() {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });
      if (search) params.set('search', search);

      const response = await fetch(`/api/actresses?${params}`);
      if (!response.ok) throw new Error('Failed to fetch');
      
      const data = await response.json();
      setActresses(data.data || []);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      // Demo data with weighted scores
      setActresses([
        { id: 'demo1', name_ja: '河北彩伽', name_cn: null, avatar_url: null, age: 28, zodiac: 'うお座', cup: 'E', height: '158', bust: '85', waist: '58', hip: '86', agency: 'C-more', hobby: '料理', debut_year: 2021, event_count: 23, year_2026_events: 23, vote_count: 128, final_score: 37 },
        { id: 'demo2', name_ja: '成宮いろは', name_cn: null, avatar_url: null, age: 27, zodiac: '牡羊座', cup: 'D', height: '155', bust: '83', waist: '56', hip: '84', agency: null, hobby: '映画', debut_year: 2020, event_count: 19, year_2026_events: 19, vote_count: 95, final_score: 33 },
        { id: 'demo3', name_ja: '三上悠亜', name_cn: null, avatar_url: null, age: 32, zodiac: '射手座', cup: 'D', height: '163', bust: '86', waist: '60', hip: '88', agency: 'FALENO', hobby: 'KTV', debut_year: 2015, event_count: 14, year_2026_events: 14, vote_count: 82, final_score: 28 },
        { id: 'demo4', name_ja: '橋爪quet', name_cn: null, avatar_url: null, age: 25, zodiac: '双子座', cup: 'F', height: '165', bust: '88', waist: '58', hip: '87', agency: 'nine', hobby: null, debut_year: 2019, event_count: 12, year_2026_events: 12, vote_count: 67, final_score: 24 },
        { id: 'demo5', name_ja: '桜井るん', name_cn: null, avatar_url: null, age: 23, zodiac: '水瓶座', cup: 'C', height: '153', bust: '80', waist: '55', hip: '82', agency: 'SOD', hobby: '舞蹈', debut_year: 2022, event_count: 11, year_2026_events: 11, vote_count: 54, final_score: 22 },
      ]);
      setPagination({ page: 1, limit: 20, total: 5, totalPages: 1 });
    } finally {
      setLoading(false);
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchActresses();
  };

  return (
    <div className="min-h-screen bg-primary">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-secondary/95 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-japanese text-2xl font-bold bg-gradient-to-r from-accent to-pink-400 bg-clip-text text-transparent">
                AV Intelligence 🇭🇰
              </h1>
              <p className="text-text-secondary text-sm mt-1">
                日本 AV 女優情報平台｜香港粉絲優先
              </p>
            </div>
            
            {/* Search */}
            <form onSubmit={handleSearch} className="flex items-center gap-2">
              <div className="relative">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="搜尋女優..."
                  className="w-64 px-4 py-2 bg-primary border border-border rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:border-accent"
                />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary hover:text-accent"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              </div>
            </form>
          </div>
          
          {/* Last update time */}
          <div className="mt-3 text-text-secondary text-xs font-mono">
            最後更新: {new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })} JST
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats bar */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-secondary rounded-lg p-4 border border-border">
            <div className="text-text-secondary text-sm">女優總數</div>
            <div className="font-mono text-2xl font-bold text-accent mt-1">
              {pagination?.total || '-'}
            </div>
          </div>
          <div className="bg-secondary rounded-lg p-4 border border-border">
            <div className="text-text-secondary text-sm">2026年度活動</div>
            <div className="font-mono text-2xl font-bold text-success mt-1">
              {actresses.reduce((sum, a) => sum + a.year_2026_events, 0)}
            </div>
          </div>
          <div className="bg-secondary rounded-lg p-4 border border-border">
            <div className="text-text-secondary text-sm">總投票數</div>
            <div className="font-mono text-2xl font-bold text-yellow-400 mt-1">
              {actresses.reduce((sum, a) => sum + a.vote_count, 0)}
            </div>
          </div>
          <div className="bg-secondary rounded-lg p-4 border border-border">
            <div className="text-text-secondary text-sm">排名方式</div>
            <div className="font-mono text-lg text-text-primary mt-1">70%活動＋30%投票</div>
          </div>
        </div>

        {/* Ranking header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-japanese text-xl font-semibold text-text-primary">
            女優排名 <span className="text-text-secondary font-normal">(加權總分)</span>
          </h2>
          <div className="text-text-secondary text-sm">
            {loading ? '載入中...' : `${pagination?.total || 0} 位女優`}
          </div>
        </div>

        {/* Actress list */}
        {loading ? (
          <div className="grid gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-secondary rounded-lg p-4 border border-border">
                <div className="flex items-center gap-4">
                  <div className="skeleton w-10 h-10 rounded-full" />
                  <div className="flex-1">
                    <div className="skeleton h-5 w-32 mb-2" />
                    <div className="skeleton h-4 w-48" />
                  </div>
                  <div className="skeleton h-8 w-16" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-secondary rounded-lg p-8 border border-border text-center">
            <p className="text-accent mb-4">載入失敗: {error}</p>
            <button 
              onClick={() => fetchActresses()}
              className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/80"
            >
              重試
            </button>
          </div>
        ) : actresses.length === 0 ? (
          <div className="bg-secondary rounded-lg p-8 border border-border text-center">
            <p className="text-text-secondary">暫無資料</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {actresses.map((actress, index) => (
              <ActressCard
                key={actress.id}
                rank={(page - 1) * 20 + index + 1}
                {...actress}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-8">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-secondary border border-border rounded-lg text-text-primary disabled:opacity-50 hover:border-accent disabled:hover:border-border"
            >
              ← 上一頁
            </button>
            <span className="text-text-secondary px-4">
              第 {page} / {pagination.totalPages} 頁
            </span>
            <button
              onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
              disabled={page === pagination.totalPages}
              className="px-4 py-2 bg-secondary border border-border rounded-lg text-text-primary disabled:opacity-50 hover:border-accent disabled:hover:border-border"
            >
              下一頁 →
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-12">
        <div className="max-w-7xl mx-auto px-4 py-6 text-center text-text-secondary text-sm">
          <p>數據來源: <a href="https://www.minnano-av.com" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">minnano-av.com</a> + <a href="https://www.av-event.jp" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">av-event.jp</a></p>
          <p className="mt-2 text-text-secondary/70">AV Intelligence © 2026 | 僅供研究用途</p>
        </div>
      </footer>
    </div>
  );
}
