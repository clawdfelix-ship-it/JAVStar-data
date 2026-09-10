# J-STAR CALENDAR 響應式功能一致性審計（桌面 vs 手機）

- 日期：2026-09-10
- 審計員：TestingRealityChecker（證據優先，默認「需要改進」）
- 生產站：https://j-star-data.vercel.app
- 桌面 1440×900 / 手機 iPhone 390×844
- 截圖目錄：`docs/research/parity-2026-09-10/`

## 總表

| 功能 | 桌面 | 手機 | 狀態 |
|---|---|---|---|
| AgeGate 彈出/兩按鈕/條款連結/denied 流程 | 待測 | 待測 | ⏳ |
| 主頁搜尋即時 filter | ✅ 真實鍵入即 filter（「波多野」→7 個連結） | 待測 | ⏳ |
| 女優排名卡列表/分頁 | ✅ 10 卡/頁，760 頁 | 待測 | ⏳ |
| 卡片投票 VoteButton | ⚠️ POST 200 成功，但**點擊熱區 85% 被圖片 overlay 搶佔** | 待測 | ⏳ |
| 排序 select（7 項） | ✅ 切換 votes_all 生效 | 待測 | ⏳ |
| 「只顯示有活動」篩選 | ✅ aria-pressed 切換，「暫無公開活動」卡被濾走 | 待測 | ⏳ |
| 每日女優盲盒 | ✅ 抽取→顯示女優（東條なつ） | 待測 | ⏳ |
| AuctionPromoBanner 實時數據 | ✅ 顯示現價/口數/倒數（$45 2口 14h56m），連去拍賣站 | 待測 | ⏳ |
| 每月新作 + 顯示全部/分頁 | ✅ 存在，7 頁 | 待測 | ⏳ |
| email 訂閱 | ✅ POST 200「已訂閱」+ 頁面 feedback | 待測 | ⏳ |
| 統計按鈕（排名/日曆/列表） | ✅ scroll-to-section | 待測 | ⏳ |
| 頂部 sticky 欄 | ⚠️ 只有統計 tab，**無 /events /compare 入口、無 logo/首頁連結** | 待測 | ⏳ |
| 全站導航 /events /compare | ⚠️ 桌面僅存在於隱藏的手機 BottomNav（display:none），桌面**無任何可見入口** | 待測 | ⏳ |
| /events 月曆 | 待測 | 待測 | ⏳ |
| /compare | 待測 | 待測 | ⏳ |
| /actress/[id] | ✅ 資料/返回/投票(POST 200)/最愛/分享/時間線齊全 | 待測 | ⏳ |
| /terms /privacy | 待測（footer **無**法律頁連結，僅 AgeGate 內有） | 待測 | ⏳ |
| 橫向溢出 | ✅ scrollWidth=1440=innerWidth | 待測 | ⏳ |

## 發現明細（按 route 記錄）

