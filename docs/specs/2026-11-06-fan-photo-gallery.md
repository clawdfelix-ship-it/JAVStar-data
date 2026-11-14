# 女優粉絲相冊（Fan Photo Gallery）技術 Spec

- 狀態：**待 Felix 審閱，未寫任何 production code**
- 日期：2026-11-06
- 負責：JCHING / IT
- 目標：每個女優頁（`/actress/[id]`）有一個「粉絲相冊」，讓粉絲上傳活動現場拍嘅靚相；**全部經人工審批先公開**。

---

## 1. 已拍板決策（Felix 2026-11-06）

| 決策點 | 結論 |
|---|---|
| 上傳者身份 | **必須留聯絡方法**（TG / email 任一）先可以上傳 |
| 審批方式（初期） | **全部人工 admin 審批先公開**，唔做自動發布、唔做白名單 |
| 相冊歸類 | **每女優一個相冊**，可選標註邊場活動（`event_id` 選填） |
| 交付方式 | 先出本 spec，審閱通過先寫 code |

---

## 2. 現成基建（無需新建，實查確認）

- `@vercel/blob@^2.8.2` 已喺 `package.json`；環境變數 `BLOB_READ_WRITE_TOKEN` 已設 → 圖片存儲直接用 Vercel Blob，token 只喺 server route 用，**永唔落 browser**。
- UGC 範式已有：`event_submissions`（公開提交 → pending → admin 審批），含 IP 限流、欄位長度收緊、女優 id 真實性驗證、`getClientIp()`（`lib/client-ip.ts`）。
- 統一 admin 後台 `app/admin/AdminClient.tsx`，現有 5 tab（女優情報/寫真集/活動報料/粉絲/訊息），加第 6 個「粉絲相冊」。
- 3-state 審批 UI／`requireAdmin`（`lib/auth.ts`，header `x-admin-token`，fail-closed）已成熟。
- 女優頁 `app/actress/[id]/ActressClient.tsx`（React 19 + SWR）可加 section。
- 展示組件建議 `react-photo-album`（拼貼網格）＋ `react-photo-view`（點擊大圖燈箱），需新增依賴。

---

## 3. 資料庫 Schema

新表 `actress_fan_photos`。migration 寫成 `scripts/migrate-actress-fan-photos.ts`，沿用 `process.loadEnvFile()`＋`CREATE TABLE IF NOT EXISTS`，冪等可重跑。

```sql
CREATE TABLE IF NOT EXISTS actress_fan_photos (
  id              BIGSERIAL PRIMARY KEY,
  actress_id      TEXT        NOT NULL,          -- FK → actresses.id，提交時驗證真實存在
  event_id        TEXT,                           -- 選填，軟關聯 events.id（TEXT，唔加硬 FK，活動可被刪）
  blob_url        TEXT        NOT NULL,           -- Vercel Blob 原圖 URL
  thumbnail_url   TEXT,                           -- 縮圖 URL（見 §5 縮圖策略，可先同 blob_url）
  caption         TEXT,                           -- 選填，粉絲留言，max 500
  submitter_contact TEXT      NOT NULL,           -- 必須：TG handle 或 email
  submitter_name  TEXT,                           -- 選填顯示名稱（公開展示用，預設「匿名粉絲」）
  ip              TEXT,                           -- getClientIp()，限流同審計
  status          TEXT        NOT NULL DEFAULT 'pending', -- pending / published / rejected
  admin_note      TEXT,                           -- 審批備註／拒絕原因
  width           INTEGER,                        -- 原圖寬度（react-photo-album 排版用）
  height          INTEGER,                        -- 原圖高度
  file_size       INTEGER,                        -- bytes，審計同上限檢查
  mime_type       TEXT,                           -- image/jpeg | image/webp | image/png
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at     TIMESTAMPTZ,
  reviewed_by     TEXT,                           -- 邊個 admin 批（可留 token 來源標記）
  CONSTRAINT fk_fanphoto_actress FOREIGN KEY (actress_id)
    REFERENCES actresses(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_afp_actress_status
  ON actress_fan_photos (actress_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_afp_status_created
  ON actress_fan_photos (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_afp_ip_created
  ON actress_fan_photos (ip, created_at DESC);
```

