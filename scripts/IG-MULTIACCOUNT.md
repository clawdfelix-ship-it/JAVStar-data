# IG 多帳號自動化（跨 Agent 共用）

一套 Meta App 管理多個 Instagram 專業帳號，帳號憑證集中喺本機登記庫，各 agent 用 `--account <key>` 切換，唔使各自 OAuth。

## 檔案

| 檔案 | 角色 |
|---|---|
| `scripts/lib/ig-accounts.mjs` | 共用核心：登記庫讀寫、Graph 呼叫、列已連 IG 專頁 |
| `scripts/ig-provision-account.mjs` | 一次性開通某帳號入登記庫（換 page token＋查 username） |
| `scripts/ig-publish.mjs` | 發佈器：本地檔→Blob→IG，支援單圖/carousel/Reel，`--dry-run` |
| `~/.hermes/profiles/javstar-ops/secrets/.meta_ig_config.json` | App 層：`app_id`/`app_secret`/`long_user_token`（60 日，可列所有專頁） |
| `~/.hermes/profiles/javstar-ops/secrets/ig-accounts.json` | **帳號登記庫（600）**：每帳號 page token、IG id、username、Blob 前綴 |

登記庫路徑可用環境變數 `IG_ACCOUNTS_FILE` 覆寫，方便其他 Hermes profile／agent 指向同一檔案共用。

## 開通新帳號（一次性）

前提：該 IG 已轉專業帳號並連結一個你有管理權嘅 FB 專頁，且已喺 App 授權（`instagram_content_publish` 等 scope）。

```bash
cd ~/projects/JAVStar-data
# 1. 列出所有「已連 IG」可開通專頁
node scripts/ig-provision-account.mjs --list

# 2. 開通（key 係自訂短名，agent 呼叫用；prefix 係 Blob 資料夾前綴）
node scripts/ig-provision-account.mjs --key tryfun --page-id 673007125896056 --prefix tryfun
```

成功後憑證寫入 `ig-accounts.json`（600），唔入 git、唔經對話。

## 發佈（任何 agent）

```bash
# 預覽（建 container，唔出帖）——本地圖自動上 Blob（依帳號前綴分資料夾）
node scripts/ig-publish.mjs --account tryfun --image poster.png --caption-file cap.txt --dry-run

# 正式發
node scripts/ig-publish.mjs --account tryfun --image poster.png --caption-file cap.txt

# carousel（2-10 張）／Reel
node scripts/ig-publish.mjs --account tryfun --images a.jpg b.jpg --caption "..."
node scripts/ig-publish.mjs --account tryfun --reel v.mp4 --cover c.jpg --caption "..."

# 列登記庫帳號；不帶 --account 時預設 jching（或用 IG_ACCOUNT 環境變數）
node scripts/ig-publish.mjs --list
```

## 分帳隔離與風險

- **合規連坐**：同一 Meta App 下一個帳號被 IG 判違規，可能牽連 App 權限。高風險／adult-adjacent 題材帳號建議**另開獨立 Meta App**（獨立 app_id/secret/token），唔好共用。
- 一般商業帳號（零售、餐飲、運動等）可共用現 App。
- 每帳號獨立 **100 帖/24h** 額度，唔互相搶用。
- Blob 路徑按 `blob_prefix` 分資料夾（`ig/<prefix>/...`），唔同帳號素材唔會溝。

## IG Graph API 已知限制（2026-11 實測）

- App 預設**開發模式**：`business_discovery` 回 `#10`，攞唔到人哋 IG 內部 ID → 用唔到可點擊 `user_tags`；caption 純文字 `@handle` 唔變連結。要可點擊 tag 需過 App Review。
- **唔支援刪帖、唔支援改 caption**（`POST /{media}` 回 `#3 Unknown method`）：出錯只能人手喺 IG app 處理，所以正式發前一定 `--dry-run` 核對。
- 只收公開 HTTPS 圖片 URL，本地檔一律先上 Vercel Blob。
- 內容合規：caption/hashtag 禁用「AV、成人、色情、18禁、R18」等字眼，出帖前過敏感字。

## Token 生命週期

- `long_user_token`：約 60 日，到期前重跑 `ig-setup-longtoken.mjs` 換新；換完要對各帳號重跑 provision 刷新 page token。
- 帳號 `page_token`：由長效 user token 衍生，理論上無過期，但 user token 失效會一齊失效。
