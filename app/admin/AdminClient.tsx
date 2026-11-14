'use client';

import { useEffect, useState } from 'react';
import { ShieldCheck, LogOut } from 'lucide-react';
import NewsAstryxPanel from './news-astryx/NewsAstryxPanel';
import PhotobooksAstryxPanel from './photobooks/PhotobooksAstryxPanel';
import EventSubmissionsAstryxPanel from './event-submissions/EventSubmissionsAstryxPanel';
import FansAstryxPanel from './fans/FansAstryxPanel';
import ContactAstryxPanel from './contact-messages/ContactAstryxPanel';
import FanPhotosAstryxPanel from './fan-photos/FanPhotosAstryxPanel';

type Section = 'news' | 'photobooks' | 'submissions' | 'fans' | 'contact' | 'fanphotos';

const SECTIONS: { key: Section; label: string }[] = [
  { key: 'news', label: '女優情報' },
  { key: 'photobooks', label: '寫真集' },
  { key: 'submissions', label: '活動報料' },
  { key: 'fanphotos', label: '粉絲相冊' },
  { key: 'fans', label: '粉絲' },
  { key: 'contact', label: '訊息' },
];

export default function UnifiedAdminClient() {
  const [token, setToken] = useState('');
  const [authed, setAuthed] = useState(false);
  const [section, setSection] = useState<Section>('news');

  useEffect(() => {
    const saved = sessionStorage.getItem('admin_token') || '';
    if (saved) {
      setToken(saved);
      setAuthed(true);
    }
  }, []);

  function login() {
    if (token.trim()) {
      sessionStorage.setItem('admin_token', token.trim());
      setAuthed(true);
    }
  }
  function logout() {
    sessionStorage.removeItem('admin_token');
    setToken('');
    setAuthed(false);
  }

  if (!authed) {
    return (
      <main className="mx-auto max-w-md px-4 py-16">
        <div className="rounded-2xl border bg-white p-6">
          <h1 className="mb-1 flex items-center gap-2 text-lg font-bold">
            <ShieldCheck className="h-5 w-5 text-pink-600" /> JCHING 統一管理後台
          </h1>
          <p className="mb-4 text-xs text-text-tertiary">女優情報 ＋ 寫真集審批，一次登入。</p>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && login()}
            placeholder="admin token"
            className="mb-3 min-h-[44px] w-full rounded-xl border px-3 text-sm"
          />
          <button onClick={login} className="min-h-[44px] w-full rounded-xl bg-pink-600 text-sm font-bold text-white">
            登入
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 pb-24">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-lg font-bold">
          <ShieldCheck className="h-5 w-5 text-pink-600" /> JCHING 管理後台
        </h1>
        <button onClick={logout} className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs text-text-tertiary hover:bg-gray-50">
          <LogOut className="h-3.5 w-3.5" /> 登出
        </button>
      </div>

      <div className="mb-4 flex gap-1.5 overflow-x-auto rounded-xl bg-gray-100 p-1 scrollbar-hide">
        {SECTIONS.map((s) => (
          <button
            key={s.key}
            onClick={() => setSection(s.key)}
            className={`shrink-0 flex-1 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
              section === s.key ? 'bg-white text-pink-600 shadow-sm' : 'text-text-secondary'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {section === 'news' && <NewsAstryxPanel embeddedToken={token} />}
      {section === 'photobooks' && <PhotobooksAstryxPanel embeddedToken={token} />}
      {section === 'submissions' && <EventSubmissionsAstryxPanel embeddedToken={token} />}
      {section === 'fanphotos' && <FanPhotosAstryxPanel embeddedToken={token} />}
      {section === 'fans' && <FansAstryxPanel embeddedToken={token} />}
      {section === 'contact' && <ContactAstryxPanel embeddedToken={token} />}
    </main>
  );
}