### 桌面 1440×900 — 主頁 `/`
- AgeGate：首次載入彈出（z-100 fixed inset-0），兩按鈕 400×48；條款/私隱連結可點（href=/terms、/privacy）。
- Denied：「我未滿18歲」→ 二次畫面，「離開網站」實為 `<a href="https://www.google.com/">`（正常離站），「我撳錯咗」可返回。confirm 後 localStorage 寫入 `jstar-…date=2026-09-10`（key 名被瀏覽器顯示截斷，實際前綴 jstar-）。
- 截圖 d-01-agegate.png。
- **問題 D-H1（桌面導航缺失，P1）**：桌面 viewport 下 `/events` 與 `/compare` 唯一的站內入口在手機 BottomNav（`nav.md:hidden`），桌面 `display:none`；桌面 sticky 頂欄（`.sticky.top-0`）只有「女優排名/活動日曆/活動列表」錨點，沒有 logo 首頁連結、沒有 /events 月曆頁、沒有 /compare 入口。用戶只能直接打 URL 去 /events、/compare。footer 亦無該等連結。
- **問題 D-H2（法律頁入口，P2）**：footer 無 /terms、/privacy 連結；桌面確認 AgeGate 後全站找不到法律頁入口（AgeGate 關閉後消失）。
- **問題 D-H3（卡片投票點擊熱區被覆蓋，P1）**：排名卡 VoteButton（`button[title="每月可以投一次"]`，108.8×44px）坐標中心 elementFromPoint 命中的是 `.absolute.bottom-0` 圖片 overlay 而非按鈕；7 個採樣點中僅頂緣 1 點命中按鈕，其餘被絕對定位層搶佔 → 普通用戶點卡片上的票數位會誤跳女優詳情頁。功能本身正常（點中可點區域 POST /api/actresses/631323/vote 200，回傳 vote_count:1）。
- 投票 API 觀察：頁面載入時自動 GET vote 狀態（200，has_voted:false）。
- email 訂閱：POST 200 `{"success":true,"message":"已訂閱…"}`，頁面有 feedback 文案。
- 無橫向溢出（scrollWidth 1440）。

### 桌面 — /actress/631323
- 資料齊：生日/身高/三圍/標籤/外部連結（官網、twitter、minnano-av、av-event）。
- 投票掣「0 本月投票」POST 200 → vote_count 1。
- 最愛 🤍→❤️，寫入 localStorage `javstar_favorites`。
- 分享 📤 dropdown 含「複製鏈接」。
- 返回「← 返回排名」存在（href=/）。
- 活動時間線存在（19 個活動）。
- 截圖 d-02-actress.png；scrollWidth=1440 無溢出。

### 桌面 — /events
- 左右切月正常（9月 2026 → 10月 2026）。
- 點日期（25 日）右側列表顯示該日活動卡（連 av-event 外站 event/41122，含類型「店頭/サイン」、日期）；有「顯示全部日期」掣。
- 「活動類型：簽名/出道/直播/實體/線上」**係圖例（legend）唔係篩選掣**（span，無 aria-pressed、無 button）——屬設計，唔係 bug，但 /events 冇真正類型篩選。
- 有「← 返回」回主頁。scrollWidth=1440。截圖 d-03-events.png。

### 桌面 — /compare
- 兩個搜尋框，輸入即出建議（合成 input event 已可觸發，唔使真鍵盤），揀 A=波多野結衣、B=木村愛心 後出完整比較表（年齡/身高/罩杯/三圍/星座/出道/2026活動/總活動/投票數/評分/事務所/興趣），勝方有 ★，各卡有「移除」掣。功能完整。scrollWidth=1440。

### 桌面 — /terms /privacy
- 內容完整（824/811 字），main 寬 672px 可讀。
- **問題 D-L1（P2）**：兩頁**完全冇可見返回入口**——站內連結（/、/events、/compare）全部 offsetParent=null（隱藏），用戶只能靠瀏覽器返回。對比 /events、/compare、/actress 都有「← 返回」，法律頁漏配。

---

## 手機 390×844 測試結果（事後補錄）

### 手機 — 主頁 `/`
- AgeGate 正常彈出、通過；BottomNav 3 tab 實測各 **52px 高**（≥44px 觸控標準）；無橫向溢出。
- 搜尋即時 filter ✅、排序（如「年齡」→ 翔田千里行先）✅、「只顯示有活動」✅、每日女優盲盒 ✅、拍賣廣告橫滑 ✅、email 訂閱 ✅。
- 投票狀態跨裝置一致：桌面投嘅票，手機女優頁顯示「1 已投·本月」（證明真寫入後端）。
- **問題 M-H1（投票熱區，P1，同 D-H3 一致）**：手機卡片 VoteButton 中心同樣被 `.absolute.bottom-0` overlay 搶佔，只有頂部約 15–35%（~15px 窄條）可點。**兩端「一致地壞」**。
- **問題 M-H2（投票無成功提示，P2）**：喺可點條點擊後 API 200、票數 +1，但冇 toast／狀態反應，用戶唔知成功未（桌面同樣唔見明確提示）。
- **問題 M-H3（無空狀態，P2，兩端一致）**：搜尋/篩選零結果時 main 只有 260px 高、顯示「0」，冇友善文案。**返工桌面核實：桌面同樣缺空狀態**（先前以為係手機獨有，已排除）。
- BottomNav 冇遮擋 footer / email 訂閱區。

