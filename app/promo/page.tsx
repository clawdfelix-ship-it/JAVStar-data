import type { Metadata } from 'next';
import Image from 'next/image';
import { Bell, CalendarDays, MapPin, TicketCheck, ArrowRight, Sparkles, ArrowUpRight } from 'lucide-react';
import MetaPixel from '@/components/MetaPixel';
import Logo from '@/components/Logo';
import InstagramIcon, { JCHING_INSTAGRAM_URL } from '@/components/InstagramIcon';
import PromoSubscribeForm from './PromoSubscribeForm';
import EventStackSwitcher from '@/components/EventStackSwitcher';

export const metadata: Metadata = {
  title: '港台日本女星活動週曆｜JCHING',
  description: 'JCHING 每週整合香港同台北日本女星攝影會、見面會、POP UP 同寫真展資料。免費 Telegram 訂閱新活動通知。',
  robots: { index: false, follow: false },
};

const features = [
  { icon: CalendarDays, title: '每週更新', text: '香港同台灣活動按日期排清，一頁掌握最新安排。' },
  { icon: MapPin, title: '資料一目了然', text: '日期、時間、場地同活動類型集中整理。' },
  { icon: TicketCheck, title: '票券資訊清晰', text: '以官方公佈為依據，減少四圍搵資料嘅時間。' },
];

const TYPE_LABEL: Record<string, string> = {
  meet: '見面會',
  photo: '攝影會',
  off: 'OFF 會',
  offkai: 'OFF 會',
  flash: '快閃活動',
  other: '活動',
  dvd: '活動',
};

interface ApiEvent {
  id: string;
  title: string;
  date_iso: string | null;
  prefecture: string | null;
  venue: string | null;
  event_type: string | null;
}

async function getUpcomingEvents(): Promise<ApiEvent[]> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.jching-calendar.com';
  try {
    const [hk, tw] = await Promise.all([
      fetch(`${base}/api/events?region=hk&limit=20`, { next: { revalidate: 3600 } }),
      fetch(`${base}/api/events?region=taiwan&limit=20`, { next: { revalidate: 3600 } }),
    ]);
    if (!hk.ok || !tw.ok) return [];
    const hkJson = await hk.json();
    const twJson = await tw.json();
    const all: ApiEvent[] = [...(hkJson.data || []), ...(twJson.data || [])];
    const seen = new Set<string>();
    return all
      .filter((e) => e.date_iso && !seen.has(e.id) && seen.add(e.id))
      .sort((a, b) => String(a.date_iso).localeCompare(String(b.date_iso)))
      .slice(0, 4);
  } catch {
    return [];
  }
}

