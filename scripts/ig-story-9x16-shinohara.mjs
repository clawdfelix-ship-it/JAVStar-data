// 篠原伊代香港活動 9:16 IG Story 生成器：4:5 海報嵌入 1080×1920 全屏，米色襯邊，
// 頂帶顯示該場日期，底帶燒入女優/主辦 handle（Story 無 caption）。
// 用法：node scripts/ig-story-9x16-shinohara.mjs --date 2026.11.21（六）旺角 --poster png --out png
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function arg(n) { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : undefined; }
const dateLine = arg("--date");
const posterPath = resolve(arg("--poster"));
const outPath = resolve(arg("--out"));
if (!dateLine || !existsSync(posterPath) || !outPath) throw new Error("要 --date --poster --out");

const FONT_DIR = existsSync(`${process.env.HOME}/.hermes/fonts/NotoSansTC-Regular.otf`)
  ? `${process.env.HOME}/.hermes/fonts` : "/Users/siulungchan/.hermes/profiles/it/cache/scratch";
const fonts = [
  { name: "Noto", data: readFileSync(`${FONT_DIR}/NotoSansTC-Regular.otf`), weight: 400 },
  { name: "Noto", data: readFileSync(`${FONT_DIR}/NotoSansTC-Bold.otf`), weight: 700 },
];

const C = { bg: "#F0F0D8", ink: "#3D2B0A", gold: "#E0A050", rose: "#A03E3E", sub: "#8A5A28" };
const W = 1080, H = 1920;
const posterB64 = `data:image/png;base64,${readFileSync(posterPath).toString("base64")}`;
const h = (t, p = {}, ...c) => ({ type: t, props: { ...p, children: c.flat() } });

const tree = h("div", {
  style: { width: W, height: H, background: C.bg, fontFamily: "Noto", display: "flex", flexDirection: "column", alignItems: "center" },
},
  h("div", { style: { height: 285, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 10 } },
    h("div", { style: { display: "flex", alignItems: "center", gap: 12 } },
      h("div", { style: { width: 8, height: 34, background: C.rose, borderRadius: 2 } }),
      h("div", { style: { fontSize: 30, fontWeight: 700, color: C.gold, letterSpacing: 4 } }, "JCHING 活動快訊 · IG STORY")),
    h("div", { style: { fontSize: 28, fontWeight: 700, color: C.rose } }, dateLine)),
  h("img", { src: posterB64, width: 1080, height: 1350, style: { width: 1080, height: 1350, objectFit: "contain", flexShrink: 0 } }),
  h("div", { style: { height: 285, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 14, paddingBottom: 30 } },
    h("div", { style: { fontSize: 30, fontWeight: 700, color: C.ink } }, "女優 IG：@iyo_shinohara"),
    h("div", { style: { fontSize: 26, fontWeight: 700, color: C.sub } }, "主辦 IG：@ja.vstar.meet"),
    h("div", { style: { fontSize: 22, color: C.sub, letterSpacing: 2 } }, "篠原伊代 香港粉絲活動 · 旺角／觀塘"))
);

const svg = await satori(tree, { width: W, height: H, fonts });
const png = new Resvg(svg, { fitTo: { mode: "width", value: W } }).render().asPng();
writeFileSync(outPath, png);
console.log("saved", outPath, png.length, `(${W}×${H}) @iyo_shinohara ${dateLine}`);
