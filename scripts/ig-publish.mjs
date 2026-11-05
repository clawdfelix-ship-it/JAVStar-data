#!/usr/bin/env node
/**
 * IG 多帳號自動發佈（跨 agent 通用）
 *
 * 帳號由登記庫管理：secrets/ig-accounts.json（用 ig-provision-account.mjs 開通）。
 * 預設帳號 jching；其他 agent／帳號用 --account <key> 切換，或設 IG_ACCOUNT 環境變數。
 *
 * 流程：本地檔→Vercel Blob（依帳號前綴）→ IG media container → 輪詢 → media_publish
 *
 * 用法：
 *   node scripts/ig-publish.mjs --account jching --image p.jpg --caption "..." [--dry-run]
 *   node scripts/ig-publish.mjs --account tryfun --images a.jpg b.jpg --caption "..."
 *   node scripts/ig-publish.mjs --list                      # 列出登記庫帳號
 *   node scripts/ig-publish.mjs --image p.jpg --caption-file cap.txt --dry-run   # 預設 jching
 *
 * --dry-run：只建 container＋驗證，唔 media_publish（唔會公開出帖）
 */
import { readFileSync, existsSync } from "node:fs";
import { join, resolve, basename } from "node:path";
import { put } from "@vercel/blob";
import { loadRegistry, getAccount, graph } from "./lib/ig-accounts.mjs";

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
  const pathname = `ig/${prefix}/${new Date().toISOString().slice(0, 10)}-${basename(p)}`;
  const blob = await put(pathname, readFileSync(p), {
    access: "public",
    allowOverwrite: true,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });
  console.log("☁️  已上傳 Blob：", blob.url);
  return blob.url;
}

async function main() {
  if (process.argv.includes("--list")) {
    const reg = loadRegistry();
    const keys = Object.keys(reg.accounts || {});
    if (!keys.length) return console.log("登記庫暫無帳號，先用 ig-provision-account.mjs 開通");
    for (const k of keys) {
      const a = reg.accounts[k];
      console.log(`  ${k.padEnd(12)} @${a.ig_username}  (${a.page_name})`);
    }
    return;
  }

  const accountKey = arg("--account") || process.env.IG_ACCOUNT || "jching";
  const acc = getAccount(accountKey);
  const token = acc.page_token;
  const ig = acc.ig_user_id;
  console.log(`🎯 目標帳號：${accountKey} → @${acc.ig_username}（${acc.page_name}）`);

  const caption = arg("--caption-file")
    ? readFileSync(resolve(arg("--caption-file")), "utf8").trim()
    : arg("--caption") ?? "";
  const single = arg("--image");
  const multi = args("--images");
  const reel = arg("--reel");
  const prefix = acc.blob_prefix || accountKey;

  let creationId;
  if (multi.length >= 2) {
    const childIds = [];
    for (const f of multi) {
      const url = await ensurePublicUrl(f, prefix);
      const c = await graph(`${ig}/media`, { access_token: token, image_url: url, is_carousel_child: "true" }, "POST");
      childIds.push(c.id);
      console.log("child container:", c.id, basename(f));
    }
    creationId = (
      await graph(
        `${ig}/media`,
        { access_token: token, media_type: "CAROUSEL", children: childIds.join(","), caption },
        "POST"
      )
    ).id;
  } else if (reel) {
    const url = await ensurePublicUrl(reel, prefix);
    const cover = arg("--cover");
    const params = { access_token: token, media_type: "REELS", video_url: url, caption };
    if (cover) params.cover_url = await ensurePublicUrl(cover, prefix);
    creationId = (await graph(`${ig}/media`, params, "POST")).id;
  } else if (single) {
    const url = await ensurePublicUrl(single, prefix);
    creationId = (await graph(`${ig}/media`, { access_token: token, image_url: url, caption }, "POST")).id;
  } else {
    throw new Error("要畀 --image / --images（≥2）/ --reel 其中一個");
  }
  console.log("media container:", creationId);

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