設計說明：
- **唔存圖片 binary 入 DB**，只存 Blob URL（同現有 `cover_url` 思路一致）。
- `actress_id` 硬 FK＋`ON DELETE CASCADE`：女優下架時相冊一併清，唔留孤兒。
- `event_id` 軟關聯：活動紀錄會被 admin 刪（見 `events-delete`），硬 FK 會擋刪除，故唔加 constraint，只喺 query 時 LEFT JOIN。
- `status` 預設 `pending`，**冇任何路徑可以由公開提交直接寫 published**。

---

## 4. API 設計

全部 `export const dynamic = 'force-dynamic'`，runtime 用預設（Blob put 需 Node，唔用 edge）。

### 4.1 `POST /api/fan-photos/upload` — 取上傳權限（階段一可合併入 4.2）

瀏覽器唔直接掂 token。Client 先攞預簽名／或直接 multipart 上傳畀自家 route。建議**簡化為單一 route 收 multipart**（見 4.2），避免 client 直連 Blob 帶嚟嘅類型繞過風險。

### 4.2 `POST /api/fan-photos` — 提交（multipart/form-data）

公開、無需登入，但有把關。欄位：
- `file`（必填，圖片）
- `actressId`（必填，numeric/string id，server 查 `actresses` 驗證存在）
- `contact`（**必填**，regex 驗證 TG handle `^@?[a-zA-Z0-9_]{4,}$` 或 email）
- `eventId`（選填）、`caption`（選填 ≤500）、`submitterName`（選填 ≤60）

Server 處理流程：
1. `getClientIp()` → IP 限流：**每 IP 每 10 分鐘最多 10 宗**（圖片比文字重，限得比報料 5 宗寬鬆啲，但仍設防）。
2. 檔案把關（**唔信 client 宣告嘅 MIME，亦唔假設 client 一定有壓縮**）：
   - 驗 magic bytes（JPEG `FFD8`、PNG `89504E47`、WebP `RIFF....WEBP`），唔係圖片即 400。
   - **client 端會先壓縮至 ≤3MB 先上傳（見 §5），但 server 硬上限設 3.5MB 兜底**——防止有人繞過表單、直接 curl 打 API 上大檔；超過即 413。
   - client 壓縮後統一輸出 `image/jpeg`（詳見 §5），server 預期收 jpeg；如收到 png/webp 原檔（繞過壓縮），只要過 magic bytes＋3.5MB 仍受理，但記 log。
   - 讀寬高（由 Blob metadata 或 image header parse），寫入 `width/height`。
3. `put(`fan-photos/${actressId}/${Date.now()}-${random}.${ext}`, file, { access: 'public', allowRandomExtension: false })` 入 Blob，路徑前綴 `fan-photos/` 方便日後管理／計費歸因。
4. INSERT `actress_fan_photos`，status 強制 `pending`。
5. 回 `201 { success:true, message:'收到！管理員審批後會喺女優頁顯示' }`，**唔回 row id、唔回 Blob URL**（避免提交者繞過審批直接擴散 URL）。

錯誤碼：400 欄位/檔案問題、404 女優不存在、413 超過 3.5MB、415 類型不符、429 限流、500 兜底。

### 4.3 `GET /api/fan-photos?actressId=<id>` — 公開讀取

- **只回 `status='published'`**，強制 WHERE，唔信任何參數切 status。
- 分頁 `page` / `page_size`（上限 60，預設 24，同 photobooks 一致）。
- 排序 `created_at DESC`（新相行先）；可選 `eventId` 篩選。
- 回傳欄位唔包 `ip`、`submitter_contact`、`admin_note`（隱私）；`submitter_name` 預設「匿名粉絲」。

### 4.4 `GET /api/admin/fan-photos?status=pending` — admin 列表

`requireAdmin` 把關，回全部欄位（含聯絡方法、IP），limit 200，同其他 admin route 風格一致。

### 4.5 `POST /api/admin/fan-photos` — admin 審批

`requireAdmin`。body：`{ id, action:'approve'|'reject', adminNote? }`
- approve → `status='published'`、set `reviewed_at`/`reviewed_by`
- reject → `status='rejected'` + `admin_note`
- **加批量**：`{ action, ids:[...] }`，沿用 photobooks 批量教訓——頂層單 id guard 要豁免陣列形 body；server 強制 `WHERE status='pending'`，冪等跳過已審項。
- 拒絕時**唔即時刪 Blob**（保留憑證，日後可加生命週期清理）。

---

## 5. 圖片壓縮與效能策略（client 端先壓縮，目標每張 ≤3MB）

