#!/usr/bin/env node
/**
 * MFE IG 隊列發佈器（cron 每次 tick 只發下一條 pending，冪等可重入）
 * - 讀 mfe_publish_queue.json，取第一個 status=pending
 * - 調 ig-publish.mjs 正式發佈（--account jching）
 * - 成功→posted + permalink；失敗→attempts++，連續 3 次標 failed 並跳過（唔阻塞隊列）
 * - 全部完成→印 DONE，cron 可人手移除
 * 憑證經 IG_ACCOUNTS_FILE 環境變數指向 javstar-ops 登記庫
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const QUEUE = "/Users/siulungchan/.hermes/profiles/it/cache/scratch/mfe_ig_kit/mfe_publish_queue.json";
const REPO = "/Users/siulungchan/projects/JAVStar-data";
const REG = "/Users/siulungchan/.hermes/profiles/javstar-ops/secrets/ig-accounts.json";
const MAX_ATTEMPTS = 3;

const q = JSON.parse(readFileSync(QUEUE, "utf8"));
const item = q.items.find((x) => x.status === "pending");
if (!item) {
  const posted = q.items.filter((x) => x.status === "posted").length;
  const failed = q.items.filter((x) => x.status === "failed").length;
  console.log(`✅ 隊列清空：posted ${posted}/${q.total}，failed ${failed}。可移除 cron。`);
  process.exit(0);
}

item.attempts = (item.attempts || 0) + 1;
console.log(`▶️ 發佈中 [${item.actress_id}] ${item.name}（第 ${item.attempts} 次，IG @${item.instagram}）`);
try {
  const out = execFileSync(
    "node",
    ["scripts/ig-publish.mjs", "--account", q.account, "--image", item.image, "--caption-file", item.caption_file],
    { cwd: REPO, encoding: "utf8", env: { ...process.env, IG_ACCOUNTS_FILE: REG }, stdio: ["ignore", "pipe", "pipe"] }
  );
  const m = out.match(/permalink:\s*(\S+)/);
  const idm = out.match(/media id:\s*(\d+)/);
  item.status = "posted";
  item.permalink = m ? m[1] : "";
  item.media_id = idm ? idm[1] : "";
  item.published_at = new Date().toISOString();
  q.done = q.items.filter((x) => x.status === "posted").length;
  writeFileSync(QUEUE, JSON.stringify(q, null, 2));
  console.log(`✅ 已發 feed ${item.name} → ${item.permalink}（進度 ${q.done}/${q.total}）`);

  // 緊接發對應限時動態（同一張 4:5 圖；Graph STORIES 不支援 caption，24h 自動消失）
  try {
    const sout = execFileSync(
      "node",
      ["scripts/ig-story-publish.mjs", "--account", q.account, "--image", item.image],
      { cwd: REPO, encoding: "utf8", env: { ...process.env, IG_ACCOUNTS_FILE: REG }, stdio: ["ignore", "pipe", "pipe"] }
    );
    const sm = sout.match(/Story 已發佈 media id:\s*(\d+)/);
    item.story_media_id = sm ? sm[1] : "";
    item.story_published_at = new Date().toISOString();
    writeFileSync(QUEUE, JSON.stringify(q, null, 2));
    console.log(`📸 已發 Story ${item.name}（media ${item.story_media_id || "?"}）`);
  } catch (se) {
    // Story 失敗唔阻 feed（feed 已出）；記低等下次人工補
    item.story_error = (se.stderr || se.message || "").toString().slice(0, 300);
    writeFileSync(QUEUE, JSON.stringify(q, null, 2));
    console.log(`⚠️ ${item.name} feed 已發但 Story 失敗：${item.story_error}`);
  }
} catch (e) {
  item.last_error = (e.stderr || e.message || "").toString().slice(0, 300);
  if (item.attempts >= MAX_ATTEMPTS) {
    item.status = "failed";
    console.log(`⛔ ${item.name} 連續 ${MAX_ATTEMPTS} 次失敗，標 failed 跳過：${item.last_error}`);
  } else {
    console.log(`⚠️ ${item.name} 第 ${item.attempts} 次失敗（下次 tick 重試）：${item.last_error}`);
  }
  writeFileSync(QUEUE, JSON.stringify(q, null, 2));
  process.exit(1);
}
