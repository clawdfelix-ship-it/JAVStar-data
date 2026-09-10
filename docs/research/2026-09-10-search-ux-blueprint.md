# J-STAR CALENDAR 搜尋功能完整實作藍圖

> 角色：UX 架構師（地基思維，交付可直接實作嘅規格）
> 日期：2026-09-10
> 方法：讀 code 核實（`app/`、`components/`、`hooks/`、`app/api/`）＋ 線上 API 實測（curl）＋ 瀏覽器互動驗證
> 站點：https://j-star-data.vercel.app ｜ Next.js App Router ＋ Neon Postgres（`@neondatabase/serverless`）｜ Vercel hkg1
> 數據量（2026-09-10 實測 `/api/stats`）：女優 **7,598**、活動 **2,667**

---

## 1. 現況審計（讀 code ＋ 線上驗證，唔靠估）

### 1.1 搜尋入口地圖

| # | 入口 | 檔案 | 實際行為 | 結論 |
|---|------|------|----------|------|
| A | 主頁 Hero 大搜尋欄 | `app/HomeClient.tsx`（input 直接綁 `search` state，**唔係** `SearchBar` 組件） | 女優 tab：每個 keystroke 直接改 SWR key 打 `/api/actresses?search=`（server-side，搵到晒 7,598 筆）；活動 tab：用同一個 `search` 對**已載入嘅 2,000 筆**活動做 client-side `includes`；日曆 tab：完全冇反應 | 有缺陷（詳 1.3） |
| B | 比較頁兩個搜尋框 | `app/compare/CompareClient.tsx` | debounce 250ms → `/api/actresses?search=&limit=15`，server-side ILIKE | 啱啱改好，但仲有 5 個細問題（P2 為主） |
| C | `/events` 活動頁 | `app/events/EventsClient.tsx` | 只得地區/類型/region 下拉（server filter），**冇文字搜尋** | 缺功能 P2 |
| D | `components/SearchBar.tsx` ＋ `hooks/useSearch.tsx`（Fuse.js） | — | **全套係死碼**：全 repo 冇任何 `<SearchBar>` render；`HomeClient` 入面 `import SearchBar` 同 `import { highlightText }` 係 unused import。Fuse.js 只對「當前傳入陣列」做模糊搜尋 | 唔好執，要決定重用定剷 |
| E | `/search` 結果頁 | 唔存在（`app/search/` 目錄缺失，線上 `/search?q=x` → **404**） | 但 `app/layout.tsx` JSON-LD `SearchAction` 已對外宣稱 `/search?q={search_term_string}` | SEO 壞鏈 P2 |
| F | 活動 API 文字搜尋 | `app/api/events/route.ts` | 冇 `search` 參數；而且 `prefecture`/`type` 用**字串拼接**落 SQL（雖然值來自 dropdown，風險低，但唔係參數化） | P2 |

### 1.2 API 實測數據（2026-09-10，hkg1 → Neon）

`GET /api/actresses?search=...`（SQL：`name_ja ILIKE '%q%' OR name_cn ILIKE '%q%'`， leading wildcard，**冇 trigram / 全文索引**，每行仲帶 2 個 LATERAL votes 子查詢 ＋ 獨立 COUNT query）：

| 查詢 | total | 回應時間 | 備註 |
|------|------:|---------:|------|
| `三上悠亜` | 1 | ~620ms | 漢字原名 OK |
| `三上悠亞`（繁） | 0 | 413ms | 日文漢字「亜」≠ 繁體「亞」，**繁中使用者搜唔到** |
| `みかみ`（假名） | 1 | — | 命中嘅係「三上愛菜」別名；**三上悠亜本人冇假名欄位 → 搜唔到** |
| `mikami`（羅馬字） | 1 | 1,460ms | 同上，只靠 name_cn 括號內羅馬字啱撞到另一人 |
| `Yua Mikami`（全名倒轉） | 0 | — | 冇 tokenization |
| `桜`（日文櫻） | 29 | 614ms | OK |
| `樱`（簡體中文櫻） | 0 | 413ms | 簡繁不通 |
| `a`（單字母） | **1,507** | 1,456ms | 單字元炸出全表 1/5，每次打字都掃表 |

### 1.3 缺陷清單（按優先級）

#### P0 — 而家就要修

