#!/usr/bin/env node
/**
 * JCHING 香港活動 IG Story 隊列（2026/11/21–22）：多女優 Story 輪流 loop。
 * 每次 tick 發下一張 pending，全部出完自動重設 pending 繼續 loop。
 * 成功記 media id；失敗最多重試 3 次，之後標 failed 跳過。
 *
 * item 欄位：
 *   key / date_line（頂帶）/ image（4:5 海報，含日期場次）/ status
 *   actress_handle / organizer_handle（底帶顯示，可空）
 *   footer（底帶備註）/ tags（Story 可點擊 mention username array）
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

// 全部出完 → 重設再 loop
if (!item) {
  for (const x of q.items) {
    x.status = "pending";
    x.attempts = 0;
    delete x.last_error;
  }
  save(q);
  console.log(`🔁 ${q.items.length} 張 Story 已出完，重設 queue 繼續 loop`);
  item = q.items.find((x) => x.status === "pending");
}

item.attempts = (item.attempts || 0) + 1;
console.log(`▶️ 發佈 Story [${item.key}] ${item.date_line}（第 ${item.attempts} 次）`);

try {
  const storyPng = join(OUT_DIR, `${item.key}_9x16.png`);
  // 篠原款 9:16 包裝（通用）
  const wrapArgs = [
    "scripts/ig-story-9x16-generic.mjs",
    "--date-line", item.date_line,
    "--poster", item.image,
    "--out", storyPng,
  ];
  if (item.actress_handle) wrapArgs.push("--actress", `@${item.actress_handle}`);
  if (item.organizer_handle) wrapArgs.push("--organizer", `@${item.organizer_handle}`);
  if (item.footer) wrapArgs.push("--footer", item.footer);
  execFileSync("node", wrapArgs, { cwd: REPO, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

  // 發佈：女優＋主辦可點擊 mention
  const pubArgs = ["scripts/ig-story-publish.mjs", "--account", q.account, "--image", storyPng];
  for (const t of item.tags || []) pubArgs.push("--tag", t);
  const out = execFileSync("node", pubArgs, { cwd: REPO, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

  const match = out.match(/media id:\s*(\d+)/);
  if (!match) throw new Error(`發佈器冇回傳 media id：${out.slice(0, 300)}`);
  item.status = "posted";
  item.story_media_id = match[1];
  item.story_published_at = new Date().toISOString();
  delete item.last_error;
  save(q);
  console.log(`📸 已發 Story ${item.key}（media ${match[1]}，mention ${(item.tags || []).length} 個）`);
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
