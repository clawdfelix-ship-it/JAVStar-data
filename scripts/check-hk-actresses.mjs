import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { neon } from '@neondatabase/serverless';

const env={};
for(const line of readFileSync(join(process.cwd(),'.env.local'),'utf8').split('\n')){
  const m=line.match(/^([A-Z0-9_]+)=(.*)$/);if(m)env[m[1]]=m[2].trim().replace(/^["']|["']$/g,'');
}
const sql=neon(env.DATABASE_URL_UNPOOLED||env.DATABASE_URL);

const names=["神木麗","青空光","瀧本雫葉","東條夏","伊藤舞雪","川越鈴子","友田彩也香","彩月七緒",
"栗山莉緒","桃園怜奈","明日葉三葉","村上悠華","吉澤友貴","白峰美羽","小梅惠奈","九野雛乃","北野未奈",
"初美菜乃花","香水純","谷梓"];

const found=[];const missing=[];
for(const n of names){
  const rows=await sql`SELECT id,name_ja,name_cn FROM actresses WHERE name_cn=${n} OR name_ja=${n} LIMIT 3`;
  if(rows.length) found.push({n,rows});else missing.push(n);
}
console.log("=== 已有 actress id ===");
for(const f of found)console.log(f.n,"->",f.rows.map(r=>`${r.id}(${r.name_ja||''}/${r.name_cn||''})`).join(', '));
console.log("\n=== 缺（要先入 actresses）===");
console.log(missing.join("、"));