**P0-1｜主頁搜尋「每個鍵都打 API」，冇 debounce、冇最少字元、冇 IME composition 處理**
`onChange → setSearch → SWR key 即變 → 即時 request`。用日文/中文 IME 打「みかみ」，未按空白確定候選詞，composition 中途每個假名都會發請求；實測單字元查詢 1.4s。手機網絡下即連續 request 轟炸，畫面仲會因 `keepPreviousData` 閃舊數據。對比：CompareClient 已經有 250ms debounce，主頁反而冇。

**P0-2｜主頁搜尋唔重置頁碼 → 頁數 > 1 時打 keyword 永遠顯示空結果**
`useActresses({ page, limit:10, search })`，但 `setSearch` 從來唔會 `setPage(1)`。用戶喺第 3–7 頁打 keyword（search 結果通常得 1 頁），request 係 `?search=X&page=5` → 回傳空 → 直接跳「暫無符合條件嘅女優」空狀態。用戶會以為「搜唔到」，其實係佢企咗喺第 5 頁。

**P0-3｜搜尋承諾同實際 scope 唔一致（placeholder 講大話）**
placeholder：「搜尋女優名、活動名稱、場地...」。實際：
- 女優 tab：只搜女優名（server）；
- 活動 tab：只喺**已載入嘅 2,000 筆**活動（總數 2,667，即係永遠搜唔到 ~667 筆舊活動）入面 client filter `title/venue/actress_name`；
- 日曆 tab：打乜都冇反應。
同一個框，轉 tab 行為完全唔同，冇任何提示，呢個係資訊架構缺陷。

#### P1 — 跟住要做

- **P1-1｜羅馬字/假名/中文/別名命中率差**：只有日文原名同 name_cn 大雜燴字串入面剛好包含先搵到。繁簡不通（亜/亞、桜/樱）、冇獨立假名/羅馬字欄、冇別名正規化。呢個正正係呢類網站搜尋嘅核心命中率問題。
- **P1-2｜`%q%` leading-wildcard ILIKE 冇索引**：7.5k  rows seq scan ＋ LATERAL votes ×2 ＋ 額外 COUNT，實測 0.4–1.5s。數據細暫時頂得住，但每-keystroke 打法 ＋ 單字元全表掃，好易變慢查詢。
- **P1-3｜競態處理不完整**：CompareClient 嘅 `doSearch` 冇 `AbortController`，兩個 debounced response 唔按次序返（1.4s 嘅舊 query 可能遲過 0.4s 新 query 返）→ `setR1` 有機會顯示舊 keyword 嘅結果。
- **P1-4｜活動頁 `/events` 冇文字搜尋**；活動 API 冇 `search` 參數，想做都做唔到 server-side。
- **P1-5｜搜尋結果無排序相關度**：而家 search 照行 `final_score` 排序。打 `mikami`，頭位係 0 活動嘅「あすかみおん」，真正想搵嘅人可能沉底；完全前綴匹配同中間包含冇分權重。

#### P2 — 有資源先做 / 技術債

- P2-1 `/search` 頁 404，但 JSON-LD SearchAction 已宣稱（Google SearchConsole 會報壞）。
- P2-2 CompareClient：冇鍵盤導航（↑↓ Enter Esc）、冇 aria-combobox、冇 avatar、結果 15 條冇「睇全部」、min-length=1、error 靜默吞掉（網絡 fail 同「冇結果」畫面一樣）。
- P2-3 `SearchBar.tsx` ＋ `useSearch.tsx`（Fuse.js）成 ~500 行死碼，含歷史/高亮/鍵盤邏輯，留喺度會誤導後續開發「以為主頁用緊佢」。
- P2-4 `app/api/events/route.ts` 用字串拼接 prefecture/type（目前值可控，但屬壞模式，順手參數化）。
- P2-5 冇任何速率保護 / 搜尋分析 / 熱門詞。
- P2-6 主頁 events tab client search 上限 2,000 筆（見 P0-3）。
- P2-7 name_cn 資料髒（例：三上悠亜嘅 name_cn 係「ヒュージョン亀頭(パルプンテ48チーム長谷川) （ / ）」），污染源頭在 scraper，搜尋層只能補救。

---

## 2. 搜尋模型：統一還是分開？

### 2.1 判斷

**結論：一個「女優搜尋」做透，活動搜尋用既有篩選補文字框；唔好而家做全站混合搜尋（global search）。**

理由（地基思維：先睇使用者意圖同數據形態）：

