# AV Intelligence — 日本 AV 女優情報整合網站

## 1. Concept & Vision

一個統一嘅 AV 女優情報平台，合併 minnano-av.com（資料庫）同 av-event.jp（活動資訊），並以**年度活動數量**作為主要排名指標。目標係幫香港粉絲快速發現邊個女優最積極搞線下活動——呢個係業界人脈同商業價值嘅重要信號。

**語言定位：** 100% 繁體中文 + 廣東話口吻，係香港粉絲角度出發，唔係大陸腔。

整體 feel：簡潔、資訊導向、資料豐富但不雜亂。似一個認真嘅情報工具，唔係八卦入口。

---

## 2. Design Language

### Aesthetic Direction
情報工具美學，類似金融 data terminal 或學術資料庫。清晰、系統性、易於掃描大量數據。

### Color Palette
- **Primary:** `#1a1a2e`（深色背景）
- **Secondary:** `#16213e`（卡片背景）
- **Accent:** `#e94560`（紅色標記，用於排名/活動）
- **Text Primary:** `#eaeaea`
- **Text Secondary:** `#a0a0a0`
- **Success:** `#4ade80`
- **Border:** `#2a2a4a`

### Typography
- **Headings:** `"Noto Sans JP", sans-serif`（日文支援）
- **Body:** `"Inter", sans-serif`
- **Monospace (數據):** `"JetBrains Mono", monospace`

### Layout
- Desktop-first，適配 mobile
- 左側導航固定，右側內容流
- 卡片式數據展示，網格排列

### Motion
- 頁面載入：staggered fade-in（100ms 間隔）
- Hover：subtle scale + border glow
- 載入狀態：skeleton pulse animation

---

## 3. Layout & Structure

### 主要頁面

```
/                       → 女優排名首頁（按活動數降序）
/actress/[id]          → 女優詳細頁（資料 + 活動列表）
/events                 → 即時活動列表
/compare               → 女優比較工具
```

### Header
- Logo + 站名
- 搜索框（搜尋女優名字）
- 更新時間戳記

### Sidebar（Desktop）
- 女優排名
- 即時活動
-  сравнение（比較）

---

## 4. Features & Interactions

### 投票系統（香港粉絲投票）

**規則：**
- 每個 IP 每日每女優最多 1 票
- 投票直接影響排名：最終分數 = 年度活動數 x 0.7 + 投票數 x 0.3
- 用戶可以隨時收回投票

**API：**
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/actresses/[id]/vote` | 獲取投票狀態 |
| POST | `/api/actresses/[id]/vote` | 投票 |
| DELETE | `/api/actresses/[id]/vote` | 收回投票 |


**計分公式：**
```
final_score = year_2026_events * 0.7 + votes * 0.3
```

### 核心功能

**女優排名頁**
- 按年度活動數量降序排列
- 每張卡片顯示：名字、Avatar、年度活動數、本月活動數
- 點擊進入詳細頁
- 分頁（每頁20個）
- 搜索過濾（名字關鍵字）

**女優詳細頁**
- 基本資料：名字、生日、身高、三圍、出道日期
- 活動列表（按日期降序）
- 作品精選（來自 minnano）
- 外部連結（minnano、av-event）

**活動列表頁**
- 即時顯示未來30日內嘅活動
- 按日期分組
- 顯示地點、主辦商、報名連結

**定時爬蟲**
- av-event.jp：每小時更新活動數據
- minnano-av.com：每日凌晨2點更新女優資料

### 互動細節

| 操作 | 回應 |
|------|------|
| Hover 女優卡片 | scale(1.02) + border glow |
| 點擊搜索 | 即時過濾，debounce 300ms |
| 活動已過期 | 自動隱藏，顯示"無 upcoming 活動" |
| 爬蟲失敗 | 重試3次，指數 backoff，記錄 log |

---

## 5. Component Inventory

### ActressCard
```
[Avatar] Name (JP)
         2025活動數: XX | 今月: X
         [View Details →]
```
States: default, hover, loading skeleton

### EventCard
```
[日期] [活動名]
[地點] [主辦]
[時間]
```
States: upcoming（綠色標記）, today（紅色）, past（灰色）

### RankBadge
```
#1 / #2 / #3 / ...
```
特殊 styling for top 3（gold/silver/bronze）

### SearchBar
```
🔍 搜尋女優名字...
```
States: empty, typing, no-results

### UpdateTimestamp
```
最後更新：2026-04-17 17:51 JST
```
表示數據新舊

---

## 6. Technical Approach

### Stack
- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Database:** SQLite（better-sqlite3）— 簡單部署
- **ORM:** Drizzle ORM（type-safe, lightweight）
- **Scraper:** Cheerio + node-fetch（HTML 解析）
- **Scheduler:** node-cron（本地運行）

### 數據模型

```typescript
// Actress（來自 minnano-av.com）
interface Actress {
  id: string;              // minnano ID
  name_ja: string;
  name_cn: string;
  birthday: string | null;
  height: number | null;
  bust: number | null;
  waist: number | null;
  hip: number | null;
  debut_date: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

// Event（來自 av-event.jp）
interface Event {
  id: string;              // av-event ID
  actress_id: string;      // foreign key → Actress.id
  title: string;
  venue: string;
  prefecture: string;
  datetime: string;        // ISO8601
  event_type: string;      // 'sign' | 'debut' | 'live' | etc.
  url: string;
  created_at: string;
}

// ActivityStats（計算欄位，非直接存儲）
// 年度活動數 = COUNT(Event WHERE YEAR(datetime) = 2026)
// 本月活動數 = COUNT(Event WHERE datetime BETWEEN ... AND ...)
```

### API Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/actresses` | 列表（支援分頁、搜索） |
| GET | `/api/actresses/[id]` | 詳細 |
| GET | `/api/actresses/[id]/events` | 該女優所有活動 |
| GET | `/api/events` | 即時活動列表（未來30日） |
| POST | `/api/cron/update` | 觸發爬蟲更新（受保護） |

### Scraper Modules

```
/scrapers
  /av-event.ts      → 爬取活動數據
  /minnano.ts       → 爬取女優資料
  /scheduler.ts     → node-cron 調度配置
```

### Rate Limiting & Ethics
- 所有 request 加 delay（1000-3000ms）
- 遵守 `robots.txt`（有則遵守，無則預設保守）
- User-Agent 包含網站名 + 聯繫 email
- 失敗時 exponential backoff

---

## 7. TODO

- [ ] 初始化 Next.js project
- [ ] 設置 SQLite + Drizzle ORM
- [ ] 實現 av-event.jp scraper
- [ ] 實現 minnano-av.com scraper
- [ ] 建立 API routes
- [ ] 前端排名頁
- [ ] 前端女優詳細頁
- [ ] 前端活動列表頁
- [ ] 設置 node-cron scheduler
- [ ] 部署配置