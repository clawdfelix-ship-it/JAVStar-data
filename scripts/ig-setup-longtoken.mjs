#!/usr/bin/env node
/**
 * IG Graph API — 長效 Token 設定（互動式，密鑰唔經對話）
 *
 * 用法（喺你自己 terminal 行）：
 *   node scripts/ig-setup-longtoken.mjs
 *
 * 會隱藏式 prompt 問你 App Secret，然後：
 *   1. short-lived user token -> long-lived user token (60 日)
 *   2. 用長效 user token 拎 Page token（IG 用，理論上無過期）
 *   3. 寫入 ~/.hermes/profiles/javstar-ops/secrets/.meta_ig_config.json (600)
 *   4. 即場 debug_token 驗證
 */
import { readFileSync, writeFileSync, chmodSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

const API = "https://graph.facebook.com/v21.0";
const CFG = join(homedir(), ".hermes/profiles/javstar-ops/secrets/.meta_ig_config.json");
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
  if (!existsSync(CFG)) throw new Error(`搵唔到設定檔：${CFG}`);
  const cfg = JSON.parse(readFileSync(CFG, "utf8"));
  if (!cfg.app_id) throw new Error("設定檔缺 app_id");
  if (!cfg.short_user_token) throw new Error("設定檔缺 short_user_token（要重新行 OAuth）");

  const secret = await rl.question("貼入 App Secret（輸入時唔顯示）：", { silent: true });
  stdout.write("\n");
  if (!secret.trim()) throw new Error("App Secret 空白，取消");

  // 1. short user token -> long-lived user token (~60 days)
  const longUser = await graph("oauth/access_token", {
    grant_type: "fb_exchange_token",
    client_id: cfg.app_id,
    client_secret: secret.trim(),
    fb_exchange_token: cfg.short_user_token,
  });
  console.log("✅ 長效 user token：", longUser.expires_in, "秒（約", Math.round(longUser.expires_in / 86400), "日）");

  // 2. long-lived user token -> page token (no expiry)
  const accounts = await graph("me/accounts", {
    fields: "id,name,access_token,instagram_business_account",
    access_token: longUser.access_token,
  });
  const page = accounts.data.find((p) => p.id === PAGE_ID);
  if (!page) throw new Error(`搵唔到 Page ${PAGE_ID}，確認授權帳號有管理權`);
  if (!page.instagram_business_account?.id) throw new Error("Page 未連結 IG 帳號");
  if (page.instagram_business_account.id !== IG_ID) {
    console.warn("⚠️  連結 IG 同預期唔同：", page.instagram_business_account.id);
  }
  console.log("✅ Page token：", page.name, "| IG:", page.instagram_business_account.id);

  // 3. verify page token is permanent (expires_at = 0)
  const dbg = await graph("debug_token", {
    input_token: page.access_token,
    access_token: `${cfg.app_id}|${secret.trim()}`,
  });
  console.log("✅ debug_token：valid =", dbg.data.is_valid, "| expires_at =", dbg.data.expires_at, dbg.data.expires_at === 0 ? "（無過期）" : "");

  // 4. save
  cfg.app_secret = secret.trim();
  cfg.long_user_token = longUser.access_token;
  cfg.long_page_token = page.access_token;
  cfg.jching_page_id = PAGE_ID;
  cfg.ig_user_id = IG_ID;
  cfg.ig_username = "jching.calendar";
  cfg.token_updated_at = new Date().toISOString();
  delete cfg.jching_page_token_short;
  writeFileSync(CFG, JSON.stringify(cfg, null, 2) + "\n", { mode: 0o600 });
  chmodSync(CFG, 0o600);
  console.log("\n🎉 全部寫入：", CFG);
  console.log("   鍵值：long_page_token, long_user_token, app_secret, ig_user_id");
} catch (e) {
  console.error("❌ 失敗：", e.message);
  process.exitCode = 1;
} finally {
  rl.close();
}