1. **兩種搜尋意圖完全唔同**
   - 女優搜尋 = **已知目標（known-item）**：「我想搵三上悠亜」→ 目標係一個女優 detail 頁。需要跨文字系統匹配（漢字/假名/羅馬字/別名），typeahead 即點即走最啱。
   - 活動搜尋 = **過濾條件（filter）**：「東京有咩撮影會」「呢個女優下個月嘅活動」→ 本質係喺日期/地區/類型篩選上加一個 title/name 文字過濾，結果係**列表**，唔係跳轉單一實體。
2. 活動得 2,667 筆，而家全部一次過載（`limit=2000`，未來可 server 化），女優 7,598 筆先係需要認真做 matching 嘅地方。
3. 全站混合搜尋（一個框出女優＋活動分組）要解決兩套 ranking、兩套卡片、兩套空狀態——以現時團隊資源係**過度設計**。除非日後女優頁有流量佐證「用戶真係當 Google 咁打一句嘢」，否則唔做。

### 2.2 Scope 定義

| 入口 | Scope | 形態 |
|------|-------|------|
| 主頁 Hero 搜尋框 | **只搜女優**（改名 placeholder 做「搜尋女優名 / 假名 / 羅馬字…」） | typeahead 下拉 ＋ Enter 去 `/search?q=` 結果頁 |
| 比較頁 A/B 框 | 只搜女優 | typeahead（揀完即鎖，現有 pattern） |
| 活動 tab／`/events` | title / venue / actress_name 文字過濾，**同地區/類型 dropdown 並列**，唔好放喺 Hero 個框 | 列表即時 filter（server-side 為 Phase 2） |
| `/search` 頁（Phase 2） | 女優為主；可喺結果下面加「相關活動 ≤3 條」分組 | 結果頁 |

### 2.3 Typeahead vs 結果頁取捨

- **Typeahead 係主路徑**（手機優先：手使用者 90% 想直接跳女優頁，唔想等一頁結果）。
- **結果頁只做兩件事**：① Enter 後承載完整分頁結果；② 承接 JSON-LD `/search?q=` 對外承諾同外部連結。
- 唔好喺 typeahead 放活動卡片混排（P2 先考慮）。


---

## 3. 互動規格（可直接實作）

### 3.1 觸發時機

| 參數 | 值 | 理由 |
|------|-----|------|
| 最少字元數 | **1 個 CJK 字元 / 2 個拉丁字元** | 日文漢字、中文單字就有意義（「三上」2 字常見，但「桜」1 字都係常用搜尋）；拉丁 1 字母會炸出 1,507 條（實測），所以 `a` 唔查，`ab` 先查 |
| Debounce | **200ms**（主頁），CompareClient 維持 250ms | 200ms 手感快又壓得住請求量；兩個入口統一用同一個 hook 後可一齊用 200ms |
| IME composition | **compositionstart → 暫停查詢；compositionend 後先重新計 debounce** | 中日文輸入必備。打 `mikami`→候選「三上」期間唔會用半成品假名亂查。實作：input 加 `onCompositionStart` 設 `composing=true`，`onCompositionEnd` 設 false 並手動 trigger 一次 debounce；debounce effect 入面 composing 時直接 return |
| 貼上（paste） | 立即走一次 debounce（唔使等） | onChange 自然涵蓋，不用特別處理 |
| 清空 | 即時關下拉、中止在途請求（AbortController） | 防止舊 response 遲返填錯結果 |

**競態防護**：每個查詢帶遞增 seq / `AbortController`；response 返嚟時核對「係咪最新 query」，唔係就丟棄。SWR 本身按 key 去重，但自寫 fetch（CompareClient）要自己處理。

### 3.2 各狀態顯示內容

| 狀態 | 顯示 |
|------|------|
| Focus、冇輸入 | 顯示**最近搜尋**（localStorage，最多 6 條；可單條刪除／清除全部）＋ 下方一行「熱門女優」可選（Phase 2 先，見 3.5） |
| 輸入中（loading） | input 右側 16px spinner；若已有上一輪結果，**保留舊結果唔閃空白**（SWR keepPreviousData 已有）；首輪先顯示骨架列 4 行 |
| 有結果 | 列表（規格見 3.3） |
| 空結果 | 插圖位用現有 `Flower2` icon；文案（港式繁中）：「搵唔到『{q}』相關嘅女優」＋ 副提示「試吓日文原名、假名（みかみ）、羅馬字（mikami）或者簡化關鍵字」；唔好顯示「清除篩選」（呢度冇篩選） |
| 網絡失敗 | 「網絡唔順，搜尋失敗」＋ [重試] button；**禁止**靜默 `catch{return []}`（CompareClient 而家就係咁，會令 fail 同空結果無法分辨） |
| 少於最少字元 | 唔出下拉（或灰色提示「輸入多 1 個字…」，只對拉丁做） |

