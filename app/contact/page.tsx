import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import ContactForm from '@/components/ContactForm';

export const metadata: Metadata = {
  title: '廣告查詢 / 合作｜JCHING CALENDAR',
  description: 'JCHING CALENDAR 追星平台廣告贊助、品牌合作與活動推廣查詢',
  robots: { index: true, follow: true },
};

const PACKAGES = [
  { title: '首頁廣告位', desc: '主頁精選 banner，觸及每日到站追星用戶。' },
  { title: '活動聯辦', desc: '日本／香港／台灣女優見面會、攝影會等活動曝光與售票合作。' },
  { title: '內容贊助', desc: '女優頁、活動月曆等位置嘅品牌贊助與定制推廣。' },
];

export default function ContactPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10 pb-28">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-[rgb(var(--color-wine))] mb-6 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" /> 返回首頁
      </Link>

      <h1 className="text-2xl font-bold text-text-primary mb-2">廣告查詢 / 合作</h1>
      <p className="text-sm text-text-secondary mb-6 leading-relaxed">
        JCHING CALENDAR 係聚焦日港台女優活動嘅追星平台。歡迎品牌、主辦方同店家傾廣告贊助、活動聯辦同各種合作。
      </p>

      <div className="grid sm:grid-cols-3 gap-3 mb-8">
        {PACKAGES.map((p) => (
          <div
            key={p.title}
            className="rounded-2xl border border-[rgba(var(--color-sakura-gray),0.7)] bg-white p-4"
          >
            <h2 className="text-sm font-bold text-text-primary mb-1">{p.title}</h2>
            <p className="text-xs text-text-tertiary leading-relaxed">{p.desc}</p>
          </div>
        ))}
      </div>

      <ContactForm />
    </main>
  );
}