// EverGreen 排版：全屏暗色 hero、浮動玻璃 nav、hero 下沿白色浮卡（活動＋訂閱）、
// 淺灰 features、深色 CTA。保留現有資料來源同轉換邏輯。
export default async function PromoPage() {
  const events = await getUpcomingEvents();

  return (
    <main className="min-h-screen bg-[#F2F2F2] text-[#0F0F09]">
      <MetaPixel />

      {/* ── Hero：全屏圖＋暗色漸層，nav 浮喺上面 ───────────────────── */}
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <Image
            src="/promo/hero-calendar.jpg"
            alt="整潔工作枱上嘅月曆、拍立得同咖啡，象徵每週活動週曆整理"
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/45 to-black/70" />
        </div>

        {/* 浮動玻璃 nav：左 brand／中膠囊 menu／右 CTA（mobile 藏 menu） */}
        <header className="absolute inset-x-0 top-0 z-30">
          <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-5 md:px-8">
            <span className="flex items-center gap-2.5 text-white">
              <Logo size={32} withText={false} />
              <span className="leading-none">
                <span className="block text-base font-extrabold tracking-tight">JCHING</span>
                <span className="mt-0.5 block text-[9px] font-light tracking-[0.22em] text-white/70">CALENDAR</span>
              </span>
            </span>

            <nav className="hidden items-center gap-1 rounded-full border border-white/15 bg-white/10 p-1.5 backdrop-blur-md md:flex" aria-label="頁面導覽">
              {['首頁', '週曆', '訂閱'].map((label, i) => (
                <a
                  key={label}
                  href={['#top', 'https://www.jching-calendar.com', '#subscribe'][i]}
                  className={
                    i === 0
                      ? 'rounded-full bg-white px-5 py-2 text-xs font-bold text-black'
                      : 'rounded-full px-5 py-2 text-xs font-semibold text-white/90 transition hover:bg-white/10'
                  }
                >
                  {label}
                </a>
              ))}
            </nav>

            <a
              href="#subscribe"
              className="inline-flex items-center gap-1.5 rounded-full bg-[#C4CEB8] px-5 py-2.5 text-xs font-bold text-[#1c2415] transition hover:bg-[#b4c0a4]"
            >
              <Bell className="h-3.5 w-3.5" aria-hidden />
              立即訂閱
            </a>
          </div>
        </header>

        {/* Hero 文案：左對齊標籤＋大標＋副文；留白撐位畀下沿浮卡 */}
        <div id="top" className="mx-auto max-w-6xl px-5 pb-56 pt-40 md:px-8 md:pb-64 md:pt-48">
          <div className="max-w-3xl">
            <ul className="promo-rise promo-rise-1 mb-6 flex flex-wrap gap-2.5">
              {['攝影會', '見面會', 'POP UP', '寫真展'].map((tag) => (
                <li key={tag} className="rounded-full bg-white px-4 py-1.5 text-[11px] font-bold text-black/80">
                  {tag}
                </li>
              ))}
            </ul>
            <h1 className="promo-rise promo-rise-2 text-4xl font-semibold leading-[1.12] tracking-tight text-white md:text-6xl">
              港台日本女星活動，
              <br />
              一張週曆即時睇晒。
            </h1>
            <p className="promo-rise promo-rise-3 mt-6 max-w-xl text-base font-medium leading-relaxed text-white/80 md:text-lg">
              JCHING 中立整合港台公開活動資料，新場次同開票公佈第一時間經 Telegram 通知你，唔使四圍搵。
            </p>
          </div>
        </div>

        {/* ── 白色浮卡：疊住 hero 下沿，左活動 stack／右訂閱 ─────── */}
        <div className="absolute inset-x-0 bottom-0 z-20 translate-y-1/2 px-5 md:px-8">
          <div className="mx-auto grid max-w-6xl gap-0 overflow-hidden rounded-3xl bg-white shadow-[0_40px_90px_-32px_rgba(0,0,0,0.55)] md:grid-cols-[1.15fr_.85fr]">
            {/* 左：即將活動 */}
            <div className="border-b border-black/5 p-7 md:border-b-0 md:border-r md:p-9">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-lg font-bold">睇吓即將舉行</h2>
                <a
                  href="https://www.jching-calendar.com"
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#585E5F] transition hover:text-black"
                >
                  完整週曆
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                </a>
              </div>
              {events.length > 0 ? (
                <EventStackSwitcher events={events} typeLabels={TYPE_LABEL} />
              ) : (
                <p className="py-8 text-sm text-[#585E5F]">活動資料更新中，請稍後再試。</p>
              )}
            </div>

            {/* 右：訂閱 */}
            <div id="subscribe" className="scroll-mt-28 bg-[#F7F7F3] p-7 md:p-9">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#C4CEB8] text-[#1c2415]">
                <Bell className="h-5 w-5" aria-hidden />
              </div>
              <h2 className="text-xl font-bold tracking-tight">新活動，第一時間通知你</h2>
              <p className="mb-6 mt-2 text-sm leading-relaxed text-[#585E5F]">
                免費 Telegram 訂閱，最新週曆同開票公佈直接送達。
              </p>
              <PromoSubscribeForm />
            </div>
          </div>
        </div>
      </section>

      {/* ── Features：淺灰底，要預留浮卡高度 ───────────────────────── */}
      <section className="px-5 pb-20 pt-52 md:px-8 md:pb-24 md:pt-64">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 max-w-xl">
            <p className="mb-3 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#8D7658]">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              Why JCHING
            </p>
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">活動資料，唔使再四周圍搵</h2>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {features.map(({ icon: Icon, title, text }, i) => (
              <div
                key={title}
                className="group rounded-3xl border border-black/5 bg-white p-8 transition hover:-translate-y-1 hover:shadow-[0_30px_60px_-30px_rgba(0,0,0,0.35)]"
              >
                <span className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EDF0E6] text-[#453F22] transition group-hover:bg-[#C4CEB8]">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <h3 className="text-lg font-bold">{title}</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-[#585E5F]">{text}</p>
                <span className="mt-6 inline-flex items-center gap-1 text-xs font-bold text-[#8D7658]">
                  0{i + 1}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 深色 CTA ───────────────────────────────────────────────── */}
      <section className="px-5 pb-20 md:px-8">
        <div className="mx-auto max-w-6xl overflow-hidden rounded-3xl bg-[#0F0F09] px-8 py-16 text-center md:px-16 md:py-20">
          <h2 className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight text-white md:text-4xl">
            下次開票，唔好再後知後覺
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-white/60 md:text-base">
            免費訂閱 JCHING Telegram，港台日本女星活動週曆每週自動送到。
          </p>
          <div className="mt-9 flex justify-center">
            <a
              href="https://t.me/jching_calendar_bot"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2 rounded-full bg-[#C4CEB8] px-8 py-3.5 text-sm font-bold text-[#1c2415] transition hover:bg-[#d3dcc8]"
            >
              立即 Telegram 訂閱
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
            </a>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <footer className="border-t border-black/5 px-5 py-12 text-center text-xs text-[#585E5F] md:px-8">
        <a
          href={JCHING_INSTAGRAM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-bold text-black transition hover:shadow-md"
        >
          <InstagramIcon className="h-4 w-4" />
          Instagram：@jching.calendar
        </a>
        <p>JCHING CALENDAR · 中立活動情報整理 · 資料以官方公佈為準</p>
      </footer>
    </main>
  );
}
