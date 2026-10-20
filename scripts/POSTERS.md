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
