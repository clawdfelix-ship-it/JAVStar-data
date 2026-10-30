import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'node:fs';
const env={};
for(const line of readFileSync('/Users/siulungchan/.hermes/profiles/it/cache/scratch/jching_prod.env','utf8').split('\n')){
  const m=line.match(/^([A-Z0-9_]+)=(.*)$/); if(m) env[m[1]]=m[2].trim().replace(/^["']|["']$/g,'');
}
const sql=neon(env.DATABASE_URL_UNPOOLED||env.DATABASE_URL);
const rows=await sql`
  SELECT source_key, source_name, status, count(*)::int c,
         min(published_at) AS oldest, max(published_at) AS newest
  FROM news_items
  GROUP BY source_key, source_name, status
  ORDER BY source_key
`;
const total=await sql`SELECT count(*)::int c, count(*) FILTER (WHERE status='pending')::int pending FROM news_items`;
console.log(JSON.stringify(total[0]));
console.table(rows);
