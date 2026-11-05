#!/usr/bin/env node
/**
 * 開通一個 IG 帳號進多帳號登記庫（跨 agent 重用）
 *
 * 用法：
 *   node scripts/ig-provision-account.mjs --list
 *       列出 long user token 下所有「已連 IG」專頁
 *
 *   node scripts/ig-provision-account.mjs --key tryfun --page-id 1122832664245069 [--prefix tryfun]
 *       用 user token 取該頁長效 page token、查 IG username，寫入 ig-accounts.json
 *
 * 憑證只落本機 secrets 檔（600），唔入 git、唔經對話。
 */
import {
  loadMetaConfig,
  loadRegistry,
  saveRegistry,
  listLinkedPages,
  graph,
} from "./lib/ig-accounts.mjs";

function arg(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const meta = loadMetaConfig();
  const userToken = meta.long_user_token;
  if (!userToken) throw new Error("缺 long_user_token — 先跑 ig-setup-longtoken.mjs");

  const pages = await listLinkedPages(userToken);

  if (process.argv.includes("--list")) {
    console.log(`已連 IG 專頁（${pages.length}）：\n`);
    for (const p of pages) console.log(`  page_id=${p.page_id}  ${p.page_name}  IG=${p.ig_user_id}`);
    return;
  }

  const key = arg("--key");
  const pageId = arg("--page-id");
  if (!key || !pageId) throw new Error("要畀 --key <帳號鍵> --page-id <專頁id>，或用 --list 睇清單");

  const page = pages.find((p) => p.page_id === pageId);
  if (!page) throw new Error(`專頁 ${pageId} 唔在已連 IG 清單（可能未連 IG 或無管理權）`);

  // 查 IG username 核對身份
  const igInfo = await graph(page.ig_user_id, {
    access_token: page.page_token,
    fields: "username,name,media_count",
  });

  const reg = loadRegistry();
  reg.accounts ||= {};
  reg.accounts[key] = {
    label: page.page_name,
    page_id: page.page_id,
    page_name: page.page_name,
    ig_user_id: page.ig_user_id,
    ig_username: igInfo.username,
    page_token: page.page_token,
    blob_prefix: arg("--prefix") || key,
    added_at: new Date().toISOString(),
  };
  saveRegistry(reg);

  console.log("✅ 已登記帳號：", key);
  console.log("   專頁：", page.page_name, `(${page.page_id})`);
  console.log("   IG：", "@" + igInfo.username, `(${page.ig_user_id})`, "| posts:", igInfo.media_count);
  console.log("   Blob 前綴：", reg.accounts[key].blob_prefix);
}

main().catch((e) => {
  console.error("❌", e.message);
  process.exit(1);
});
