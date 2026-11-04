#!/usr/bin/env node
/**
 * JCHING → @jching.calendar IG 自動發佈
 *
 * 讀 ~/.config/jching-poster.json 產出嘅海報圖，經 IG Graph API 兩步發佈：
 *   1) POST {ig}/media        建立 container（支援單圖、多圖 carousel、reel）
 *   2) poll status FINISHED
 *   3) POST {ig}/media_publish 公開發佈
 *
 * 憑證全部由 secrets/.meta_ig_config.json 讀取（long_page_token），唔寫死。
 *
 * 用法：
 *   node scripts/ig-publish.mjs --image /tmp/poster.jpg --caption "..." [--dry-run]
 *   node scripts/ig-publish.mjs --images a.jpg b.jpg --caption "..."   # carousel 2-10 張
 *   node scripts/ig-publish.mjs --reel video.mp4 --cover cover.jpg --caption "..."
 *
 * --dry-run：只建 container＋驗證，唔 media_publish（唔會公開出帖）
 */
import { readFileSync, existsSync, chmodSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve, basename } from "node:path";
import { createServer } from "node:http";
import { extname } from "node:path";
import { put } from "@vercel/blob";

const API = "https://graph.facebook.com/v21.0";
const CFG = join(homedir(), ".hermes/profiles/javstar-ops/secrets/.meta_ig_config.json");
const DRY = process.argv.includes("--dry-run");

function arg(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
function args(name) {
  const out = [];
  for (let i = 0; i < process.argv.length; i++) if (process.argv[i] === name) out.push(process.argv[i + 1]);
  return out;
}

async function graph(path, params = {}, method = "GET") {
  const url = `${API}/${path}?${new URLSearchParams(params)}`;
  const r = await fetch(url, { method });
  const j = await r.json();
  if (j.error) throw new Error(`${method} ${path} → ${j.error.message} (code ${j.error.code})`);
  return j;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 載入 .env.local（BLOB_READ_WRITE_TOKEN），唔依賴啟動 flag
function loadEnvLocal() {
  const p = join(process.cwd(), ".env.local");
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
loadEnvLocal();

// IG 只收公開 URL：http(s) 直接用；本地檔案自動上 Vercel Blob（ig/ 前綴）
async function ensurePublicUrl(fileOrUrl) {
  if (/^https?:\/\//.test(fileOrUrl)) return fileOrUrl;
  const p = resolve(fileOrUrl);
  if (!existsSync(p)) throw new Error(`搵唔到檔案：${p}`);
  if (!process.env.BLOB_READ_WRITE_TOKEN)
    throw new Error("缺 BLOB_READ_WRITE_TOKEN（.env.local），無法上傳本地檔案到 Blob");
  const pathname = `ig/${new Date().toISOString().slice(0, 10)}-${basename(p)}`;
  const blob = await put(pathname, readFileSync(p), {
    access: "public",
    allowOverwrite: true,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });
  console.log("☁️  已上傳 Blob：", blob.url);
  return blob.url;
}

async function main() {
  const cfg = JSON.parse(readFileSync(CFG, "utf8"));
  const token = cfg.long_page_token;
  const ig = cfg.ig_user_id;
  if (!token) throw new Error("缺 long_page_token — 先行 scripts/ig-setup-longtoken.mjs");
  if (!ig) throw new Error("缺 ig_user_id");
  if (cfg.ig_username !== "jching.calendar") {
    console.warn("⚠️  目標帳號係", cfg.ig_username, "，唔係 jching.calendar，確認先好繼續");
  }

  const caption = arg("--caption") ?? "";
  const single = arg("--image");
  const multi = args("--images");
  const reel = arg("--reel");

  let creationId;
  if (multi.length >= 2) {
    // carousel: child containers (no caption) -> parent container
    const childIds = [];
    for (const f of multi) {
      const url = await ensurePublicUrl(f);
      const c = await graph(`${ig}/media`, { access_token: token, image_url: url, is_carousel_child: "true" }, "POST");
      childIds.push(c.id);
      console.log("child container:", c.id, basename(f));
    }
    const parent = await graph(
      `${ig}/media`,
      { access_token: token, media_type: "CAROUSEL", children: childIds.join(","), caption },
      "POST"
    );
    creationId = parent.id;
  } else if (reel) {
    const url = await ensurePublicUrl(reel);
    const cover = arg("--cover");
    const params = { access_token: token, media_type: "REELS", video_url: url, caption };
    if (cover) params.cover_url = await ensurePublicUrl(cover);
    creationId = (await graph(`${ig}/media`, params, "POST")).id;
  } else if (single) {
    const url = await ensurePublicUrl(single);
    creationId = (await graph(`${ig}/media`, { access_token: token, image_url: url, caption }, "POST")).id;
  } else {
    throw new Error("要畀 --image / --images（≥2）/ --reel 其中一個");
  }
  console.log("media container:", creationId);

  // poll until FINISHED
  for (let i = 0; i < 30; i++) {
    const st = await graph(creationId, { access_token: token, fields: "status_code,status" });
    process.stdout.write(`\rstatus [${i + 1}/30]: ${st.status_code}   `);
    if (st.status_code === "FINISHED") break;
    if (st.status_code === "ERROR" || st.status_code === "EXPIRED")
      throw new Error("container 失敗：" + st.status);
    await sleep(2000);
  }
  process.stdout.write("\n");

  if (DRY) {
    console.log("🔒 dry-run：container 已就緒但冇公開發佈。id =", creationId);
    return;
  }
  const pub = await graph(`${ig}/media_publish`, { access_token: token, creation_id: creationId }, "POST");
  console.log("✅ 已發佈 media id:", pub.id);
  const info = await graph(pub.id, { access_token: token, fields: "permalink,thumbnail_url,timestamp" });
  console.log("permalink:", info.permalink ?? "(reel 可能要等陣先有)");
  console.log("timestamp:", info.timestamp);
}

main().catch((e) => {
  console.error("❌", e.message);
  process.exit(1);
});
