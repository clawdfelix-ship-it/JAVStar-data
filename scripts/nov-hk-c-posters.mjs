// C 款（full-bleed 照片＋黑金漸層壓字）1080×1350，支援一位女優多個場次。
// 用法：node scripts/nov-hk-c-posters.mjs
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
const C = {
  gold: "#F0C078", rose: "#C75B5B", cream: "#F0F0D8",
};
const h = (t, p = {}, ...c) => ({ type: t, props: { ...p, children: c.flat() } });

const posts = [
  {
    out: "C_nov21_nanase_arisu.png", imgId: "1063724",
    name: "七瀬アリス", cn: "七瀨愛麗絲",
    sessions: [{ date: "11.21", wd: "六", kind: "粉絲見面會" }],
    org: "KOCHOU",
  },
  {
    out: "C_nov21_momonogi_kana.png", imgId: "736066",
    name: "桃乃木かな", cn: "桃乃木香奈",
    sessions: [
      { date: "11.21", wd: "六", kind: "粉絲見面會" },
      { date: "11.22", wd: "日", kind: "粉絲見面會" },
    ],
    org: "桃乃木かな（本人主辦）",
  },
  {
    out: "C_nov28_aiba_mizuki.png", imgId: "301341",
    name: "藍芽みずき", cn: "藍芽水月",
    sessions: [
      { date: "11.28", wd: "六", kind: "粉絲攝影會" },
      { date: "11.29", wd: "日", kind: "粉絲見面會" },
    ],
    org: "konger",
  },
];

function SessionRow(s) {
  return h("div", { style: {
    display: "flex", alignItems: "center",
    background: "rgba(255,255,255,0.08)",
    border: "1.5px solid rgba(240,192,120,0.55)", borderRadius: 12,
    padding: "12px 20px", marginBottom: 12 } },
    h("div", { style: { display: "flex", alignItems: "baseline", minWidth: 150 } },
      h("div", { style: { fontSize: 32, fontWeight: 700, color: C.gold } }, s.date),
      h("div", { style: { fontSize: 20, fontWeight: 700, color: "#D8C8A8", marginLeft: 8 } }, `(${s.wd})`)),
    h("div", { style: { width: 1.5, height: 34, background: "rgba(216,200,168,0.3)", marginRight: 18 } }),
    h("div", { style: { fontSize: 27, fontWeight: 700, color: C.cream } }, s.kind));
}

function render(post) {
  const imgPath = join(process.env.HOME, "JAVStar/projects-not-used");
  const PROMO = join(process.cwd(), "public/actress-promos", `${post.imgId}.jpg`);
  const photo = existsSync(PROMO)
    ? `data:image/jpeg;base64,${readFileSync(PROMO).toString("base64")}` : null;

  return h("div", { style: {
    width: W, height: H, position: "relative", fontFamily: "Noto",
    background: "#000", overflow: "hidden" } },
    photo
      ? h("img", { src: photo, width: W, height: H,
          style: { position: "absolute", top: 0, left: 0, objectFit: "cover", objectPosition: "top center" } })
      : h("div", { style: { position: "absolute", inset: 0, background: "linear-gradient(160deg,#F0C078,#A87850)" } }),
    // scrim：多場次時拉高
    h("div", { style: { position: "absolute", left: 0, right: 0, bottom: 0, height: 760,
      background: "linear-gradient(180deg, rgba(20,14,4,0) 0%, rgba(20,14,4,0.6) 32%, rgba(20,14,4,0.94) 100%)" } }),
    // 頂 pill
    h("div", { style: { position: "absolute", top: 48, left: 56, display: "flex",
      padding: "9px 20px", borderRadius: 999, background: C.gold } },
      h("div", { style: { fontSize: 19, fontWeight: 700, color: "#1A1208", letterSpacing: 2 } }, "JCHING 活動快訊")),
    h("div", { style: { position: "absolute", top: 48, right: 56,
      padding: "9px 20px", borderRadius: 999, background: "rgba(199,91,91,0.95)" } },
      h("div", { style: { fontSize: 19, fontWeight: 700, color: "#fff" } }, "✦ 蒞臨香港")),
    // 底部文字
    h("div", { style: { position: "absolute", left: 56, right: 56, bottom: 48, display: "flex", flexDirection: "column" } },
      h("div", { style: { fontSize: 62, fontWeight: 700, color: C.gold, letterSpacing: 2, lineHeight: 1 } }, post.name),
      h("div", { style: { fontSize: 30, fontWeight: 700, color: C.cream, marginTop: 10 } }, post.cn),
      h("div", { style: { width: 64, height: 4, background: C.rose, borderRadius: 2, marginTop: 18 } }),
      h("div", { style: { marginTop: 20 } }, ...post.sessions.map(SessionRow)),
      h("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 } },
        h("div", { style: { fontSize: 19, color: "#D8C8A8" } }, `主辦 ${post.org}　·　場地以公布為準`),
        h("div", { style: { fontSize: 18, fontWeight: 700, color: C.gold } }, "@jching.calendar")),
    ));
}

const OUT_DIR = `${process.env.HOME}/JAVStar/shared/artifacts/ig-posts`;
for (const post of posts) {
  const svg = await satori(render(post), { width: W, height: H, fonts });
  const png = new Resvg(svg, { fitTo: { mode: "width", value: W } }).render().asPng();
  const outPath = join(OUT_DIR, post.out);
  writeFileSync(outPath, png);
  console.log("saved", outPath, png.length);
}
