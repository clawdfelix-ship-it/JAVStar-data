import type { Metadata } from 'next';
import Image from 'next/image';
import { Bell, CalendarDays, MapPin, TicketCheck, ArrowRight, Sparkles } from 'lucide-react';
import MetaPixel from '@/components/MetaPixel';
import Logo from '@/components/Logo';
import InstagramIcon, { JCHING_INSTAGRAM_URL } from '@/components/InstagramIcon';
import PromoSubscribeForm from './PromoSubscribeForm';

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

function formatDate(iso: string) {
  const d = new Date(`${iso}T00:00:00+08:00`);
  const weekday = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()];
  return { md: `${d.getMonth() + 1}/${d.getDate()}`, weekday: `週${weekday}` };
}

// 純裝飾花瓣（無語意、aria-hidden），減速模式下由 CSS 停掉
const PETALS = [
  { left: '8%', size: 14, dur: 13, delay: 0, op: 0.5 },
  { left: '22%', size: 10, dur: 17, delay: 4, op: 0.35 },
  { left: '46%', size: 16, dur: 15, delay: 8, op: 0.45 },
  { left: '68%', size: 11, dur: 19, delay: 2, op: 0.4 },
  { left: '86%', size: 15, dur: 14, delay: 6, op: 0.5 },
  { left: '93%', size: 9, dur: 18, delay: 10, op: 0.32 },
];

