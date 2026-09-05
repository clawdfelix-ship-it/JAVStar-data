# 每週 Instagram 活動 Post 自動化 — 設計規格

**日期：** 2026-09-06
**專案：** JAVStar-data（`av-intelligence`，Vercel `jav-star-data` + Neon Postgres）
**狀態：** 待 Felix 審閱

---

## 1. 目標

每星期一自動產生一張「本週日本女優活動」IG 圖卡（1080×1080，粉嫩可愛風），
彙整**即將一週（Mon–Sun）**嘅活動日程，並推送到 Felix QQ 做**草稿審批**；
Felix 確認後先透過 Meta Instagram Graph API 正式發佈。

**唔做嘅嘢（YAGNI / 風險）：**
- 唔放 AV 封面 / 露骨圖片（IG 成人內容管制，封號風險）。卡片只用顏色、字、emoji。
- 唔做全自動直接發佈（公開門面要人工把關）。
- 唔做 carousel / Story / Reels（初版；單張方形卡先行，將來可擴充）。
- 唔用投票人氣榜（全站 votes 總數只有 8，數據不足）。

---

## 2. 已驗證嘅數據事實（2026-09-06 用 Neon 真實數據查證）

- `events.datetime` 係 **text**（`'YYYY-MM-DD'`），另有 `events.date_iso` 係 **date**。
  查詢日期範圍用 text/date 比較即可；**勿**對 `votes.voted_at` 直接做 timestamp 比較，
  要 cast：`voted_at::timestamptz`（否則報 `operator does not exist: text >= timestamp`）。
- 一週活動量很大：2026-09-07～09-13 共 **77 場**（每日：3/6/6/5/7/25/25，週末爆場）。
  → 一張卡列唔晒，用「每日數字 strip + 精選 5 個」處理。
- `events.event_type`：`meet`(45)、`dvd`(15)、`other`(8)、`photo`(7)、`offkai`(2)。
- `actresses` 用 `id` join；`name_ja` 為主顯示名，`name_cn` 多數係 null（雜訊偏多，唔用）。
- 大量 events 嘅 `actress_id` 未配對（`name_ja = null`，一週有 7 場），精選時要過濾。
- 場地字串不一（`venue` 有時係都市「東京都」、有時係區「秋葉原」；`prefecture` 係都道府縣）。
- 活動數據平台網址：**https://jav-star-data.vercel.app**（唔係 javstarmeet.com，後者屬拍賣 bot）。

---

## 3. 卡片設計（已定稿，樣辦已確認）

檔案：`marketing/mockups/weekly-card-real.html`（真實數據樣辦）。

- 尺寸：1080×1080，粉嫩漸層底（#ffe3f1→#ffc2e0），白卡、圓角、粉紅點綴。
- 字體：`M PLUS Rounded 1c`（日文圓體）+ `Noto Sans TC`（繁中）。
- 結構（由上至下）：
  1. **Header**：`JAVSTAR ⋆ 應援` pill badge + 大標 `今週のイベント` + 日期 range pill（`9/7（一）–9/13（日）`）+ `🌸 本週全日本合計 N 場活動`。
  2. **每日活動數 strip**：7 格（一～日），每格顯示星期 + 場數 + 日期；週末（六日）用深粉紅 highlight。
  3. **本週精選**：最多 5 張活動卡，每張 = 粉紅日期格（`M/D` + 中文星期）+ 女優名 + `📍 地區` + 類型 tag。
  4. **Footer**：`完整 N 場時間表＋女優行程 → jav-star-data.vercel.app` + `每週一更新 · 追蹤唔會錯過心愛女優 💘`。
- 內容語言：標題／tag 用日文（受眾向日文活動），星期／提示用繁中；地名用日文原文。

**類型 tag 對照（event_type → 顯示）：**
| event_type | tag |
|---|---|
| `photo` | `撮影会` / `サイン・撮影会` |
| `offkai` | `オフ会` |
| `dvd` | `DVD発売記念` |
| `meet` | `イベント` / `チェキ会` |
| `other` | `コラボ企画` 或依標題判斷 |

