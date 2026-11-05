#!/usr/bin/env node
/**
 * IG 限時動態（Stories）發佈器
 *
 * 與 feed 分開：Graph API 的 STORIES 媒體「不接受 caption」，故只有圖片。
 * 規格：建議 9:16；4:5 圖亦可通過（app 內上下留空，非全屏）。
 * 流程同 ig-publish.mjs：本地檔→Vercel Blob→STORIES container→輪詢→media_publish
 *
 * 用法：
 *   node scripts/ig-story-publish.mjs --account jching --image p.jpg [--dry-run]
 * 憑證：IG_ACCOUNTS_FILE 環境變數指向登記庫；Blob token 由 .env.local 提供
 */
import { readFileSync, existsSync } from "node:fs";
import { join, resolve, basename } from "node:path";
import { put } from "@vercel/blob";
import { getAccount, graph } from "./lib/ig-accounts.mjs";

const DRY = process.argv.includes("--dry-run");
function arg(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function loadEnvLocal() {
  const p = join(process.cwd(), ".env.local");
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
loadEnvLocal();

async function ensurePublicUrl(fileOrUrl, prefix) {
  if (/^https?:\/\//.test(fileOrUrl)) return fileOrUrl;
  const p = resolve(fileOrUrl);
  if (!existsSync(p)) throw new Error(`搵唔到檔案：${p}`);
  if (!process.env.BLOB_READ_WRITE_TOKEN)
    throw new Error("缺 BLOB_READ_WRITE_TOKEN（.env.local），無法上傳本地檔案到 Blob");
  const pathname = `ig/${prefix}/${new Date().toISOString().slice(0, 10)}-story-${basename(p)}`;
  const blob = await put(pathname, readFileSync(p), {
    access: "public", allowOverwrite: true, token: process.env.BLOB_READ_WRITE_TOKEN,
  });
  console.log("☁️  Story Blob：", blob.url);
  return blob.url;
}

async function main() {
  const accountKey = arg("--account") || process.env.IG_ACCOUNT || "jching";
  const image = arg("--image");
  if (!image) throw new Error("要畀 --image <圖片>");
  const acc = getAccount(accountKey);
  const token = acc.page_token, ig = acc.ig_user_id;
  const prefix = acc.blob_prefix || accountKey;
  console.log(`🎯 Story 目標：${accountKey} → @${acc.ig_username}`);

  const url = await ensurePublicUrl(image, prefix);
  const creationId = (await graph(`${ig}/media`, {
    access_token: token, image_url: url, media_type: "STORIES",
  }, "POST")).id;
  console.log("story container:", creationId);

  for (let i = 0; i < 30; i++) {
    const st = await graph(creationId, { access_token: token, fields: "status_code,status" });
    process.stdout.write(`\rstatus [${i + 1}/30]: ${st.status_code}   `);
    if (st.status_code === "FINISHED") break;
    if (st.status_code === "ERROR" || st.status_code === "EXPIRED")
      throw new Error("story container 失敗：" + st.status);
    await sleep(2000);
  }
  process.stdout.write("\n");

  if (DRY) {
    console.log("🔒 dry-run：story container 就緒但冇公開發佈。id =", creationId);
    return;
  }
  const pub = await graph(`${ig}/media_publish`, { access_token: token, creation_id: creationId }, "POST");
  console.log("✅ Story 已發佈 media id:", pub.id, "（story 24h 後自動消失，無永久 permalink）");
}

main().catch((e) => { console.error("❌", e.message); process.exit(1); });
