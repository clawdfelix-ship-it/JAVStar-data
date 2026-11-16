#!/usr/bin/env node
/**
 * 篠原伊代香港活動 IG Story 隊列：兩張海報（1121/1122）輪流 loop。
 * 每次 tick 發下一張，兩張都出完自動重設 pending。
 * 成功記 media id；失敗最多重試 3 次，之後標 failed 跳過。
 */
import { readFileSync, writeFileSync, renameSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const BASE = "/Users/siulungchan/.hermes/profiles/jching/data/shinohara-2026-11";
const QUEUE = join(BASE, "story_queue.json");
const OUT_DIR = join(BASE, "stories");
const REPO = "/Users/siulungchan/projects/JAVStar-data";
const MAX_ATTEMPTS = 3;

mkdirSync(OUT_DIR, { recursive: true });

function save(q) {
  const tmp = `${QUEUE}.tmp`;
  writeFileSync(tmp, JSON.stringify(q, null, 2) + "\n");
  renameSync(tmp, QUEUE);
}

const q = JSON.parse(readFileSync(QUEUE, "utf8"));
let item = q.items.find((x) => x.status === "pending");

// 兩張都出完 → 重設再 loop
if (!item) {
  for (const x of q.items) {
    x.status = "pending";
    x.attempts = 0;
    delete x.last_error;
  }
  save(q);
  console.log("🔁 篠原兩張 Story 已出完，重設 queue 繼續 loop");
  item = q.items.find((x) => x.status === "pending");
}

item.attempts = (item.attempts || 0) + 1;
console.log(`▶️ 發佈篠原 Story [${item.key}] ${item.date_line}（第 ${item.attempts} 次）`);

try {
  const storyPng = join(OUT_DIR, `${item.key}_9x16.png`);
  execFileSync(
    "node",
    ["scripts/ig-story-9x16-shinohara.mjs", "--date", item.date_line, "--poster", item.image, "--out", storyPng],
    { cwd: REPO, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );
  const out = execFileSync(
    "node",
    ["scripts/ig-story-publish.mjs", "--account", q.account, "--image", storyPng, "--tag", "iyo_shinohara", "--tag", "ja.vstar.meet"],
    { cwd: REPO, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );
  const match = out.match(/media id:\s*(\d+)/);
  if (!match) throw new Error(`發佈器冇回傳 media id：${out.slice(0, 300)}`);
  item.status = "posted";
  item.story_media_id = match[1];
  item.story_published_at = new Date().toISOString();
  delete item.last_error;
  save(q);
  console.log(`📸 已發篠原 Story ${item.key}（media ${match[1]}）`);
} catch (e) {
  item.last_error = (e.stderr || e.message || "").toString().slice(0, 500);
  if (item.attempts >= MAX_ATTEMPTS) {
    item.status = "failed";
    console.log(`⛔ ${item.key} 第 ${MAX_ATTEMPTS} 次失敗，標 failed 跳過：${item.last_error}`);
  } else {
    console.log(`⚠️ ${item.key} 第 ${item.attempts} 次失敗（下個 tick 重試）：${item.last_error}`);
  }
  save(q);
  process.exit(1);
}