### 3.3 結果列表項規格

每項由上到下：

```
[avatar 40px 圓角]  三上悠亜                    （主名，粗體，命中片段 <mark> 高亮）
                    みかみゆあ · Mikami Yua    （假名/羅馬字/別名，12px 次要色，截單行）
                    🔥 12 場活動               （右側或底行；year_2026_events，0 場就唔顯示）
```

- **最多 8 項**（手機單手熱區；現有 `SearchBar` maxSuggestions=8 已係合理值）。
- 底部分隔列：**「睇全部 {n} 個結果 →」**（n = API pagination.total）→ `/search?q={q}`。
- 點擊女優列 → `/actress/{id}`（沿用 ActressCard 詳情頁路由）。
- 排序：API 端做相關度（見第 4 節），客戶端唔再排。

### 3.4 鍵盤 / 觸控 / 無障礙

鍵盤（桌面）：
- `↓`/`↑`：循環移動 active option（包含「睇全部」），listbox 要 `scrollIntoView({block:'nearest'})`；
- `Enter`：active option → 跳女優頁；冇 active（index=-1）→ 去 `/search?q=`；
- `Esc`：關下拉，**唔清空 input**（再按先 clear，或提供 × 掣）；
- `Tab`：正常離開並關下拉。

ARIA（combobox 模式，WAI-ARIA 1.2）：
```
<div role="combobox" aria-haspopup="listbox"
     aria-expanded={open} aria-controls="search-listbox">
  <input role="combobox" aria-autocomplete="list" aria-controls="search-listbox"
         aria-activedescendant={activeId} aria-expanded={open} />
</div>
<ul id="search-listbox" role="listbox">
  <li role="option" id="opt-0" aria-selected="false">…</li>
</ul>
```
- 用 `aria-activedescendant`（唔使搶 DOM focus，輸入遊標留住喺 input）；
- 載入中：`aria-busy="true"` 喺 listbox；空結果：`role="status"` live region 播一次；
- 觸控：成行 `<a>` / button，最小點擊高度 **44px**；下拉喺手機用 `position: absolute` 配現有樣式即可，**唔好**做 fullscreen takeover（資源所限，現有頁 hero 空間足夠）。

### 3.5 搜尋歷史 / 熱門：值唔值得做？

| 功能 | 判斷 | 做法 |
|------|------|------|
| 搜尋歷史 | ✅ **做，成本極低** | 現有 `useSearch.tsx` 已有完整 localStorage 實作（save/clear/remove/max 10），邏輯直接搬去新 hook；Phase 1 一併做 |
| 熱門女優（focus 空狀態） | ⚠️ Phase 2 | 唔需要 server analytics：直接用現有 ranking 頭 5 名（`/api/actresses?sort=…&limit=5` 已有），零額外成本 |
| 熱門搜尋詞（server 統計） | ❌ 唔好做 | 要埋點、入庫、隱私考量；7.5k 用戶級流量唔值 |
| 個人化推薦 / 向量語義搜尋 | ❌ 唔好做 | 典型過度設計 |


---

## 4. 比對邏輯：由「最快見效」到「最完善」

數據特色：`name_ja`（日文原名，可能係假名/漢字）、`name_cn`（大雜燴：中文譯名＋別名，常見格式 `主名（系列名）（かな / Romaji）`，例如「新田絢（舞ワイフ）（にったあや / Nitta Aya）」，亦有唔少係垃圾）。
用戶輸入形態：中文（繁/簡）、日文漢字、平假名/片假名、羅馬字（有時 macron `yūa`）、英文全名（名先姓後）、別名。

### 方案 0｜唔落 migration 都可以即刻做（Phase 1，半天工作量）

1. **Server 強制最少字元**（CJK 1、Latin 2），封鎖單字母全表掃。
2. **前綴權重排序**（解 P1-5，零 index 成本）：

