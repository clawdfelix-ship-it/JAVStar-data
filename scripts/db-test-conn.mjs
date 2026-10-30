import { readFileSync } from 'node:fs';
import { neon } from '@neondatabase/serverless';
const env={};
for(const l of readFileSync('/Users/siulungchan/.hermes/profiles/it/cache/scratch/jching_prod.env','utf8').split('\n')){
  const m=l.match(/^([A-Z0-9_]+)=(.*)$/);if(m)env[m[1]]=m[2].trim().replace(/^["']|["']$/g,'');
}
const sql=neon(env.DATABASE_URL_UNPOOLED||env.DATABASE_URL);
const n=await sql`SELECT count(*)::int c FROM actresses`;
console.log("連線OK 女優數",n[0].c);
// 佔位是否已存在
const ex=await sql`SELECT id,name_ja FROM actresses WHERE id=${'900000001'}`;
console.log("佔位存在?",ex);
// 看表欄位
const cols=await sql`SELECT column_name,data_type,is_nullable FROM information_schema.columns WHERE table_name='actresses' ORDER BY ordinal_position`;
console.log(cols.map(c=>c.column_name).join(","));
