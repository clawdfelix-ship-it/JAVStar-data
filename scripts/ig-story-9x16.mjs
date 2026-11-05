// 9:16 IG Story 生成器：把 4:5（1080×1350）C 版海報等比嵌入 1080×1920 全屏 canvas，
// 絕不拉伸（contain），上下用品牌米色襯邊，底部燒入女優/主辦 IG handle（Story 無 caption）。
// 用法：node scripts/ig-story-9x16.mjs --id 822902 --poster <4x5.png> --out <9x16.png>
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

function arg(n) { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : undefined; }
const id = arg("--id");
const posterPath = resolve(arg("--poster"));
const outPath = resolve(arg("--out"));
if (!id || !existsSync(posterPath) || !outPath) throw new Error("要 --id --poster --out");

const D = "/Users/siulungchan/.hermes/profiles/it/cache/scratch";
const fonts = [
  { name: "Noto", data: readFileSync(`${D}/NotoSansTC-Regular.otf`), weight: 400 },
  { name: "Noto", data: readFileSync(`${D}/NotoSansTC-Bold.otf`), weight: 700 },
];
const handles = JSON.parse(readFileSync(new URL("./mfe-instagram-handles.json", import.meta.url), "utf8"));
const info = handles[id];
if (!info) throw new Error(`handle 表搵唔到 id ${id}`);
const orgIg = handles._meta.organizer.instagram;

const C = { bg: "#F0F0D8", ink: "#3D2B0A", gold: "#E0A050", rose: "#A03E3E", sub: "#8A5A28" };
const W = 1080, H = 1920;
const posterB64 = `data:image/png;base64,${readFileSync(posterPath).toString("base64")}`;
const h = (t, p = {}, ...c) => ({ type: t, props: { ...p, children: c.flat() } });

// 4:5 海報寬 1080 → 高 1350；垂直置中後上 285 / 下 285 襯邊
const tree = h("div", {
  style: { width: W, height: H, background: C.bg, fontFamily: "Noto", display: "flex", flexDirection: "column", alignItems: "center" },
},
  // 頂帶
  h("div", { style: { height: 285, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 10 } },
    h("div", { style: { display: "flex", alignItems: "center", gap: 12 } },
      h("div", { style: { width: 8, height: 34, background: C.rose, borderRadius: 2 } }),
      h("div", { style: { fontSize: 30, fontWeight: 700, color: C.gold, letterSpacing: 4 } }, "JCHING 活動快訊 · IG STORY")),
    h("div", { style: { fontSize: 26, fontWeight: 700, color: C.rose } }, "2026.11.13（五）— 11.15（日）")),
  // 海報本體（原 4:5，不拉伸）
  h("img", { src: posterB64, width: 1080, height: 1350, style: { width: 1080, height: 1350, objectFit: "contain", flexShrink: 0 } }),
  // 底帶：handle
  h("div", { style: { height: 285, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 14, paddingBottom: 30 } },
    h("div", { style: { fontSize: 30, fontWeight: 700, color: C.ink } }, `女優 IG：@${info.instagram}`),
    h("div", { style: { fontSize: 26, fontWeight: 700, color: C.sub } }, `主辦 IG：@${orgIg}`),
    h("div", { style: { fontSize: 22, color: C.sub, letterSpacing: 2 } }, "MEGA FANS EXPO 香港 · 香港富豪機場酒店"))
);

const svg = await satori(tree, { width: W, height: H, fonts });
const png = new Resvg(svg, { fitTo: { mode: "width", value: W } }).render().asPng();
writeFileSync(outPath, png);
console.log("saved", outPath, png.length, `(${W}×${H}) 女優 @${info.instagram}`);