```sql
-- q = $1（已包含 % 包裹嘅版本分開傳，避免一個參數兩用）
ORDER BY
  CASE
    WHEN a.name_ja ILIKE $2 THEN 0          -- '三上%' 原名前綴，最高
    WHEN a.name_cn ILIKE $2 THEN 1          -- name_cn 前綴
    WHEN a.name_ja ILIKE $1 THEN 2          -- '%三上%' 原名包含
    ELSE 3
  END,
  COALESCE(ec.year_2026_events, 0) DESC,    -- 同名/相似時有活動嘅行先
  a.name_ja ASC
LIMIT 9                                    -- 拎 9 條：8 條展示 + 1 條判斷 hasMore
```

3. **typeahead 用輕量 query**：唔好再行 `/api/actresses` 嗰條帶 2 個 LATERAL votes ＋ COUNT 嘅大 query（建議欄位見第 5 節）。呢個本身就係最大嘅單項提速——由 0.4–1.5s 落到預期 50–150ms。

### 方案 1｜pg_trgm GIN index（Phase 2，推薦核心方案）

Neon Postgres 支援 `pg_trgm`。trigram 同時解決兩件事：**令 `ILIKE '%q%'` 行 index**（Postgres planner 對 trigram GIN 會用 bitmap scan）＋ 提供 `similarity()` 模糊匹配（錯別字、順序、差一兩個假名都執到）。

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 一個正規化搜尋欄，集中所有可搜文字（migration ＋ backfill，見方案 2）
ALTER TABLE actresses ADD COLUMN IF NOT EXISTS search_text text;

CREATE INDEX IF NOT EXISTS idx_actresses_search_trgm
  ON actresses USING gin (search_text gin_trgm_ops);
```

查詢：

```sql
SELECT id, name_ja, name_cn, avatar_url
FROM actresses
WHERE search_text ILIKE '%' || $1 || '%'
   OR similarity(search_text, $1) > 0.18        -- 寬鬆 fuzzy 後備
ORDER BY
  CASE WHEN name_ja ILIKE $1 || '%' THEN 0 ELSE 1 END,
  similarity(search_text, $1) DESC
LIMIT 9;
```

- 利：一個 extension 搞掂 leading wildcard 提速 ＋ 容錯；7.6k 行 index 極細（< 10MB）。
- 弊：CJK trigram 係「每 3 個字元」切，1–2 個漢字用唔成 trigram（所以 1–2 字查詢仍然行 ILIKE；屆時有前綴 `ILIKE '三上%'` 可以 btree 補，或接受 seq scan——7.6k 行細表其實好快）。
- **唔使**為 events 表建 trigram index：2,667 行 seq scan 毫秒級，Phase 2 加 server search 直接 ILIKE 就得。過早 index 就係過度設計。

### 方案 2｜別名正規化拆欄（Phase 2，命中率提升最大嘅一步）

`name_cn` 而家一個字串塞晒中文譯名、系列別名、假名、羅馬字，仲混住垃圾。建議加欄而非改 raw data：

```sql
ALTER TABLE actresses
  ADD COLUMN IF NOT EXISTS name_kana    text,
  ADD COLUMN IF NOT EXISTS name_romaji  text,
  ADD COLUMN IF NOT EXISTS aliases      text[];