**地區顯示：** 優先 `prefecture`（東京都/大阪府/愛知縣…）；若 title/venue 含知名區（秋葉原/難波/新宿/名古屋）可顯示該區。

---

## 4. 精選活動挑選規則（自動預選 + Felix 可改）

目標：由一週 70+ 場中揀 5 個高價值、日期分散、女優已配對嘅活動。

排序優先級（SQL + 程式碼）：
1. **必須已配對女優**（`actresses.name_ja IS NOT NULL`）。
2. 類型加權：`offkai`(オフ會) > `photo`(撮影會) > `dvd`(發售紀念) > `meet` > `other`。
3. 知名女優加權：比對一份「知名女優」名單（可先用 `actresses` 表中 2026 活動數高者，或手工清單如波多野結衣、吉根ゆりあ等）。
4. **日期分散**：同一日最多取 2 個，盡量覆蓋一週多日。
5. 去除標題含 `【完売】`（已售罄）嘅活動。
6. 每日上限填滿後，有餘額再補其他高價值。

輸出 5 個（唔夠 5 個就如實顯示，唔灌水）。草稿推送時會附上**完整候選清單**（JSON），
Felix 可以回覆「換第 X 個」或直接「出」。

---

## 5. 系統架構（方案 A：本機 OpenClaw 每週 job）

選擇本機而非 Vercel serverless，因為：Playwright/Chromium 喺 serverless 又大又易 timeout；
Felix 部 Mac mini 長開 OpenClaw，本機 Chrome 渲染最穩定、字體齊，審批又順手喺 QQ。

### Data flow

```
[每週一 09:30 HKT] OpenClaw cron
        │
        ▼
weekly-ig/build.ts  (Node + tsx, 喺 JAVStar-data repo 內跑)
        │  1. 讀 DATABASE_URL (repo .env)
        │  2. 查 Neon：本週 events（Mon–Sun）+ 每日 count + 精選候選
        │  3. 產生 HTML（套資料入 template）
        │  4. Playwright 用本機 Chrome 渲染 → 1080×1080 PNG
        │  5. 產生 IG caption 草稿（日文+繁中，含 hashtag）
        ▼
   推送 QQ（Felix）：PNG + caption 文字 + 候選清單摘要
        │
        ├─ Felix 回「出」/「ok」→ publish 步驟
        ├─ Felix 回「換 n」/「改用…」→ 重新產圖再推
        └─ Felix 回「唔出」/ 24h 無回 → 作廢
        │
        ▼ (批准後)
publish：
        1. PNG 上傳到公開 URL（Vercel Blob；IG Graph API 要求圖片係公開網址）
        2. POST /{ig-user-id}/media       (image_url + caption) → creation_id
        3. POST /{ig-user-id}/media_publish (creation_id) → media_id
        4. 回報貼文網址 (https://www.instagram.com/p/<shortcode>/)
```

### 元件（放 JAVStar-data repo）

| 檔案 | 職責 |
|---|---|
| `marketing/ig/query-week.ts` | 查 Neon：日期範圍 events、每日 count、精選候選（含加權/過濾）。回傳結構化資料。 |
| `marketing/ig/render-card.ts` | 將資料套入 HTML template 字串 → 寫暫存 HTML。 |
| `marketing/ig/shoot.ts` | Playwright 開本機 Chrome → 設 viewport 1080×1080 → screenshot 出 PNG。 |
| `marketing/ig/caption.ts` | 產生 IG caption（日文為主、繁中提示、hashtag、網址）。 |
| `marketing/ig/publish.ts` | Vercel Blob 上傳 + Graph API 兩步發佈。 |
| `marketing/ig/build-weekly.ts` | 編排：query→render→shoot→caption，輸出 PNG + caption + 候選 JSON。CLI 入口。 |
| `marketing/ig/template.ts` | 卡片 HTML/CSS（由確認樣辦抽出，placeholder 用資料填入）。 |

OpenClaw 側：
- 一個**每週一 cron**（09:30 HKT）跑 `build-weekly.ts`，完成後用 `message` 工具將 PNG + caption 發去 Felix QQ。
- 一個**審批關鍵字**處理：Felix 回「出」→ 跑 `publish.ts`（帶本週 PNG 路徑）；回「換」→ 調整後重建。
  （實作方式：cron job 產出後，由 OpenClaw agent 對話處理審批；或做成 qqbot 可呼叫嘅 script。）