export default async function PromoPage() {
  const events = await getUpcomingEvents();

  return (
    <main className="min-h-screen bg-white text-[rgb(var(--color-umenezumi))]">
      <MetaPixel />

      {/* SaaS 風落地頁 header：白底、單細邊線、品牌 mark */}
      <header className="sticky top-0 z-30 border-b border-[rgba(var(--color-sakura-gray),0.5)] bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5 md:px-8">
          <span className="flex items-center gap-2.5">
            <Logo size={32} withText={false} />
            <span className="leading-none">
              <span className="block text-base font-extrabold tracking-tight text-[#2F4053]">JCHING</span>
              <span className="mt-0.5 block text-[9px] font-light tracking-[0.22em] text-[#5b6b7c]">CALENDAR</span>
            </span>
          </span>
          <span className="flex items-center gap-1.5 text-xs font-medium text-[rgb(var(--color-umenezumi-light))]">
            <span aria-hidden>🇭🇰</span>
            <span aria-hidden>🇹🇼</span>
            <span className="ml-1 hidden sm:inline">港台活動週曆</span>
          </span>
        </div>
      </header>

      {/* 沉浸式 Hero：漸層櫻色底 + 柔光 blob + 花瓣，左文案右主視覺＋轉換卡 */}
      <section className="promo-hero-bg">
        <div className="promo-blob promo-blob-1" aria-hidden />
        <div className="promo-blob promo-blob-2" aria-hidden />
        {PETALS.map((p, i) => (
          <Sparkles
            key={i}
            aria-hidden
            className="promo-petal"
            style={{ left: p.left, width: p.size, height: p.size, animationDuration: `${p.dur}s`, animationDelay: `${p.delay}s`, opacity: p.op }}
          />
        ))}

        <div className="relative mx-auto grid max-w-5xl gap-12 px-5 pb-16 pt-14 md:grid-cols-[1.05fr_.95fr] md:items-center md:px-8 md:pb-24 md:pt-20">
          <div>
            <p className="promo-rise promo-rise-1 mb-4 inline-flex items-center gap-2 rounded-full border border-[rgba(var(--color-nadeshiko),0.3)] bg-white/70 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-[rgb(var(--color-nadeshiko-dark))] backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              Japan Star Event Calendar
            </p>
            <h1 className="promo-rise promo-rise-2 text-4xl font-black leading-[1.1] tracking-tight text-[#2F4053] md:text-6xl">
              港台日本女星活動
              <br />
              <span className="promo-gradient-text">一張週曆睇晒</span>
            </h1>
            <p className="promo-rise promo-rise-3 mt-5 max-w-lg text-base font-medium leading-relaxed text-[rgb(var(--color-umenezumi))] md:text-lg">
              攝影會、見面會、POP UP、寫真展，JCHING 中立整合港台公開活動資料，新場次第一時間經 Telegram 通知你。
            </p>

            {/* 真實 upcoming 活動（server fetch，ISR 每小時刷新）；無數據時唔渲染成塊 card */}
            {events.length > 0 && (
              <div className="promo-rise promo-rise-4 mt-9 overflow-hidden rounded-2xl border border-[rgba(var(--color-nadeshiko),0.18)] bg-white/85 shadow-[0_24px_60px_-28px_rgba(219,39,119,0.4)] backdrop-blur">
                <div className="flex items-center justify-between border-b border-[rgba(var(--color-sakura-gray),0.5)] px-5 py-3.5">
                  <span className="text-sm font-bold text-[#2F4053]">即將舉行</span>
                  <span className="flex items-center gap-1.5 text-[11px] font-medium text-[rgb(var(--color-umenezumi-lighter))]">
                    <span className="relative flex h-2 w-2" aria-hidden>
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[rgb(var(--color-nadeshiko))] opacity-60" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-[rgb(var(--color-nadeshiko-dark))]" />
                    </span>
                    每小時自動更新
                  </span>
                </div>
                {events.map((e) => {
                  const { md, weekday } = formatDate(e.date_iso as string);
                  const region =
                    (e.prefecture || '').includes('台') || (e.prefecture || '').includes('臺') ? '台北' : '香港';
                  const label = TYPE_LABEL[e.event_type || ''] || '活動';
                  return (
                    <div
                      key={e.id}
                      className="promo-event-row grid grid-cols-[3.4rem_minmax(0,1fr)_auto] items-center gap-3 border-b border-[rgba(var(--color-sakura-gray),0.35)] px-5 py-3.5 last:border-0"
                    >
                      <div className="leading-tight">
                        <div className="text-sm font-extrabold text-[#2F4053]">{md}</div>
                        <div className="text-[10px] font-medium text-[rgb(var(--color-umenezumi-lighter))]">{weekday}</div>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold leading-snug text-[rgb(var(--color-umenezumi))] [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical] overflow-hidden">{e.title}</p>
                        <p className="mt-0.5 truncate text-[11px] text-[rgb(var(--color-umenezumi-lighter))]">
                          {label}
                          {e.venue ? ` · ${e.venue}` : ''}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-md bg-[rgba(var(--color-nadeshiko),0.12)] px-2 py-1 text-[11px] font-bold text-[rgb(var(--color-nadeshiko-dark))]">
                        {region}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 右欄：浮動主視覺 + 玻璃轉換卡 */}
          <div className="promo-rise promo-rise-4 flex flex-col gap-6">
            <div className="promo-hero-frame overflow-hidden rounded-2xl border border-white/60">
              <Image
                src="/promo/hero-calendar.jpg"
                alt="俯視整潔工作枱：月曆、拍立得、櫻花花瓣同咖啡，象徵每週活動週曆整理"
                width={1280}
                height={720}
                priority
                sizes="(max-width: 768px) 100vw, 480px"
                className="h-auto w-full object-cover"
              />
            </div>

            <div className="promo-convert rounded-2xl p-7 md:p-8">
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-[rgba(var(--color-nadeshiko),0.12)] text-[rgb(var(--color-nadeshiko-dark))]">
                <Bell className="h-5 w-5" aria-hidden />
              </div>
              <h2 className="text-2xl font-black tracking-tight text-[#2F4053]">新活動，第一時間通知你</h2>
              <p className="mb-6 mt-2 text-sm leading-relaxed text-[rgb(var(--color-umenezumi-light))]">
                免費用 Telegram 訂閱，最新週曆同開票公佈直接送達，唔會錯過喜歡嘅場次。
              </p>
              <PromoSubscribeForm />
            </div>
          </div>
        </div>
      </section>

      {/* Features：非對稱 bento，首卡跨欄深粉做視覺重心，入場 stagger */}
      <section className="mx-auto max-w-5xl px-5 py-16 md:px-8 md:py-20">
        <div className="grid gap-5 md:grid-cols-2">
          {features.map(({ icon: Icon, title, text }, i) => {
            const riseClass = ['promo-rise-2', 'promo-rise-3', 'promo-rise-4'][i] ?? 'promo-rise-2';
            const isFeature = i === 0;
            return (
              <div
                key={title}
                className={`promo-rise ${riseClass} promo-bento p-7 ${isFeature ? 'promo-bento-feature md:col-span-2 md:flex md:items-center md:gap-6' : ''}`}
              >
                <span className="promo-bento-icon mb-4 md:mb-0 md:shrink-0">
                  <Icon className="h-6 w-6" aria-hidden />
                </span>
                <div>
                  <h3 className={`text-lg font-bold ${isFeature ? 'text-white' : 'text-[#2F4053]'}`}>{title}</h3>
                  <p className={`mt-2 text-sm leading-relaxed ${isFeature ? 'text-white/85' : 'text-[rgb(var(--color-umenezumi))]'}`}>
                    {text}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="promo-rise promo-rise-5 mt-12 flex justify-center">
          <a
            href="https://t.me/jching_calendar_bot"
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[rgb(var(--color-nadeshiko-strong))] to-[rgb(var(--color-nadeshiko-dark))] px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-pink-300/40 transition-all hover:shadow-pink-400/50 hover:scale-[1.03] active:scale-[0.98]"
          >
            立即 Telegram 訂閱
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
          </a>
        </div>
      </section>

      <footer className="border-t border-[rgba(var(--color-sakura-gray),0.5)] bg-[rgba(var(--color-sakura),0.4)] px-5 py-10 text-center text-xs text-[rgb(var(--color-umenezumi-lighter))]">
        <a
          href={JCHING_INSTAGRAM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-[rgba(var(--color-nadeshiko),0.35)] bg-white px-4 py-2 text-sm font-bold text-[rgb(var(--color-nadeshiko-dark))] transition-all hover:shadow-pink-400/30 hover:shadow-md active:scale-[0.98]"
        >
          <InstagramIcon className="h-4 w-4" />
          Instagram：@jching.calendar
        </a>
        <p>JCHING CALENDAR · 中立活動情報整理 · 資料以官方公佈為準</p>
      </footer>
    </main>
  );
}