-- search_text 由各欄拼出（或用 GENERATED COLUMN）：
-- lower(name_ja || ' ' || coalesce(name_kana,'') || ' ' ||
--       coalesce(name_romaji,'') || ' ' || array_to_string(aliases,' '))
```

Backfill 用一次性 Node script（跟 repo 現有 `scripts/migrate-*.ts` 模式，唔需要引入 migration framework）：
- regex 拆現有格式：`/（([^\/（）]+)\/\s*([A-Za-zāīūēōĀĪŪĒŌ\s]+)）/` → kana ＋ romaji；
- 其餘括號內容入 `aliases`；
- scraper（`scrapers/`）日後寫入時一併填呢幾欄，唔再靠 run-time 拆字；
- romaji 統一 lower-case ＋ 去 macron（`yūa`→`yua`，unaccent 或簡單 map 都得）；
- 用 **OpenCC**（`opencc` npm，簡繁互轉）為每個中文別名生成簡體變體一齊放入 `search_text`，一次過解決「亞/亜」「樱/桜」呢類問題（繁簡＋日字選字）。

### 方案 3｜unaccent extension（Phase 2 配套，低成本）

```sql
CREATE EXTENSION IF NOT EXISTS unaccent;
-- 羅馬字 macron、歐洲別名用；對 CJK 無用，唔好誤會佢可以解日文
WHERE unaccent(search_text) ILIKE '%' || unaccent($1) || '%'
```
注意：直接對欄用 `unaccent()` 會令 index 失效，要做 immutable wrapper 或將 unaccent 結果預先寫入 `search_text`（推薦後者）。

### 方案 4｜全文檢索 tsvector（**唔推薦做，除非數據再大一個數量級**）

- 日文/中文全文檢索要 `pg_jieba` / `zhparser` 呢類 parser extension，**Neon 唔支援自訂 extension**；裸 tsvector 只會按空白分詞，對「三上悠亜」「みかみゆあ」幾乎等於成串匹配，比 trigram 差。
- 英文/羅馬字部分 trigram 已夠用。
- 結論：**唔好做**。若日後女優量上到 10 萬＋或要做語義搜尋，正路係外接 Meilisearch/typesense，而唔係 Postgres FTS。

### 方案總覽（取捨）

| 方案 | 命中提升 | 性能 | Migration | 風險 | 階段 |
|------|---------|------|-----------|------|------|
| 0 字元閾值＋前綴權重＋輕量 query | 中 | 大升 | 無 | 極低 | Phase 1 |
| 1 pg_trgm GIN | 中（容錯）＋大升 | 大升 | 1 extension +1 index | 低 | Phase 2 |
| 2 拆欄＋別名＋OpenCC | **大** | 中性 | 加欄＋backfill＋改 scraper | 中（要驗證拆欄正確率） | Phase 2 |
| 3 unaccent | 小 | — | extension | 低 | Phase 2 順手 |
| 4 Postgres FTS | 負收益 | — | 高 | 高 | **唔做** |


> 備準：OpenCC 主要解簡↔繁；「亜（日）/亞（繁）/亚（簡）」呢類日華異體字要額外維護一張幾十字嘅 variant map（順序：先 OpenCC，再 map），唔好以為 OpenCC 一次過搞掂晒。

---

## 5. API 設計

### 5.1 統一 endpoint 定擴展現有？——擴展現有，加多一個輕量模式

**唔好開新 `/api/search` 聚合 endpoint**（而家得女優一種實體要認真搜，YAGNI）。喺現有 `GET /api/actresses` 加 `mode=quick`：

```
GET /api/actresses?mode=quick&q=みかみ
```

- typeahead 用 `mode=quick`：**唔 JOIN votes、唔做 COUNT、唔計 final_score**，只掃 actresses（Phase 2 掃 search_text trigram index），回傳最細欄位集；
- 結果頁 `/search` 用現有模式（分頁、排序、完整 ranking 欄位），只將 WHERE 抽成共用 function；
- 向後相容：保留 `search` 參數做 alias，CompareClient 唔使即刻改。

**Response（mode=quick）**：
```json
{
  "data": [{
    "id": "655303",
    "name_ja": "三上悠亜",
    "name_cn": "三上悠亞",
    "name_kana": "みかみゆあ",
    "name_romaji": "mikami yua",
    "avatar_url": "https://…/655303.jpg",
    "year_2026_events": 12
  }],
  "total": 34,          // 估計/精確 count 二擇一：quick 模式建議用 EXISTS 上限式判斷（>8 即顯示「睇全部」），避免 COUNT(*)
  "hasMore": true,
  "queryTimeMs": 42
}
```

規則：
- 輸入驗證：trim 後 CJK ≥1 / Latin ≥2 先查，否則 HTTP 200 空列表；`q` 長度封頂 64；
- `limit` 封頂 9（quick）／100（沿用）；
- Cache：response 加 `Cache-Control: s-maxage=300, stale-while-revalidate=86400`（女優名一日變唔到幾多次，CDN 邊緣快取擋晒重複熱詞，hkg1 edge 命中時近乎 0ms）；SearchParams 要排序或直接由 URL 字串做 cache key；
- 全部 WHERE 一律參數化（沿用現有 actresses route 嘅好榜樣）；events route 嘅字串拼接順手改埋。

### 5.2 速率保護（用戶級流量、Vercel/Neon 負荷）

按風險由平到貴，**做頭兩樣就夠**：

1. **客戶端閾值＋debounce＋AbortController**（第 3 節）——擋掉 90% 無謂請求；
2. **Vercel CDN cache（s-maxage）**——熱詞重複請求根本唔到 Neon；
3. 唔需要而家引入 Upstash/自製 rate limit middleware。保險位：可加單 IP 簡易限速（`/api/actresses` 每 10 秒 ≤30 次），但 7.5k 用戶級規模、又有 edge cache，呢個留到見到 Vercel function invocation 異常先做（**過度設計警示**）；
4. Neon serverless 本身按用量收費，quick query 走 trigram index 後每次 ~50ms CPU，配合 cache，月成本預計幾美仙級別，唔使為慳錢而提前架 ElasticSearch 呢類重型基建。

### 5.3 活動搜尋 API（Phase 2）

`GET /api/events` 加參數化 `q`：
```sql
AND (e.title ILIKE '%' || $q || '%'
     OR e.venue ILIKE '%' || $q || '%'
     OR a.name_ja ILIKE '%' || $q || '%'
     OR a.name_cn ILIKE '%' || $q || '%')