### 環境變數（本機，不入 git）

- `DATABASE_URL`（已有，repo `.env`）
- `BLOB_READ_WRITE_TOKEN`（Vercel Blob token，新增）
- `IG_USER_ID`（Instagram Business/Creator account id）
- `IG_ACCESS_TOKEN`（Meta long-lived page token，含 `instagram_content_publish` 等權限）
- 全部寫入 repo `.env`（已 gitignore）或 OpenClaw 本機 env；`.env.example` 補欄位說明。

---

## 6. Instagram 一次性設定（Felix 手動，我逐步帶）

1. 開新 Instagram 帳號（或用現有）。
2. 手機 app：設定 → 帳號 → **轉換為專業帳號**（Creator 或 Business，免費）。
3. 建立一個 **Facebook Page**（可空白、不公開都得），並將 IG 帳號**連結**到該 Page。
4. 到 [developers.facebook.com](https://developers.facebook.com) 開一個 App（類型 Business）。
5. 加 **Instagram Graph API** 產品，取得：
   - Instagram Business Account ID（`IG_USER_ID`）
   - Long-lived Access Token（權限：`instagram_basic`、`instagram_content_publish`、`pages_read_engagement`）
6. Token 填入本機 `.env`。Long-lived token 約 60 日，需定期 refresh（spec 後續加 refresh 提醒）。
7. Vercel 專案開 **Blob Store**（Storage → Blob），取 `BLOB_READ_WRITE_TOKEN`。

---

## 7. 錯誤處理

- **查無活動**（一週 0 場，極罕）：唔出卡，QQ 通知「本週無活動」。
- **Playwright/Chrome 失敗**：重試一次；再失敗通知 Felix，附錯誤。
- **Graph API 發佈失敗**：常見為 token 過期（190）、圖片 URL 未就緒、內容被拒。
  - media_publish 前先 poll `media/status` 至 `FINISHED` 先 publish。
  - 失敗時將 Meta 回傳錯誤訊息原樣通知 Felix，**唔重試自動再發**（避免重複貼文）。
- **審批逾時**：每週草稿 24–48 小時無回覆視作放棄，下週重新產生。
- 所有步驟印 log；PNG / 候選 JSON 暫存於 `marketing/ig/out/<YYYY-WW>/` 以便追查。

---

## 8. 測試

- `query-week.ts`：用真實 Neon 數據測一週（9/7–9/13），驗證每日 count = 3/6/6/5/7/25/25、總數 77、精選 5 個皆有 name_ja、唔含【完売】。
- `render + shoot`：用測試資料產 PNG，核對尺寸 1080×1080、無 overflow、CJK/日文正常顯示。
- `publish.ts`：先用 Graph API「**媒體容器建立但不 publish**」或開 **IG 沙盒模式**測試，唔會真係出帖；確認無誤先正式 publish。
- caption 生成：截長度（IG caption 上限 2200 字、hashtag 30 個內）。

---

## 9. 開發階段（建議順序）

1. 抽 template + `query-week.ts`（真數據）→ 本地產出與確認樣辦一致嘅 PNG。
2. `build-weekly.ts` CLI + OpenClaw 手動觸發 → QQ 收到草稿（先唔接 Graph API）。
3. Felix 完成 IG/FB/Meta/Vercel Blob 一次性設定。
4. `publish.ts`（沙盒先測）→ 對接審批「出」。
5. 上每週一 cron，正式運作。

---

## 10. 未決事項（待 Felix 決定，唔阻塞起手）

- [ ] 精選預選後，Felix 想「QQ 直接回關鍵字換」定「接受自動預設、淨係撳出/唔出」？（建議先做後者，換人功能後加）
- [ ] IG 帳號 handle / 顯示名（卡片 footer 暫未放 @handle，待定）。
- [ ] 發佈時間：審批通過即出，還是固定每週一傍晚？（建議通過即出）
- [ ] Caption 語言比例（全日文 / 日文+繁中）。
