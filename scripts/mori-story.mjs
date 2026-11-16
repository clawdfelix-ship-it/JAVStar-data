// 森日向子 Story（9:16）：4:5 C款海報原樣嵌入，米色上下襯邊，底帶燒入 handle。
// 用法：node scripts/mori-story.mjs
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const FONT_DIR = `${process.env.HOME}/.hermes/fonts`;
const fonts = [
  { name: "Noto", data: readFileSync(`${FONT_DIR}/NotoSansTC-Regular.otf`), weight: 400 },
  { name: "Noto", data: readFileSync(`${FONT_DIR}/NotoSansTC-Bold.otf`), weight: 700 },
];
const C = { bg: "#F0F0D8", ink: "#3D2B0A", gold: "#E0A050", rose: "#A03E3E", sub: "#8A5A28" };
const W = 1080, H = 1920;
const h = (t, p = {}, ...c) => ({ type: t, props: { ...p, children: c.flat() } });

const poster = `${process.env.HOME}/JAVStar/shared/artifacts/ig-posts/C_dec05_mori_hinako.png`;
if (!existsSync(poster)) throw new Error("先跑 mori-c-poster.mjs 生成 4:5 海報：" + poster);
const posterB64 = `data:image/png;base64,${readFileSync(poster).toString("base64")}`;

const tree = h("div", {
  style: { width: W, height: H, background: C.bg, fontFamily: "Noto",
    display: "flex", flexDirection: "column", alignItems: "center" } },
  // 頂帶
  h("div", { style: { height: 285, width: "100%", display: "flex", alignItems: "center",
    justifyContent: "center", flexDirection: "column", gap: 10 } },
    h("div", { style: { display: "flex", alignItems: "center", gap: 12 } },
      h("div", { style: { width: 8, height: 34, background: C.rose, borderRadius: 2 } }),
      h("div", { style: { fontSize: 30, fontWeight: 700, color: C.gold, letterSpacing: 4 } }, "JCHING 活動快訊 · IG STORY")),
    h("div", { style: { fontSize: 28, fontWeight: 700, color: C.rose } }, "2026.12.05（六）— 12.06（日）")),
  // 海報本體（4:5 不拉伸）
  h("img", { src: posterB64, width: 1080, height: 1350,
    style: { width: 1080, height: 1350, objectFit: "contain", flexShrink: 0 } }),
  // 底帶
  h("div", { style: { height: 285, width: "100%", display: "flex", alignItems: "center",
    justifyContent: "center", flexDirection: "column", gap: 14, paddingBottom: 30 } },
    h("div", { style: { fontSize: 30, fontWeight: 700, color: C.ink } }, "女優 IG：@hinako_mori_"),
    h("div", { style: { fontSize: 26, fontWeight: 700, color: C.sub } }, "主辦 IG：@ja.vstar.meet"),
    h("div", { style: { fontSize: 22, color: C.sub, letterSpacing: 2 } }, "森日向子 香港粉絲活動 · 旺角／觀塘"))
);

const svg = await satori(tree, { width: W, height: H, fonts });
const png = new Resvg(svg, { fitTo: { mode: "width", value: W } }).render().asPng();
const out = `${process.env.HOME}/JAVStar/shared/artifacts/ig-posts/S_dec05_mori_hinako.png`;
writeFileSync(out, png);
console.log("saved", out, png.length);