### 手機 — /events（BottomNav 真實點擊進入）
- 月曆 + 單日列表堆疊正常；切月、揀日、返回 ✅。
- **地區篩選「全部/日本/台灣/香港」+ 都道府縣手機可互動**（點「香港」後活動連結 1→0，實測生效）。
- ⚠️ 初測桌面時以為呢個篩選係手機獨有 → **返工桌面 1440 核實：桌面都有地區篩選且可互動，功能一致**（之前漏看，此處撤銷該疑似差異）。
- 截圖 m-03-events.png，無溢出。

### 手機 — /compare
- 兩個搜尋框、出建議、揀人、完整比較表、移除掣全部可用；無溢出（m-04-compare.png）。

### 手機 — /actress/[id]
- 資料、返回、投票（顯示已投狀態）、最愛、分享、時間線齊全（m-05-actress.png）。

### 手機 — /terms /privacy
- 內容可讀；**手機有 fixed BottomNav 可以走**，唔算死路；桌面則冇任何可見返回（見 D-L1）。

---

## 最終裁決

# 🔴 需要改進（NEEDS IMPROVEMENT）

**核心功能其實兩端一致**：搜尋、排序、篩選（含 /events 地區篩選，兩端都有）、盲盒、拍賣廣告、email 訂閱、月曆、比較、女優詳情、投票 API、最愛、分享——手機同桌面全部運作正常，跨裝置狀態一致。

但有 2 個 P1 令「功能一致性」唔合格：

### P1（必修）
| # | 問題 | 影響 |
|---|---|---|
| 1 | **桌面冇 /events、/compare 入口**：只存在於 `md:hidden` 手機 BottomNav，桌面 sticky 欄同 footer 都冇；連 logo 首頁連結都冇 | 桌面用戶只能靠直接打 URL，兩個主功能對桌面用戶形同不存在 |
| 2 | **排名卡 VoteButton 85% 熱區被圖片 overlay 覆蓋**（D-H3 = M-H1，兩端一致），誤點會跳女優詳情頁 | 投票呢個核心互動普通用戶幾乎用唔到，且行為似 bug（點票數跳頁） |

### P2（打磨）
| # | 問題 |
|---|---|
| 3 | 投票成功冇 toast/視覺反馈（兩端） |
| 4 | 零結果冇空狀態文案，淨顯示「0」（兩端） |
| 5 | 桌面法律頁 /terms /privacy 冇返回入口（手機有 BottomNav）；footer 冇法律頁連結（兩端） |

**建議修法**
1. 桌面 sticky 欄（md 以上）補：logo（連 /）＋「活動月曆」(/events)「比較」(/compare) 連結；BottomNav 維持 `md:hidden`。
2. ActressCard：VoteButton 加 `relative z-10`，或將 overlay 嘅 `pointer-events` 限制喺圖片區（例如 overlay `pointer-events-none`、卡內連結另行包裹），令按鈕喺 stacking 上層。
3. VoteButton onClick 成功後出 toast（站內已有 toast 模式可復用）。
4. 零結果出「暫無符合條件嘅女優，試下其他關鍵字」空狀態。
5. /terms /privacy 加「← 返回首頁」；footer 補法律連結。

> 定性/手動測試聲明：本審計為雙 viewport 手動操作取證，非自動化回歸；截圖存 `parity-2026-09-10/`（d-* 桌面、m-* 手機）。
