import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: '使用條款｜J-STAR CALENDAR',
  robots: { index: false, follow: true },
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10 pb-28">
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-[rgb(var(--color-wine))] mb-6 transition-colors">
        <ChevronLeft className="w-4 h-4" /> 返回首頁
      </Link>
      <h1 className="text-2xl font-bold text-text-primary mb-2">使用條款</h1>
      <p className="text-xs text-text-tertiary mb-8">最後更新：2026 年 9 月 10 日</p>

      <div className="prose prose-sm max-w-none text-text-secondary leading-relaxed space-y-6 [&>section]:space-y-2">
        <section>
          <h2 className="text-base font-bold text-text-primary">1. 年齡限制</h2>
          <p>
            本網站（J-STAR CALENDAR）收錄日本成人影視業相關女優之活動、見面會、攝影會等公開情報，
            <strong>僅供年滿 18 歲人士瀏覽</strong>。進入網站即表示你聲明及保證你已年滿 18 歲，
            並符合你所在地區瀏覽相關內容嘅法定年齡要求。未滿 18 歲人士請立即離開。
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-text-primary">2. 服務性質</h2>
          <p>
            本網站屬<strong>資訊整合平台</strong>，只提供活動情報查詢、排名及通知功能，
            <strong>不上載、不提供、不分發任何成人影片或露骨內容</strong>。活動由第三方主辦，
            本網站並非主辦方、承辦方或授權票務代理；活動日期、地點、票務及內容以主辦方官方公布為準。
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-text-primary">3. 資料來源與準確性</h2>
          <p>
            本站資料整理自 minnano-av.com、av-event.jp 等公開來源，並盡力確保準確及適時更新，
            惟<strong>唔保證所有資料絕對正確、完整或及時</strong>。因資料錯誤、延誤或活動變動所引致嘅任何損失，本站概不負責。
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-text-primary">4. 連結至第三方網站</h2>
          <p>
            網站內部分連結指向第三方網站（包括但不限於主辦方、票務及購物平台）。
            該等網站嘅內容、產品、收費及私隱做法均由第三方自行負責，本站無法控制，亦不承擔任何責任。
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-text-primary">5. 禁止行為</h2>
          <p>你同意唔會：</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>利用本站從事任何違反香港法例或你所在地法例嘅行為；</li>
            <li>對本站進行未經授權嘅資料擷取、攻擊、干擾，或企圖破壞系統正常運作；</li>
            <li>將本站資料用於誹謗、騷擾、侵犯他人權利等用途。</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-text-primary">6. 知識產權</h2>
          <p>
            女優姓名、肖像及活動資料之知識產權歸相關權利人所有。本站界面之原創排版及程式碼由本站擁有，
            未經授權不得複製或轉載。
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-text-primary">7. 免責聲明</h2>
          <p>
            本站按「現狀」提供服務。在適用法律容許嘅最大範圍內，本站就你使用或無法使用本站所引致嘅任何直接或間接損失，
            概不承擔責任。
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-text-primary">8. 條款修訂</h2>
          <p>本站可不時修訂本條款，修訂後嘅條款於本頁公布即生效。繼續使用本站即表示你接受修訂。</p>
        </section>
      </div>

      <p className="mt-10 text-xs text-text-tertiary">
        如有查詢，可透過本站 Instagram / Telegram 聯絡我們。
      </p>
    </main>
  );
}
