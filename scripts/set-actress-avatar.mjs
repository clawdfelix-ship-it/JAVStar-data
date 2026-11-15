// 上傳指定圖片為某女優頭像：裁方形 → 上傳 Vercel Blob → 更新 DB avatar_url
// 用法：node scripts/set-actress-avatar.mjs <actress_id> <圖片路徑>
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { put } from "@vercel/blob";
import { neon } from "@neondatabase/serverless";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

const [aid, imgPath] = process.argv.slice(2);
if (!aid || !imgPath) throw new Error("用法：node scripts/set-actress-avatar.mjs <actress_id> <圖片>");

// .env.local
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
process.env.DATABASE_URL =
  readFileSync(".env.local", "utf8").match(/DATABASE_URL="([^"]+)"/)[1];
const sql = neon(process.env.DATABASE_URL);

const src = resolve(imgPath);
// 裁方形（置頂，保留臉部）：sips 用 --cropToHeightWidth
const sq = `/tmp/avatar_${aid}.jpg`;
execFileSync("sips", ["-Z", "1200", src, "--out", sq], { stdio: "inherit" });
const dim = execFileSync("sips", ["-g", "pixelWidth", "-g", "pixelHeight", sq], { encoding: "utf8" });
const w = Number(dim.match(/pixelWidth:\s*(\d+)/)[1]);
const hh = Number(dim.match(/pixelHeight:\s*(\d+)/)[1]);
const side = Math.min(w, hh);
execFileSync("sips", ["-c", String(side), String(side), sq], { stdio: "inherit" });
console.log(`✂️  裁方形 ${side}×${side}`);

const blob = await put(`actress-avatars/${aid}.jpg`, readFileSync(sq), {
  access: "public",
  allowOverwrite: true,
  token: process.env.BLOB_READ_WRITE_TOKEN,
});
console.log("☁️  Blob:", blob.url);

const before = await sql`SELECT id,name_ja,avatar_url FROM actresses WHERE id=${aid}`;
console.log("之前:", before[0]);
await sql`UPDATE actresses SET avatar_url=${blob.url} WHERE id=${aid}`;
const after = await sql`SELECT id,name_ja,avatar_url FROM actresses WHERE id=${aid}`;
console.log("之後:", after[0]);
console.log("✅ avatar 已更新");
