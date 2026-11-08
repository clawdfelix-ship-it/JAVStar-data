#!/usr/bin/env node
/**
 * MFE IG Story 隊列發佈器：每次 tick 只發下一張 pending Story，不發 feed。
 * 圖片及 queue 放在 jching profile 持久 data 目錄，避免 scratch 自動清理。
 * 成功後記錄 media id；失敗最多重試 3 次，之後標 failed 並跳過。
 */
import { readFileSync, writeFileSync, renameSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { REGISTRY } from "./lib/ig-accounts.mjs";

const BASE = "/Users/siulungchan/.hermes/profiles/jching/data/mfe-story-queue";
const QUEUE = join(BASE, "mfe_story_queue.json");
const REPO = "/Users/siulungchan/projects/JAVStar-data";
const REG = REGISTRY;
const MAX_ATTEMPTS = 3;

function save(q) {
  q.done = q.items.filter((x) => x.status === "posted").length;
  const tmp = `${QUEUE}.tmp`;
  writeFileSync(tmp, JSON.stringify(q, null, 2) + "\n");
  renameSync(tmp, QUEUE);
}

const q = JSON.parse(readFileSync(QUEUE, "utf8"));
const item = q.items.find((x) => x.status === "pending");
if (!item) process.exit(0); // 完成後保持靜默，cron 不再發通知。

item.attempts = (item.attempts || 0) + 1;
console.log(`▶️ 發佈 Story [${item.actress_id}] ${item.name}（第 ${item.attempts} 次，IG @${item.instagram}）`);

try {
  const storyPng = join(BASE, "stories", `${item.actress_id}_9x16.png`);
  const env = { ...process.env, IG_ACCOUNTS_FILE: REG };
  execFileSync(
    "node",
    ["scripts/ig-story-9x16.mjs", "--id", item.actress_id, "--poster", item.image, "--out", storyPng],
    { cwd: REPO, encoding: "utf8", env, stdio: ["ignore", "pipe", "pipe"] },
  );
  const out = execFileSync(
    "node",
    ["scripts/ig-story-publish.mjs", "--account", q.account, "--image", storyPng],
    { cwd: REPO, encoding: "utf8", env, stdio: ["ignore", "pipe", "pipe"] },
  );
  const match = out.match(/Story 已發佈 media id:\s*(\d+)/);
  if (!match) throw new Error(`發佈器冇回傳 media id：${out.slice(0, 300)}`);
  item.status = "posted";
  item.story_media_id = match[1];
  item.story_published_at = new Date().toISOString();
  item.story_format = "9x16";
  delete item.last_error;
  save(q);
  console.log(`📸 已發 9:16 Story ${item.name}（media ${item.story_media_id}；進度 ${q.done}/${q.total}）`);
} catch (e) {
  item.last_error = (e.stderr || e.message || "").toString().slice(0, 500);
  if (item.attempts >= MAX_ATTEMPTS) {
    item.status = "failed";
    console.log(`⛔ ${item.name} 第 ${MAX_ATTEMPTS} 次失敗，標 failed 跳過：${item.last_error}`);
  } else {
    console.log(`⚠️ ${item.name} 第 ${item.attempts} 次失敗（下個 tick 重試）：${item.last_error}`);
  }
  save(q);
  process.exit(1);
}