**核心決策（Felix 2026-11-06）：瀏覽器端先壓縮到 3MB 以內先上傳**，唔將原圖傳上 server。好處：唔使引入 `sharp`（避開 Vercel serverless native binary 相容性）、慳出站帶寬、上傳快、Blob 存儲成本即時下降。

### 5.1 Client 端壓縮流程（`lib/fan-photos/compress.ts`，純瀏覽器 API、零依賴）

用原生 `Canvas` + `canvas.toBlob()`，唔使裝庫：

1. `createImageBitmap(file)` 讀原圖，讀原始 `width/height`。
2. **尺寸上限**：最長邊 > 2048px 就等比 downscale 到 2048（手機 4000px 相縮到 2048，視覺質素夠網頁展示＋燈箱用）。
3. 畫上 canvas，`canvas.toBlob(cb, 'image/jpeg', quality)` 輸出 **JPEG**（捨棄透明通道，相片類最細）。
4. **質量遞減循環**確保過到 3MB：
   - 初始 `quality = 0.9`；若輸出 > 3MB，降至 0.85 → 0.8 → 0.72 → 0.65，每次重新 `toBlob`。
   - 若降到 0.65 仍 > 3MB（極端大圖），再縮尺寸到最長邊 1600 重試。
   - 保底：最終仍超標就 block 提交，提示「圖片過大，請揀另一張」（實際 2048px JPEG 幾乎唔會發生）。
5. 回傳壓縮後 `Blob`（統一 `image/jpeg`）＋實際 `width/height`＋`fileSize`，交上傳 API。
6. UI 顯示壓縮前後體積（如「6.2MB → 2.4MB」）同進度，管理用戶預期。

### 5.2 為何 client 壓縮夠用、server 仍要兜底

- 正常用戶行瀏覽器表單，必經 §5.1，上傳嘅已係 ≤3MB JPEG。
- 但 API 係公開 endpoint，有人可繞過表單直接 curl 上大檔／其他格式，故 server 保留 **3.5MB 硬上限＋magic bytes 校驗**（§4.2）做縱深防禦，唔單靠 client。
- HEIC/HEIF（iPhone 預設格式）：`createImageBitmap` 對 HEIC 支援唔統一，表單 `accept` 限定 `image/jpeg,image/png,image/webp`；若用戶揀到 HEIC，`createImageBitmap` 失敗時提示「請轉存 JPEG/PNG 再上傳」。後續可考慮 `heic2any`（階段二）。

### 5.3 列表與燈箱

- 壓縮後 JPEG（最長邊 2048、≤3MB）已同時滿足列表拼貼同點擊燈箱大圖，**MVP 唔使另開縮圖管線**，`thumbnail_url` 暫同 `blob_url`。
- `<img loading="lazy">`＋react-photo-album 控制顯示尺寸；Vercel Blob CDN 邊緣快取。
- 記低壓縮後 `width/height` 餵 react-photo-album 做 justified layout，避免 CLS。
- **階段二（可選）**：若流量起嚟想再慳帶寬，先至加 server 端 webp 縮圖（最長邊 1200）分列表/原圖兩級；MVP 唔做。

---

## 6. 前端

### 6.1 女優頁相冊 section（`ActressClient.tsx` 加 block）

- SWR fetch `/api/fan-photos?actressId=`，淨 render published。
- `react-photo-album`（masonry/justified）＋ `react-photo-view` 燈箱，響應式手機先行。
- 冇相時顯示空狀態＋「上傳第一張活動相」CTA。
- 「📷 上傳活動相」按鈕開 modal/form。

### 6.2 上傳表單 component（新 `components/FanPhotoUploadForm.tsx`）

- 女優 id 由頁面帶入（fixed，唔俾自由打名，複用報料表單「只收配對女優」原則）。
- 活動下拉：`select` 列出該女優 `events`（可選「唔標註活動」）。
- 聯絡方法**必填**（TG/email），即場 regex 提示。
- 檔案 drag&drop/點選，`accept="image/jpeg,image/png,image/webp"`，client 端即場縮覽圖。
- **選定後即喺瀏覽器壓縮**（§5.1：downscale 至最長邊 2048、JPEG 質量遞減至 ≤3MB），顯示「原始 X MB → 壓縮 Y MB」；壓縮失敗/HEIC 不支援時即場提示，唔使等 server 拒。
- 必勾**聲明 checkbox**（未勾禁用提交掣）：
  > 我確認擁有呢張相嘅版權／獲授權上傳，內容為活動現場拍攝，同意 JCHING 於女優頁展示。
