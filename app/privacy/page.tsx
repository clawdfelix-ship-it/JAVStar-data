import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '私隱政策｜J-STAR CALENDAR',
  robots: { index: false, follow: true },
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10 pb-28">
      <h1 className="text-2xl font-bold text-text-primary mb-2">私隱政策</h1>
      <p className="text-xs text-text-tertiary mb-8">最後更新：2026 年 9 月 10 日</p>

      <div className="prose prose-sm max-w-none text-text-secondary leading-relaxed space-y-6 [&>section]:space-y-2">
        <section>
          <h2 className="text-base font-bold text-text-primary">1. 我哋收集嘅資料</h2>
          <p>本網站以匿名瀏覽為主，<strong>無需登記即可使用</strong>。我哋只會喺你自願使用以下功能時收集有限資料：</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Email 訂閱</strong>：你主動提交嘅 email 地址，用作發送活動通知；</li>
            <li><strong>投票／互動功能</strong>：喺你瀏覽器儲存嘅本地偏好（localStorage），唔會連結你嘅真實身份；</li>
            <li><strong>年齡確認</strong>：只記低你當日已確認嘅狀態（本地瀏覽器儲存，每日還原），唔會記錄你嘅個人資料。</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-text-primary">2. 資料用途</h2>
          <p>收集嘅資料僅用於：提供活動情報及通知服務、維持網站基本運作、防止濫用。我哋<strong>唔會出售</strong>你嘅個人資料。</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-text-primary">3. Cookies 及本地儲存</h2>
          <p>
            本站使用 localStorage 記住年齡確認狀態同投票偏好，以便提供基本功能。
            你可以隨時透過清除瀏覽器資料刪除呢啲記錄，刪除後年齡閘門會再次顯示。
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-text-primary">4. 第三方服務</h2>
          <p>
            本站透過 Vercel 提供網站託管，其可能記錄一般伺服器日誌（IP、瀏覽器類型、造訪時間）用作保安及流量統計。
            外連網站（主辦方、票務平台等）有各自嘅私隱政策，本站無法控制亦不負責。
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-text-primary">5. 資料保留</h2>
          <p>訂閱 email 只保留至你取消訂閱為止；取消後會從通知名單移除。伺服器日誌按供應商預設週期自動清除。</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-text-primary">6. 你嘅權利</h2>
          <p>
            你有權查閱、更正或要求刪除你提交嘅個人資料（目前僅限訂閱 email），
            亦可隨時透過 unsubscribe 連結取消訂閱。如有私隱查詢，可透過本站 Instagram / Telegram 聯絡。
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-text-primary">7. 未成年人保護</h2>
          <p>
            本站僅限 18 歲或以上人士使用，並設有每日年齡確認閘門。
            我哋唔會明知而收集未成年人嘅任何個人資料；如發現有未成年人提交資料，將盡快刪除。
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-text-primary">8. 政策修訂</h2>
          <p>本政策可不時更新，更新後於本頁公布。繼續使用本站即表示你接受經修訂嘅政策。</p>
        </section>
      </div>

      <p className="mt-10 text-xs text-text-tertiary">
        本政策參考香港《個人資料（私隱）條例》（第 486 章）嘅保障資料原則編製。
      </p>
    </main>
  );
}
