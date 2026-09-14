import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronLeft, Mail, Send, MessageCircle, Camera } from 'lucide-react';

export const metadata: Metadata = {
  title: '廣告查詢 / 合作｜JCHING CALENDAR',
  description: 'JCHING CALENDAR 追星平台廣告贊助、品牌合作與活動推廣查詢',
  robots: { index: true, follow: true },
};

// 聯絡渠道（同 JavStarMeet 體系一致；需要改就改呢度）
const CONTACTS = [
  {
    icon: Mail,
    label: 'Email',
    value: 'javstarmeet@gmail.com',
    href: 'mailto:javstarmeet@gmail.com?subject=%E5%BB%A3%E5%91%8A%E6%9F%A5%E8%A9%A2%2F%E5%90%88%E4%BD%9C%20-%20JCHING%20CALENDAR',
  },
  {
    icon: Send,
    label: 'Telegram',
    value: '@javstarmeet',
    href: 'https://t.me/javstarmeet',
  },
  {
    icon: MessageCircle,
    label: 'WhatsApp',
    value: '+852 9571 3359',
    href: 'https://wa.me/85295713359',
  },
  {
    icon: Camera,
    label: 'Instagram',
    value: '@javstarmeet',
    href: 'https://instagram.com/javstarmeet',
  },
];

const PACKAGES = [
  {
    title: '首頁廣告位',
    desc: '主頁拍賣區／訂閱通知下精選 banner，觸及每日到站追星用戶。',
  },
  {
    title: '活動聯辦',
    desc: '日本／香港／台灣女優見面會、攝影會、OFF 會等活動曝光與售票合作。',
  },
  {
    title: '內容贊助',
    desc: '女優頁、活動月曆等位置嘅品牌贊助與定制推廣。',
  },
];

export default function ContactPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10 pb-28">
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-[rgb(var(--color-wine))] mb-6 transition-colors">
        <ChevronLeft className="w-4 h-4" /> 返回首頁
      </Link>

      <h1 className="text-2xl font-bold text-text-primary mb-2">廣告查詢 / 合作</h1>
      <p className="text-sm text-text-secondary mb-8 leading-relaxed">
        JCHING CALENDAR 係聚焦日港台女優活動嘅追星平台。歡迎品牌、主辦方同店家聯絡傾廣告贊助、活動聯辦同各種合作。
      </p>

      <div className="grid sm:grid-cols-3 gap-3 mb-8">
        {PACKAGES.map((p) => (
          <div key={p.title} className="rounded-2xl border border-[rgba(var(--color-sakura-gray),0.7)] bg-white p-4">
            <h2 className="text-sm font-bold text-text-primary mb-1">{p.title}</h2>
            <p className="text-xs text-text-tertiary leading-relaxed">{p.desc}</p>
          </div>
        ))}
      </div>

      <h2 className="text-base font-bold text-text-primary mb-3">聯絡我哋</h2>
      <div className="space-y-2.5">
        {CONTACTS.map((c) => {
          const Icon = c.icon;
          return (
            <a
              key={c.label}
              href={c.href}
              target={c.href.startsWith('mailto:') ? undefined : '_blank'}
              rel={c.href.startsWith('mailto:') ? undefined : 'noopener noreferrer'}
              className="flex items-center gap-3 rounded-xl border border-[rgba(var(--color-sakura-gray),0.7)] bg-white px-4 py-3 hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              <span className="w-9 h-9 shrink-0 rounded-lg bg-[rgba(var(--color-nadeshiko),0.15)] flex items-center justify-center text-[rgb(var(--color-nadeshiko-dark))]">
                <Icon className="w-4 h-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-xs text-text-tertiary">{c.label}</span>
                <span className="block text-sm font-semibold text-text-primary truncate">{c.value}</span>
              </span>
            </a>
          );
        })}
      </div>

      <p className="text-xs text-text-tertiary mt-8 leading-relaxed">
        查詢時請簡單講明：品牌／公司名、想推廣嘅產品或活動、目標檔期同預算。我哋會盡快回覆。
      </p>
    </main>
  );
}
