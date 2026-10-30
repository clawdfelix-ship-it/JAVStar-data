import { readFileSync } from 'node:fs';
import { neon } from '@neondatabase/serverless';
const env={};
for(const l of readFileSync('/Users/siulungchan/.hermes/profiles/it/cache/scratch/jching_prod.env','utf8').split('\n')){
  const m=l.match(/^([A-Z0-9_]+)=(.*)$/);if(m)env[m[1]]=m[2].trim().replace(/^["']|["']$/g,'');
}
const sql=neon(env.DATABASE_URL_UNPOOLED||env.DATABASE_URL);
const apply=process.argv.includes("--execute");

// 佔位女優：綜合活動（無特定單一女優嘅大型聯合活動/展覽）
const row={
  id:'900000001',
  name_ja:'綜合活動・展覽',
  name_cn:'綜合活動・展覽（無特定單一女優）',
  tags:'綜合活動,展覽,placeholder',
};

if(apply){
  await sql`INSERT INTO actresses (id,name_ja,name_cn,tags,created_at,updated_at)
    VALUES (${row.id},${row.name_ja},${row.name_cn},${row.tags},NOW(),NOW())
    ON CONFLICT (id) DO UPDATE SET name_ja=EXCLUDED.name_ja,name_cn=EXCLUDED.name_cn,tags=EXCLUDED.tags,updated_at=NOW()`;
  const chk=await sql`SELECT id,name_ja FROM actresses WHERE id=${row.id}`;
  console.log("已建佔位女優:",chk);
}else{
  console.log("DRY 將建佔位女優:",row);
}
