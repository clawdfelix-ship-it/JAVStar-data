// ig-accounts.mjs — 多 IG 帳號登記庫（跨 agent 共用）
//
// 登記庫位置（環境變數可覆寫，方便其他 Hermes profile／agent 重用）：
//   IG_ACCOUNTS_FILE，預設 ~/JAVStar/shared/secrets/ig-accounts.json
// App 層憑證（app_id / app_secret / long_user_token）仍讀 .meta_ig_config.json。
//
// 登記庫形狀：
// {
//   "accounts": {
//     "jching": { label, page_id, page_name, ig_user_id, ig_username,
//                 page_token, blob_prefix, added_at }
//   }
// }
import { readFileSync, writeFileSync, existsSync, chmodSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";

export const API = "https://graph.facebook.com/v21.0";
export const META_CFG = join(
  homedir(),
  ".hermes/profiles/javstar-ops/secrets/.meta_ig_config.json",
);
export const REGISTRY =
  process.env.IG_ACCOUNTS_FILE ||
  join(homedir(), "JAVStar/shared/secrets/ig-accounts.json");

export function loadMetaConfig() {
  return JSON.parse(readFileSync(META_CFG, "utf8"));
}

export function loadRegistry() {
  if (!existsSync(REGISTRY)) return { accounts: {} };
  return JSON.parse(readFileSync(REGISTRY, "utf8"));
}

export function saveRegistry(reg) {
  mkdirSync(dirname(REGISTRY), { recursive: true });
  writeFileSync(REGISTRY, JSON.stringify(reg, null, 2) + "\n", { mode: 0o600 });
  chmodSync(REGISTRY, 0o600);
}

export function getAccount(key) {
  const reg = loadRegistry();
  const acc = reg.accounts?.[key];
  if (!acc) {
    const known = Object.keys(reg.accounts || {}).join(", ") || "(無)";
    throw new Error(`登記庫搵唔到帳號「${key}」。已有：${known}`);
  }
  if (!acc.page_token || !acc.ig_user_id)
    throw new Error(`帳號「${key}」憑證不完整，請重新跑 ig-provision-account.mjs`);
  return acc;
}

export async function graph(path, params = {}, method = "GET") {
  const url = `${API}/${path}?${new URLSearchParams(params)}`;
  const r = await fetch(url, { method });
  const j = await r.json();
  if (j.error) throw new Error(`${method} ${path} → ${j.error.message} (code ${j.error.code})`);
  return j;
}

// 列出 long user token 下所有「已連 IG」嘅專頁（供 provision 選擇）
export async function listLinkedPages(userToken) {
  const j = await graph("me/accounts", {
    access_token: userToken,
    fields: "id,name,access_token,instagram_business_account",
  });
  return (j.data || [])
    .filter((p) => p.instagram_business_account?.id)
    .map((p) => ({
      page_id: p.id,
      page_name: p.name,
      page_token: p.access_token,
      ig_user_id: p.instagram_business_account.id,
    }));
}