```
2,667 行唔使 index。同時把 prefecture/type/region 改參數化。


---

## 6. 實作階段

### Phase 1 — 修 P0（目標：半天～1 天，唔掂 DB schema）

交付物：

1. **新 hook `hooks/useActressSearch.ts`**（唔好再改死碼 useSearch）：
   - debounce 200ms、CJK≥1 / Latin≥2 閾值、compositionstart/end 暫停、AbortController ＋ 最新請求 seq 防競態、localStorage 歷史（由 `useSearch.tsx` 搬現成邏輯，key 用 `jstar_search_history`）。
2. **新組件 `components/ActressSearchBox.tsx`**（combobox 規格照第 3 節）：8 項、avatar、主名/別名、活動數、「睇全部 n 個結果」、↑↓ Enter Esc、aria-combobox/listbox/activedescendant、44px 觸控列、spinner/空/失敗三態。
3. **`app/api/actresses/route.ts` 加 `mode=quick`**：輕量欄位、不 JOIN votes/不 COUNT（用 `LIMIT 9` 推 hasMore）、min-length 伺服器端把關、前綴權重 ORDER BY（方案 0 SQL）、`Cache-Control: s-maxage=300, stale-while-revalidate=86400`。
4. **改 `app/HomeClient.tsx`**：
   - Hero input 換做 `<ActressSearchBox>`，placeholder 改「搜尋女優名、假名、羅馬字…」；
   - **刪掉 `search` 傳入 ranking 用嘅 `useActresses`**（女優 tab 唔再用 Hero 框即時過濾排名 grid——見下方決策）；女優 tab 改為保留獨立嘅 grid 排序體驗，搜尋結果全部喺 typeahead/`/search` 頁承載；
   - 移除 unused imports（`SearchBar`、`highlightText`）；
   - 活動 tab 嘅 client filter 改用獨立 filter input（放喺地區/類型旁），唔再食 Hero 嘅 `search`；移除 placeholder 對活動嘅承諾；
   - `setPage(1)` bug 一併消失（grid 唔再食 search），若保留任何 grid filter 都要記得 filter 改變時 reset page。
5. **`app/search/page.tsx`（輕量結果頁）**：server component 讀 `?q=`，復用 ranking grid ＋ 分頁（打現有 `/api/actresses?search=&page=`），順便修 JSON-LD 404（P2-1 提前到 Phase 1，因為成本只係一個頁）。
6. **剷死碼**：刪 `components/SearchBar.tsx`、`hooks/useSearch.tsx`、`package.json` 嘅 `fuse.js`（歷史/高亮有用嘅邏輯已搬走先好刪）。

> **關鍵 UX 決策（要同 Felix 確認）**：主頁 Hero 搜尋而家「邊打邊過濾排名 grid」其實係半壞功能（P0-2 頁碼、P0-3 scope）。推薦改成正統 typeahead（搜尋框只負責「搵女優→跳頁」，排名 grid 維持排名職責），語意更清晰，亦同 compare 頁行為一致。

Phase 1 改動檔案清單：

| 檔案 | 動作 |
|------|------|
| `hooks/useActressSearch.ts` | 新增 |
| `components/ActressSearchBox.tsx` | 新增 |
| `app/api/actresses/route.ts` | 修改（mode=quick、快取、閾值） |
| `app/HomeClient.tsx` | 修改（換組件、拆活動 filter、清 unused import） |
| `app/search/page.tsx` | 新增（結果頁） |
| `components/SearchBar.tsx` | 刪除 |
| `hooks/useSearch.tsx` | 刪除 |
| `package.json` | 移除 fuse.js（npm uninstall） |

驗收：
- [ ] 第 7 頁打 keyword 唔再出現假空結果；
- [ ] IME 打假名未確定候選時唔發請求（Network 面板確認）；
- [ ] `mikami` 頭位係相關度高嘅女優；`a` 單字母唔發請求；
- [ ] 鍵盤全程可用、NVDA/VoiceOver 讀得到 option 數量同 active；
- [ ] `/search?q=三上` 200，JSON-LD target 唔再 404；
- [ ] quick API 中位回應 < 150ms（Vercel function 日誌 queryTimeMs）。

### Phase 2 — 命中率同活動搜尋（目標：2–3 天）

1. DB：`CREATE EXTENSION pg_trgm`；actresses 加 `name_kana / name_romaji / aliases / search_text`；`scripts/backfill-search-fields.ts` 拆 name_cn ＋ OpenCC 簡繁變體 ＋ variant map；trigram GIN index。寫成 repo 跟開嘅 script 模式（env 跑一次），唔使 migration framework。
2. Scraper 寫入路徑一併填新欄（grep name_cn 寫入點）。
3. quick API 改用 search_text trigram ＋ similarity fallback（方案 1/2 SQL）。
4. `/api/events` 加參數化 `q`；`app/events/EventsClient.tsx` 同主頁活動 tab 加文字 filter input（debounce 250ms、min 1 字）；prefecture/type 順手參數化。
5. CompareClient 改用共用 `ActressSearchBox`（mode=quick），刪佢自寫嘅 doSearch；解競態、加 avatar/鍵盤/aria/失敗重試。
6. focus 空狀態顯示 ranking 頭 5 名「熱門女優」。

### Phase 3 — 打磨（有需要先做，唔排死期）

- 搜尋分析（最少成本做法：Vercel analytics 記 query 字串，唔入庫）→ 睇真實 zero-result 詞反哺別名表；
- name_cn 源頭清洗（scraper 規則修「ヒュージョン亀頭」呢類垃圾）；
- typeahead 入面混「相關活動」分組（要數據支持先好做）；
- `/events` 列表 server 分頁（如果活動量破萬）。

---

## 7. 「而家就要做」vs「過度設計唔好做」

### ✅ 而家就要做（Phase 1）

1. 主頁搜尋 debounce ＋ IME composition ＋ 最少字元 ＋ AbortController。
2. 解頁碼唔 reset／明確分開「搜尋女優」同「活動 filter」嘅 scope。
3. 輕量 quick API（唔好每次打字都行 ranking 大 query ＋ COUNT）。
4. 前綴權重排序、8 項 typeahead、「睇全部」、鍵盤同 ARIA、三種結果狀態。
5. `/search` 結果頁（兼修 SEO 壞鏈）。
6. 剷 Fuse.js 死碼，統一一條搜尋路徑。

### ❌ 過度設計，唔好做

1. ❌ 全站女優＋活動＋作品混合搜尋框（意圖唔同、資源唔值）。
2. ❌ Postgres FTS / tsvector（CJK 無原生分詞，Neon 裝唔到 jieba/zhparser）。
3. ❌ 引入 Meilisearch/Elasticsearch/typesense（7.6k 女優 + 2.7k 活動，trigram 已經落到毫秒）。
4. ❌ Server 熱門詞統計、向量語義搜尋、個人化、全螢幕手機 search overlay。
5. ❌ events 表而家建 trigram index（2.7k 行 seq scan 夠快）。
6. ❌ 自製 rate-limit middleware／排隊（edge cache ＋ debounce 先擋，見到數據超標再講）。
7. ❌ 再執 `SearchBar.tsx` 套 Fuse 死碼——重用歷史邏輯後成個剷走。

---

## 附：驗證指令速查

```bash
# 線上行為
curl "https://j-star-data.vercel.app/api/actresses?search=mikami&limit=5"
curl "https://j-star-data.vercel.app/api/actresses?search=a&limit=3"          # 1,507 條，1.4s（單字母問題）
curl -o /dev/null -w "%{http_code}\n" "https://j-star-data.vercel.app/search?q=x"  # 404（SEO 壞鏈）
# code 定位
grep -n "setSearch" app/HomeClient.tsx        # 冇 setPage(1) → P0-2
grep -rn "SearchBar" app components           # 只有 import，冇 render → 死碼
```
