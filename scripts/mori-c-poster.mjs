// 森日向子 12/5-6 香港活動 C 款 Feed（1080×1350 full-bleed＋黑金漸層壓字）
// 用法：node scripts/mori-c-poster.mjs
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const FONT_DIR = `${process.env.HOME}/.hermes/fonts`;
const fonts = [
  { name: "Noto", data: readFileSync(`${FONT_DIR}/NotoSansTC-Regular.otf`), weight: 400 },
  { name: "Noto", data: readFileSync(`${FONT_DIR}/NotoSansTC-Bold.otf`), weight: 700 },
];
const W = 1080, H = 1350;
const C = { gold: "#F0C078", rose: "#C75B5B", cream: "#F0F0D8" };
const h = (t, p = {}, ...c) => ({ type: t, props: { ...p, children: c.flat() } });

const post = {
  imgId: "985557",
  name: "森日向子",
  cn: "森日向子",
  // 12/5 三場
  rows: [
    { date: "12.05", wd: "六", time: "12:00-18:30", kind: "粉絲攝影會（3場）" },
    { date: "12.05", wd: "六", time: "15:40-16:40", kind: "旺角快閃見面會" },
    { date: "12.05", wd: "六", time: "19:00-22:00", kind: "OFF 會（晚餐派對）" },
    { date: "12.06", wd: "日", time: "13:00-19:30", kind: "粉絲見面會（4時段）" },
  ],
  meetSessions: ["13:00-14:00", "14:30-15:30", "16:30-17:30", "18:30-19:30"],
  org: "JAVStarMeet",
};

function Row(r) {
  return h("div", { style: {
    display: "flex", alignItems: "center",
    background: "rgba(255,255,255,0.08)",
    border: "1.5px solid rgba(240,192,120,0.55)", borderRadius: 12,
    padding: "11px 20px", marginBottom: 11 } },
    h("div", { style: { display: "flex", alignItems: "baseline", minWidth: 138 } },
      h("div", { style: { fontSize: 30, fontWeight: 700, color: C.gold } }, r.date),
      h("div", { style: { fontSize: 18, fontWeight: 700, color: "#D8C8A8", marginLeft: 7 } }, `(${r.wd})`)),
    h("div", { style: { width: 1.5, height: 32, background: "rgba(216,200,168,0.3)", marginRight: 16 } }),
    h("div", { style: { display: "flex", flexDirection: "column" } },
      h("div", { style: { fontSize: 25, fontWeight: 700, color: C.cream } }, r.kind),
      h("div", { style: { fontSize: 16, fontWeight: 400, color: "#D8C8A8", marginTop: 2 } }, r.time)));
}

const PROMO = join(process.cwd(), "public/actress-promos", `${post.imgId}.jpg`);
const photo = existsSync(PROMO)
  ? `data:image/jpeg;base64,${readFileSync(PROMO).toString("base64")}` : null;

const tree = h("div", { style: { width: W, height: H, position: "relative", fontFamily: "Noto", background: "#000", overflow: "hidden" } },
  photo
    ? h("img", { src: photo, width: W, height: H, style: { position: "absolute", top: 0, left: 0, objectFit: "cover", objectPosition: "top center" } })
    : h("div", { style: { position: "absolute", inset: 0, background: "linear-gradient(160deg,#F0C078,#A87850)" } }),
  h("div", { style: { position: "absolute", left: 0, right: 0, bottom: 0, height: 880,
    background: "linear-gradient(180deg, rgba(20,14,4,0) 0%, rgba(20,14,4,0.62) 28%, rgba(20,14,4,0.95) 100%)" } }),
  h("div", { style: { position: "absolute", top: 48, left: 56, padding: "9px 20px", borderRadius: 999, background: C.gold } },
    h("div", { style: { fontSize: 19, fontWeight: 700, color: "#1A1208", letterSpacing: 2 } }, "JCHING 活動快訊")),
  h("div", { style: { position: "absolute", top: 48, right: 56, padding: "9px 20px", borderRadius: 999, background: "rgba(199,91,91,0.95)" } },
    h("div", { style: { fontSize: 19, fontWeight: 700, color: "#fff" } }, "✦ 蒞臨香港")),
  h("div", { style: { position: "absolute", left: 56, right: 56, bottom: 44, display: "flex", flexDirection: "column" } },
    h("div", { style: { fontSize: 64, fontWeight: 700, color: C.gold, letterSpacing: 2, lineHeight: 1 } }, post.name),
    h("div", { style: { fontSize: 28, fontWeight: 700, color: C.cream, marginTop: 10 } }, "森日向子 · Mori Hinako"),
    h("div", { style: { width: 64, height: 4, background: C.rose, borderRadius: 2, marginTop: 16 } }),
    h("div", { style: { marginTop: 18 } }, ...post.rows.map(Row)),
    h("div", { style: { fontSize: 16, color: "#D8C8A8", marginTop: 2, paddingLeft: 4 } },
      `見面會 4 時段：${post.meetSessions.join("　")}`),
    h("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14 } },
      h("div", { style: { fontSize: 18, color: "#D8C8A8" } }, "主辦 @javstarmeet　·　場地及票務詳情見官方公布"),
      h("div", { style: { fontSize: 17, fontWeight: 700, color: C.gold } }, "@jching.calendar")),
  ));

const svg = await satori(tree, { width: W, height: H, fonts });
const png = new Resvg(svg, { fitTo: { mode: "width", value: W } }).render().asPng();
const out = `${process.env.HOME}/JAVStar/shared/artifacts/ig-posts/C_dec05_mori_hinako.png`;
writeFileSync(out, png);
console.log("saved", out, png.length);