- 提交成功提示「待審批」，唔即時見到自己張相（管理期望）。

### 6.3 admin 第 6 tab「粉絲相冊」

- 新增 `app/admin/fan-photos/AdminClient.tsx`，掛入 `AdminClient.tsx` SECTIONS。
- pending 列表：縮圖、女優名、活動、caption、提交者聯絡、IP、時間、單張放大預覽。
- 單本 approve/reject＋剔選框批量（對齊寫真集 tab 交互）。
- rejected tab 可睇拒絕原因。

---

## 7. 安全、合規與濫用防護（成人 UGC 重點）

1. **強人工審批**：公開提交永遠入 pending；API 無任何自動 published 路徑。
2. **檔案真實性**：驗 magic bytes 而非 Content-Type；嚴限 MIME 同 server 3.5MB 硬上限（client 已先壓至 ≤3MB）；檔名用 server 生成 random，唔用上傳者檔名（防 path traversal／非法字符）。
3. **限流**：IP 10 分鐘 10 宗；聯絡方法做維度記錄，可日後加黑名單。
4. **隱私**：公開 API 唔回 IP／聯絡方法；DB 聯絡方法只 admin 可見。
5. **版權／肖像權聲明**：表單 checkbox＋站方移除政策（admin reject 即下架；收到投訴可由 admin 直接 reject/刪 row）。
6. **Vercel Blob 政策與成本（待確認）**：
   - 需確認 Vercel Blob 對成人題材相關用戶生成內容嘅 Acceptable Use 條款；本功能存嘅係**活動現場生活照**，唔存露骨內容，審批守則要明確「拒絕任何露骨/色情/非現場/侵權圖片」。
   - 成本：Blob 按存儲＋出站流量計費。**client 壓縮後每張 ≤3MB**，假設每月 200 張 ≈ 最多 600MB/月上傳（原圖 8MB 計會達 1.6GB，壓縮省約 63%）；仍建議喺 Vercel dashboard 設用量警示，日後加總量上限同生命週期清理。
7. **審批守則**（寫入 admin UI 提示）：只批 ① 活動現場照 ② 無露骨/違規 ③ 無第三方浮水印/盜圖 ④ 與該女優相關。

---

## 8. 遷移與上線步驟（審閱通過後）

1. 開 feature branch `feat/fan-photo-gallery`。
2. 寫 `scripts/migrate-actress-fan-photos.ts`，本機 `--env-file=.env.local` 跑 migration（先 dry 確認 DDL，再 execute）。
3. 加依賴 `react-photo-album`、`react-photo-view`。
4. 實作 client 壓縮 util（§5.1）、API 4.2–4.5、上傳表單、女優頁 section、admin tab。
5. 本機 `npm run build` ＋ 起 local server 端到端：用真實手機大圖測壓縮（驗 ≤3MB/≤2048px）、細圖 happy path、假 MIME/超大檔/缺聯絡/限流各 400/413/415/429、admin 審批後公開 API 先見到。
6. push branch → Vercel preview 驗證 → Felix 確認 → merge main 正式上線。
7. 上線後喺 Vercel 設 Blob 用量警示；首兩星期每日睇 pending  queue 同濫用情況。

## 9. 驗收準則

- [ ] 未審批圖片喺任何公開 API／頁面都搵唔到（含直接猜 URL 以外嘅 row 資料）。
- [ ] 假 MIME／非圖片／>3.5MB（server 兜底）全部被拒；client 壓縮正常輸出 ≤3MB JPEG。
- [ ] client 壓縮實測：一張 4000px、>5MB 手機相壓縮後 ≤3MB 且最長邊 ≤2048，畫面可接受（用 Vision/目測）。
- [ ] IP 限流生效（第 11 宗 429）。
- [ ] admin approve 後女優頁先顯示，reject 唔顯示；批量審批唔傷已審項。
- [ ] 公開 API 唔洩漏 IP／聯絡方法。
- [ ] 女優下架時其粉絲相冊 CASCADE 清走（FK 驗證）。
- [ ] 手機端上傳同相冊瀏覽順暢、無明顯 CLS。

## 10. 未做／後續

- 縮圖生成（§5 階段二）。
- 提交者黑名單、重複圖 hash 去重。
- 粉絲自己刪相（需驗聯絡方法 ownership，MVP 唔做，統一 admin 處理）。
- 相冊 RSS／sitemap、SEO（published 相片頁）。
