import type { Metadata } from 'next';
import { Bell, CalendarDays, MapPin, TicketCheck } from 'lucide-react';
import MetaPixel from '@/components/MetaPixel';
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

export default function PromoPage() {
  return (
    <main className="min-h-screen bg-[#f5efe4] text-[#1c1a17]">
      <MetaPixel />
      <header className="border-b border-[#c9a24b]/30">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 md:px-10">
          <div className="font-black tracking-[0.18em]">JCHING</div>
          <div className="text-xs font-semibold tracking-wide text-[#6f675c]">香港 · 台北｜每週更新</div>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-10 px-5 py-10 md:grid-cols-[1.15fr_.85fr] md:items-center md:gap-14 md:px-10 md:py-16">
        <div>
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-[#785b1d]">JAPAN STAR EVENT CALENDAR</p>
          <h1 className="max-w-2xl text-4xl font-black leading-[1.08] tracking-tight md:text-6xl">日本女星活動，<br />一張週曆睇晒</h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-[#5f574d]">攝影會、見面會、POP UP、寫真展——JCHING 中立整合港台公開活動資料，等你唔再錯過喜歡嘅活動。</p>

          <div className="mt-8 overflow-hidden rounded-lg border border-[#c9a24b]/40 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-[#c9a24b]/20 px-5 py-4">
              <span className="font-bold">本週活動一覽</span>
              <span className="text-xs font-semibold text-[#785b1d]">持續更新</span>
            </div>
            {[
              ['FRI', '粉絲見面會', '香港'],
              ['SAT', '攝影會 · POP UP', '香港'],
              ['SUN', '寫真展 · 見面會', '台北'],
            ].map(([day, event, region]) => (
              <div key={day} className="grid grid-cols-[3rem_1fr_auto] items-center gap-3 border-b border-[#c9a24b]/10 px-5 py-4 last:border-0">
                <span className="text-xs font-black tracking-wider text-[#a8842f]">{day}</span>
                <span className="font-semibold">{event}</span>
                <span className="text-sm text-[#6f675c]">{region}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-[#c9a24b]/50 bg-white p-6 shadow-[0_16px_50px_rgba(91,67,25,.10)] md:p-8">
          <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-lg bg-[#f5efe4] text-[#a8842f]">
            <Bell className="h-5 w-5" aria-hidden />
          </div>
          <h2 className="text-2xl font-black">新活動，第一時間通知你</h2>
          <p className="mb-6 mt-2 text-sm leading-relaxed text-[#6f675c]">免費訂閱，最新週曆同活動公佈直接送到你 Telegram。</p>
          <PromoSubscribeForm />
        </div>
      </section>

      <section className="border-t border-[#c9a24b]/30 bg-white/50">
        <div className="mx-auto grid max-w-6xl gap-4 px-5 py-10 md:grid-cols-3 md:px-10">
          {features.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-lg border border-[#c9a24b]/25 bg-white p-5">
              <Icon className="mb-3 h-5 w-5 text-[#a8842f]" aria-hidden />
              <h3 className="font-bold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#6f675c]">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="px-5 py-6 text-center text-xs text-[#6f675c]">JCHING CALENDAR · 中立活動情報整理 · 資料以官方公佈為準</footer>
    </main>
  );
}
