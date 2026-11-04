# JCHING 海報生成器

資料源 = JCHING 公開唯讀 events API（`GET {base}/api/events`），**唔再喺 script 入面 hardcode 場次**。

## 檔案

| Script | 用途 |
|---|---|
| `jching-events.mjs` | 共用資料層：拉 API、週曆分組、單場查詢、展示資料組裝 |
| `poster-week-v3.mjs` | 1080×1080 港台場週曆（flex 時間軸） |
| `poster-event-intro-A2.mjs` | 1080×1080 活動介紹（左字右直向金框相，face-aware） |
| `poster-event-intro-BC.mjs` | B：1080×1350 直向 split；C：1080×1080 full-bleed 壓字 |
| `precrop-portrait.mjs` | sharp 面部中心預裁 474×1000 直向相 |

## 本地設定（唔入 repo）

`~/.config/jching-poster.json`：

```json
{
  "base": "https://j-star-data.vercel.app",
  "faces": { "192328": { "cx": 661, "cy": 427 } },
  "actressCn": { "192328": "篠原伊代" },
  "venues": { "2026-11-21|photo|192328": "旺角西洋菜南街 70-72 號 3 樓" },
  "events": {
    "javstar-192328-20261121-photo": {
      "typeLabel": "香港粉絲攝影會",
      "sessions": "3 場攝影會 ＋ 旺角快閃",
      "sessionsChip": "3 Sessions"
    }
  }
}
```

- `actressCn`：DB `name_cn` 試過係垃圾值（如「古賀まつな【旧名】」），中文名一律由呢度提供，否則退回日文顯示名。
- `venues` / `events`：API 只有城市級 `venue`，完整地址、場次摘要、標題微調喺呢度按 event-id / 日期覆寫。

## 用法

```bash
# 週曆（預設 HKT 今週，週一起；港台）
node scripts/poster-week-v3.mjs
node scripts/poster-week-v3.mjs --from 2026-11-16 --to 2026-11-22
node scripts/poster-week-v3.mjs --region hk          # 只出香港
node scripts/poster-week-v3.mjs --actress-id 192328

# 活動介紹（--event-id 最穩；否則 --actress-id + --date + --type）
node scripts/poster-event-intro-A2.mjs --event-id javstar-192328-20261121-photo
node scripts/poster-event-intro-BC.mjs --event-id javstar-192328-20261121-photo
# 同日有多場同 type 時用 --title-has 鎖（例如旺角快閃同攝影會都係 photo）
node scripts/poster-event-intro-A2.mjs --actress-id 192328 --date 2026-11-21 --title-has 旺角快閃

# 出新女優宣傳相：放 public/actress-promos/<id>.jpg，設好 faces 座標，再預裁
node scripts/precrop-portrait.mjs --id 192328
```

輸出預設去 `$HERMES scratch`，檔名帶 event-id；第一個 positional 參數可覆寫輸出路徑。

## 設計規則

- embed Noto Sans TC（Regular/Bold），唔用系統 fallback，杜絕亂碼
- satori flexbox 排版，唔用 absolute 估字寬
- 標主辦（JAVStarMeet）同資訊平台（JCHING）、唔出價錢、底部固定「如有更多活動，歡迎提供資訊」

## Instagram 自動發佈（@jching.calendar）

憑證：`~/.hermes/profiles/javstar-ops/secrets/.meta_ig_config.json`（600，含無過期 `long_page_token`、`ig_user_id=17841473724752270`）。
圖片 hosting：Vercel Blob store `jching-ig`（public），token 喺專案 `.env.local` 嘅 `BLOB_READ_WRITE_TOKEN`。

| Script | 用途 |
|---|---|
| `ig-setup-longtoken.mjs` | 一次性：short token 換無過期 Page token（互動輸入 App Secret，唔經對話） |
| `ig-publish.mjs` | 本地海報 → 自動上 Blob → IG container → 發佈；支援單圖／carousel（`--images` ≥2）／Reel（`--reel`） |

```bash
# 預覽（建 container 但唔出帖）——本地檔會自動上 Blob
node scripts/ig-publish.mjs --image /path/poster.png --caption "..." --dry-run

# 正式發佈（刪 --dry-run）
node scripts/ig-publish.mjs --image /path/poster.png --caption "..."

# 多圖 carousel
node scripts/ig-publish.mjs --images a.png b.png c.png --caption "..."
```

- 每日 API 發佈上限 100 帖；carousel 計 1 帖
- IG Graph API **唔支援刪帖**，出錯要人手喺 IG app 刪
- 本地檔統一上 Blob `ig/YYYY-MM-DD-<檔名>`，HTTP URL 直接傳則跳過上傳
- 手動試跑期間：每週先生週曆 → `--dry-run` 預覽 → 確認先正式發

### 帳號標籤（@tag）限制（2026-11 實測）
- 新 Meta App 預設**開發模式**，`business_discovery` 一律回 `#10 Application does not have permission`（連查自己都 fail），未過 App Review 前**攞唔到任何 IG 帳號內部 ID**
- 冇 ID 就用唔到 `user_tags`（可點擊帳號標籤）；caption 入面打純文字 `@handle` 只顯示文字、**唔會變連結**
- 過渡做法：caption 用已核實嘅官方 `@handle` 純文字（觀眾可自行搜尋）；要可點擊 tag 只能人手喺 IG app 出，或申請 `instagram_business_discovery` 標準存取（App Review，需隱私政策等，數日）
- 海報依賴 `satori`＋`@resvg/resvg-js`（已入 package.json），sharp 用於預裁

