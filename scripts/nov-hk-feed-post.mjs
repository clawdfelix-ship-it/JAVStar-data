// 11月香港活動女優 IG Feed post（4:5 1080×1350）— 數據驅動
// 用法：node scripts/nov-hk-feed-post.mjs
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const FONT_DIR = `${process.env.HOME}/.hermes/fonts`;
const fonts = [
  { name: "Noto", data: readFileSync(`${FONT_DIR}/NotoSansTC-Regular.otf`), weight: 400 },
  { name: "Noto", data: readFileSync(`${FONT_DIR}/NotoSansTC-Bold.otf`), weight: 700 },
];

const W = 1080, H = 1350;
const C = {
  bg: "#F0F0D8", ink: "#3D2B0A", sub: "#8A5A28", line: "#E0D3B0",
  card: "#FBF6E4", rose: "#C75B5B", roseDeep: "#A03E3E", roseBg: "#FBE6E6",
  goldInk: "#7C5022",
};
const h = (t, p = {}, ...c) => ({ type: t, props: { ...p, children: c.flat() } });

// 每位女優一張
const posts = [
  {
    out: "nov21_nanase_arisu_feed.png",
    name: "七瀬アリス", cn: "七瀨愛麗絲",
    avatar: null,
    accent: "#8E6FC0",
    days: [{ date: "11.21", wd: "星期六", kind: "粉絲見面會" }],
    organizer: "KOCHOU",
  },
  {
    out: "nov21_momonogi_kana_feed.png",
    name: "桃乃木かな", cn: "桃乃木香奈",
    avatar: null,
    accent: "#C75B5B",
    days: [
      { date: "11.21", wd: "星期六", kind: "粉絲見面會" },
      { date: "11.22", wd: "星期日", kind: "粉絲見面會" },
    ],
    organizer: "桃乃木かな（本人主辦）",
  },
  {
    out: "nov28_aiba_mizuki_feed.png",
    name: "藍芽みずき", cn: "藍芽水月",
    avatar: null,
    accent: "#3E8E8E",
    days: [
      { date: "11.28", wd: "星期六", kind: "粉絲攝影會" },
      { date: "11.29", wd: "星期日", kind: "粉絲見面會" },
    ],
    organizer: "konger",
  },
];

function DayRow(d, accent) {
  return h("div", { style: {
    display: "flex", alignItems: "center", background: "#fff",
    border: `2px solid ${accent}`, borderRadius: 16,
    padding: "18px 24px", marginBottom: 16 } },
    h("div", { style: {
      display: "flex", flexDirection: "column", alignItems: "center",
      minWidth: 130, marginRight: 24 } },
      h("div", { style: { fontSize: 40, fontWeight: 700, color: accent, lineHeight: 1.1 } }, d.date),
      h("div", { style: { fontSize: 20, fontWeight: 700, color: C.sub, marginTop: 4 } }, d.wd)),
    h("div", { style: { width: 2, height: 56, background: C.line, marginRight: 24 } }),
    h("div", { style: { fontSize: 32, fontWeight: 700, color: C.ink } }, d.kind));
}

function render(post) {
  const accent = post.accent;
  return h("div", { style: {
    width: W, height: H, background: C.bg, fontFamily: "Noto",
    display: "flex", flexDirection: "column" } },
    h("div", { style: { display: "flex", flexDirection: "column", flex: 1, marginLeft: 56, marginRight: 56 } },
      // 品牌列
      h("div", { style: { display: "flex", alignItems: "center", marginTop: 52 } },
        h("div", { style: { width: 8, height: 40, background: C.rose, borderRadius: 2, marginRight: 16 } }),
        h("div", { style: { fontSize: 22, fontWeight: 700, color: C.roseDeep, letterSpacing: 2 } },
          "JCHING · 香港活動情報")),

      // 女優名標題
      h("div", { style: { marginTop: 30 } },
        h("div", { style: { fontSize: 92, fontWeight: 700, color: C.goldInk, lineHeight: 1.05 } }, post.name),
        h("div", { style: { fontSize: 34, fontWeight: 700, color: accent, marginTop: 12 } }, post.cn)),

      // 標語徽章
      h("div", { style: {
        display: "flex", alignSelf: "flex-start", marginTop: 26,
        background: C.roseBg, border: `2px solid ${C.rose}`, borderRadius: 999,
        padding: "10px 26px", fontSize: 26, fontWeight: 700, color: C.roseDeep } },
        "✨ 即將蒞臨香港"),

      // 場次卡
      h("div", { style: { marginTop: 30 } }, ...post.days.map((d) => DayRow(d, accent))),

      // 場地＋主辦
      h("div", { style: {
        display: "flex", flexDirection: "column", background: C.card,
        border: `1.5px solid ${C.line}`, borderRadius: 16, padding: "20px 24px" } },
        h("div", { style: { display: "flex", fontSize: 24, color: C.sub, marginBottom: 8 } },
          h("span", { style: { fontWeight: 700, color: C.ink, marginRight: 12 } }, "場地"),
          "稍後公佈，以主辦方公布為準"),
        h("div", { style: { display: "flex", fontSize: 24, color: C.sub } },
          h("span", { style: { fontWeight: 700, color: C.ink, marginRight: 12 } }, "主辦"),
          post.organizer)),

      h("div", { style: { flex: 1 } }),

      // 底部
      h("div", { style: {
        display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 36, marginTop: 24 } },
        h("div", { style: { fontSize: 26, fontWeight: 700, color: C.goldInk } }, "www.jching-calendar.com"),
        h("div", { style: { fontSize: 24, fontWeight: 700, color: C.roseDeep } }, "@jching.calendar")),
    ));
}

const OUT_DIR = `${process.env.HOME}/JAVStar/shared/artifacts/ig-posts`;
mkdirSync(OUT_DIR, { recursive: true });
for (const post of posts) {
  const svg = await satori(render(post), { width: W, height: H, fonts });
  const png = new Resvg(svg, { fitTo: { mode: "width", value: W } }).render().asPng();
  const outPath = join(OUT_DIR, post.out);
  writeFileSync(outPath, png);
  console.log("saved", outPath, png.length);
}
