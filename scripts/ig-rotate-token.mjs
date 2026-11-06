#!/usr/bin/env node
/**
 * IG token 一鍵輪換（code 190 session 失效後用）
 *
 * 你只需要貼「Graph API Explorer 生成嘅新 short user token」（隱藏輸入）。
 * app_id / app_secret 由 .meta_ig_config.json 讀，唔使再貼密鑰。
 *
 * 流程：
 *   1. short user token -> long-lived user token（約60日）
 *   2. long user token -> Page token（IG 發帖用，理論無過期）
 *   3. debug_token 驗證 page token 有效 + 連對 IG id
 *   4. 寫回 .meta_ig_config.json（short/long/page + token_updated_at）
 *   5. 更新登記庫 ig-accounts.json 嘅 jching.page_token
 *
 * 用法（你自己 terminal）：
 *   node ~/projects/JAVStar-data/scripts/ig-rotate-token.mjs
 */
import { readFileSync, writeFileSync, chmodSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

const API = "https://graph.facebook.com/v21.0";
const CFG = join(homedir(), ".hermes/profiles/javstar-ops/secrets/.meta_ig_config.json");
const REG = join(homedir(), ".hermes/profiles/javstar-ops/secrets/ig-accounts.json");
const PAGE_ID = "1437400882788341"; // JChingCalendar
const IG_ID = "17841473724752270"; // @jching.calendar

async function graph(path, params = {}) {
  const url = `${API}/${path}?${new URLSearchParams(params)}`;
  const r = await fetch(url);
  const j = await r.json();
  if (j.error) throw new Error(`${path}: ${j.error.message} (code ${j.error.code})`);
  return j;
}

const rl = createInterface({ input: stdin, output: stdout });
try {
  const cfg = JSON.parse(readFileSync(CFG, "utf8"));
  if (!cfg.app_id || !cfg.app_secret) throw new Error("config 缺 app_id/app_secret");
  const appToken = `${cfg.app_id}|${cfg.app_secret}`;

  const short = (await rl.question("貼入新 short user token（輸入時隱藏）：", { silent: true })).trim();
  stdout.write("\n");
  if (!short || !/^EAA|^EAAB|^EA/.test(short)) throw new Error("token 格式可疑（應 EAA 開頭），取消");

  // 0. 先驗新 short token 本身有效
  const dbg0 = await graph("debug_token", { input_token: short, access_token: appToken });
  if (!dbg0.data?.is_valid) throw new Error(`新 short token 無效：${dbg0.data?.error?.message}`);
  console.log("✅ 新 short token 有效，scopes:", (dbg0.data.scopes || []).join(","));

  // 1. short -> long user
  const longUser = await graph("oauth/access_token", {
    grant_type: "fb_exchange_token",
    client_id: cfg.app_id,
    client_secret: cfg.app_secret,
    fb_exchange_token: short,
  });
  console.log("✅ 長效 user token：", longUser.expires_in, "秒（約", Math.round(longUser.expires_in / 86400), "日）");

  // 2. long user -> page token
  const accounts = await graph("me/accounts", {
    fields: "id,name,access_token,instagram_business_account",
    access_token: longUser.access_token,
  });
  const page = (accounts.data || []).find((p) => p.id === PAGE_ID);
  if (!page) throw new Error(`搵唔到 Page ${PAGE_ID}，確認授權帳號有管理權`);
  if (page.instagram_business_account?.id !== IG_ID) {
    throw new Error(`連結 IG 不符：預期 ${IG_ID}，實際 ${page.instagram_business_account?.id}`);
  }
  console.log("✅ Page token：", page.name, "| IG:", page.instagram_business_account.id);

  // 3. 驗證 page token
  const dbg = await graph("debug_token", { input_token: page.access_token, access_token: appToken });
  if (!dbg.data?.is_valid) throw new Error(`page token 驗證失敗：${dbg.data?.error?.message}`);
  console.log("✅ page token valid =", dbg.data.is_valid, "| expires_at =", dbg.data.expires_at, dbg.data.expires_at === 0 ? "（無過期）" : "");

  // 4. 寫回 config
  cfg.short_user_token = short;
  cfg.long_user_token = longUser.access_token;
  cfg.long_page_token = page.access_token;
  cfg.jching_page_id = PAGE_ID;
  cfg.ig_user_id = IG_ID;
  cfg.token_updated_at = new Date().toISOString();
  writeFileSync(CFG, JSON.stringify(cfg, null, 2) + "\n", { mode: 0o600 });
  chmodSync(CFG, 0o600);
  console.log("✅ 已更新", CFG);

  // 5. 更新登記庫 jching.page_token
  const reg = JSON.parse(readFileSync(REG, "utf8"));
  if (!reg.accounts?.jching) throw new Error("登記庫搵唔到 accounts.jching");
  reg.accounts.jching.page_token = page.access_token;
  reg.accounts.jching.ig_user_id = IG_ID;
  writeFileSync(REG, JSON.stringify(reg, null, 2) + "\n", { mode: 0o600 });
  chmodSync(REG, 0o600);
  console.log("✅ 已更新", REG, "→ accounts.jching.page_token");

  console.log("\n🎉 輪換完成。下一步：由 agent 驗證發帖 + resume cron。");
} catch (e) {
  console.error("❌ 失敗：", e.message);
  process.exitCode = 1;
} finally {
  rl.close();
}
