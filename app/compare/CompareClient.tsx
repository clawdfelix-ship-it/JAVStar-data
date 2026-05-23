'use client';

import { useState, useMemo } from 'react';

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
  debut_date: string | null;
  event_count: number;
  year_2026_events: number;
  vote_count: number;
  final_score: number;
}

export default function CompareClient() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [allActresses, setAllActresses] = useState<Actress[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);

  const fetchAllActresses = async () => {
    if (allActresses.length > 0 || dataLoaded) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/actresses?page=1&limit=500&sort=final_score');
      const data = await response.json();
      if (response.ok) {
        setAllActresses(data.data || []);
        setDataLoaded(true);
      } else {
        throw new Error(data.error || 'Failed to fetch actresses');
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  const filteredActresses = useMemo(() => {
    if (!searchQuery.trim() || searchQuery.length < 1) {
      return allActresses.slice(0, 20);
    }
    const query = searchQuery.toLowerCase();
    return allActresses
      .filter(a =>
        a.name_ja.toLowerCase().includes(query) ||
        (a.name_cn && a.name_cn.toLowerCase().includes(query))
      )
      .slice(0, 20);
  }, [allActresses, searchQuery]);

  const selectedActresses = useMemo(() => {
    return selectedIds
      .map(id => allActresses.find(a => a.id === id))
      .filter((a): a is Actress => a !== undefined);
  }, [selectedIds, allActresses]);

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(i => i !== id);
      }
      if (prev.length >= 3) {
        return [...prev.slice(1), id];
      }
      return [...prev, id];
    });
  };

  const removeSelection = (id: string) => {
    setSelectedIds(prev => prev.filter(i => i !== id));
  };

  const clearAll = () => {
    setSelectedIds([]);
    setSearchQuery('');
  };

  const getAgeDisplay = (actress: Actress) => {
    if (actress.age) return `${actress.age}歳`;
    if (actress.debut_year) {
      const yearsActive = 2026 - actress.debut_year;
      if (yearsActive <= 0) return null;
      return `約${20 + yearsActive}歳`;
    }
    return null;
  };

  const getBodyDisplay = (actress: Actress) => {
    const parts = [];
    if (actress.bust) parts.push(`B${actress.bust}`);
    if (actress.waist) parts.push(`W${actress.waist}`);
    if (actress.hip) parts.push(`H${actress.hip}`);
    return parts.length > 0 ? parts.join(' / ') : null;
  };

  const comparisonFields = [
    { key: 'name_ja', label: '名字（日）', type: 'text' as const },
    { key: 'name_cn', label: '名字（中）', type: 'text' as const },
    { key: 'age', label: '年齡', type: 'age' as const },
    { key: 'zodiac', label: '星座', type: 'text' as const },
    { key: 'height', label: '身高', type: 'text' as const },
    { key: 'cup', label: '罩杯', type: 'text' as const },
    { key: 'body', label: '身材', type: 'body' as const },
    { key: 'debut_year', label: '出道年份', type: 'text' as const },
    { key: 'event_count', label: '2026活動', type: 'number' as const },
    { key: 'vote_count', label: '投票數', type: 'number' as const },
    { key: 'final_score', label: '綜合評分', type: 'number' as const },
  ];

  const getHighestKeys = () => {
    const keys: string[] = [];
    ['event_count', 'vote_count', 'final_score'].forEach(k => {
      const values = selectedActresses.map(a => a[k as keyof Actress] as number || 0);
      const maxVal = Math.max(...values);
      if (maxVal > 0) keys.push(k);
    });
    return keys;
  };

  const highestKeys = getHighestKeys();

  return (
    <div className="min-h-screen bg-bg-secondary">
      <section className="relative overflow-hidden fdb-hero-gradient py-12 md:py-16">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-nadeshiko-light/40 to-kamenozoki/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-gradient-to-tr from-nadeshiko-light/30 to-transparent rounded-full blur-3xl translate-y-1/2 -translate-x-1/3" />
        <div className="relative max-w-7xl mx-auto px-4 md:px-6">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-nadeshiko-light/30 border border-nadeshiko/30 rounded-full mb-6">
              <span className="text-nadeshiko-dark font-semibold text-sm">⚖️ 女優比較工具</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-text-primary mb-4 font-japanese">
              女優<span className="text-transparent bg-clip-text bg-gradient-to-r from-nadeshiko-dark to-nadeshiko">比較</span>
            </h1>
            <p className="text-lg text-text-secondary max-w-2xl mx-auto">
              揀選 2-3 位女優，比較佢哋嘅活動記錄、投票數、出道年份等資料
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
              {selectedActresses.map((actress, index) => (
                <div key={actress.id} className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-nadeshiko rounded-full shadow-md">
                  <span className="text-xs text-text-tertiary font-mono">#{index + 1}</span>
                  <span className="font-japanese font-bold text-text-primary">{actress.name_ja}</span>
                  {actress.name_cn && <span className="text-xs text-text-secondary">{actress.name_cn}</span>}
                  <button onClick={() => removeSelection(actress.id)} className="ml-2 w-5 h-5 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-text-tertiary text-xs transition-colors">✕</button>
                </div>
              ))}
              {selectedActresses.length > 0 && (
                <button onClick={clearAll} className="px-3 py-2 text-sm text-text-tertiary hover:text-danger transition-colors">清除全部</button>
              )}
            </div>

            <div className="relative max-w-xl mx-auto">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <span className="text-text-tertiary text-xl">🔍</span>
              </div>
              <input
                type="text"
                placeholder="搜尋女優名字..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={fetchAllActresses}
                className="w-full pl-12 pr-4 py-4 text-lg bg-white border-2 border-border rounded-2xl shadow-sm focus:border-nadeshiko focus:ring-4 focus:ring-nadeshiko-light/30 focus:outline-none transition-all placeholder:text-text-tertiary"
              />
            </div>

            {searchQuery && (
              <div className="relative max-w-xl mx-auto mt-2 z-50">
                <div className="absolute inset-x-0 top-0 bg-white border-2 border-border rounded-2xl shadow-xl max-h-80 overflow-y-auto">
                  {loading ? (
                    <div className="p-4 text-center text-text-secondary"><span className="animate-pulse">載入中...</span></div>
                  ) : error ? (
                    <div className="p-4 text-center text-danger">{error}</div>
                  ) : filteredActresses.length === 0 ? (
                    <div className="p-4 text-center text-text-secondary">搵唔到符合「{searchQuery}」嘅女優</div>
                  ) : (
                    <div className="divide-y divide-border">
                      {filteredActresses.map((actress) => {
                        const isSelected = selectedIds.includes(actress.id);
                        return (
                          <button key={actress.id} onClick={() => toggleSelection(actress.id)} className={`w-full flex items-center gap-3 p-4 hover:bg-pink-50 transition-colors text-left ${isSelected ? 'bg-pink-50 border-l-4 border-nadeshiko' : ''}`}>
                            <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-pink-100 to-blue-100 flex-shrink-0">
                              {actress.avatar_url ? (
                                <img src={actress.avatar_url} alt={actress.name_ja} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-xl font-bold text-pink-300">{actress.name_ja[0]}</div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-japanese font-bold text-text-primary truncate">{actress.name_ja}</div>
                              {actress.name_cn && <div className="text-sm text-text-secondary truncate">{actress.name_cn}</div>}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-text-tertiary flex-shrink-0">
                              <span className="px-2 py-1 bg-emerald-50 rounded text-emerald-600 font-medium">{actress.year_2026_events} 活動</span>
                              <span className="px-2 py-1 bg-amber-50 rounded text-amber-600 font-medium">{actress.vote_count} 票</span>
                              {isSelected && <span className="text-nadeshiko-dark font-bold">✓ 已選擇</span>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {selectedActresses.length < 2 && !searchQuery && (
              <p className="text-center text-text-tertiary text-sm mt-6">👆 搜尋並選擇至少 2 位女優進行比較（最多 3 位）</p>
            )}
          </div>
        </div>
      </section>

      {selectedActresses.length >= 2 && (
        <section className="max-w-7xl mx-auto px-4 md:px-6 py-12">
          <h2 className="text-2xl font-bold text-text-primary font-japanese mb-8 flex items-center gap-2">
            <span className="text-nadeshiko-dark">📊</span>比較結果
          </h2>

          <div className="bg-white rounded-2xl border border-border shadow-lg overflow-hidden">
            <div className="grid bg-gradient-to-r from-pink-100 to-blue-100" style={{ gridTemplateColumns: `180px repeat(${selectedActresses.length}, 1fr)` }}>
              <div className="p-4 font-bold text-text-primary text-sm">項目</div>
              {selectedActresses.map((actress) => (
                <div key={actress.id} className="p-4 text-center">
                  <div className="w-16 h-16 mx-auto mb-2 rounded-full overflow-hidden bg-gradient-to-br from-pink-100 to-blue-100 shadow-md">
                    {actress.avatar_url ? (
                      <img src={actress.avatar_url} alt={actress.name_ja} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-pink-300">{actress.name_ja[0]}</div>
                    )}
                  </div>
                  <div className="font-japanese font-bold text-text-primary truncate">{actress.name_ja}</div>
                  {actress.name_cn && <div className="text-xs text-text-secondary truncate">{actress.name_cn}</div>}
                </div>
              ))}
            </div>

            {comparisonFields.map((field) => (
              <div key={field.key} className="grid border-t border-border hover:bg-pink-50/30 transition-colors" style={{ gridTemplateColumns: `180px repeat(${selectedActresses.length}, 1fr)` }}>
                <div className="p-4 font-semibold text-text-secondary text-sm flex items-center">{field.label}</div>
                {selectedActresses.map((actress) => {
                  let displayValue = '-';
                  let isHighest = false;

                  switch (field.type) {
                    case 'age': { const val = getAgeDisplay(actress); displayValue = val || '-'; break; }
                    case 'body': { const val = getBodyDisplay(actress); displayValue = val || '-'; break; }
                    case 'number': {
                      const numValue = actress[field.key as keyof Actress] as number;
                      displayValue = (numValue || 0).toLocaleString();
                      const values = selectedActresses.map(a => a[field.key as keyof Actress] as number || 0);
                      const maxVal = Math.max(...values);
                      isHighest = numValue === maxVal && maxVal > 0 && highestKeys.includes(field.key);
                      break;
                    }
                    default: { const val = actress[field.key as keyof Actress]; displayValue = val != null ? String(val) : '-'; }
                  }

                  return (
                    <div key={actress.id} className={`p-4 text-center flex items-center justify-center ${isHighest ? 'bg-amber-50' : ''}`}>
                      {isHighest && <span className="inline-block px-2 py-1 bg-amber-400 text-white text-xs rounded-full mr-2 font-bold">TOP</span>}
                      <span className={`font-medium ${field.type === 'number' ? 'text-lg font-bold font-mono' : 'text-text-primary'} ${isHighest ? 'text-amber-600' : ''}`}>{displayValue}</span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            {selectedActresses.map((actress) => {
              const isTopEvent = highestKeys.includes('event_count') && actress.event_count === Math.max(...selectedActresses.map(a => a.event_count));
              const isTopVote = highestKeys.includes('vote_count') && actress.vote_count === Math.max(...selectedActresses.map(a => a.vote_count));
              const isTopScore = highestKeys.includes('final_score') && actress.final_score === Math.max(...selectedActresses.map(a => a.final_score));
              return (
                <div key={actress.id} className="fdb-card p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-pink-100 to-blue-100">
                      {actress.avatar_url ? (
                        <img src={actress.avatar_url} alt={actress.name_ja} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xl font-bold text-pink-300">{actress.name_ja[0]}</div>
                      )}
                    </div>
                    <div>
                      <div className="font-japanese font-bold text-text-primary">{actress.name_ja}</div>
                      {actress.name_cn && <div className="text-xs text-text-secondary">{actress.name_cn}</div>}
                    </div>
                  </div>
                  <div className="space-y-2">
                    {isTopEvent && <div className="px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-sm font-medium">🏆 2026活動最多</div>}
                    {isTopVote && <div className="px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm font-medium">❤️ 投票數最高</div>}
                    {isTopScore && <div className="px-3 py-2 bg-pink-50 border border-pink-200 rounded-lg text-pink-700 text-sm font-medium">⭐ 綜合評分最高</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-border mt-16">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 text-center">
          <p className="text-sm text-text-tertiary">© 2026 JAVStar-data. Made with ❤️ in Hong Kong.</p>
        </div>
      </footer>
    </div>
  );
}
