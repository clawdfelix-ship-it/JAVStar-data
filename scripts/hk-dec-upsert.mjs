#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';import { join } from 'node:path';
const env={};
for(const l of readFileSync(join(homedir(),'.config/jching-ingest.env'),'utf8').split('\n')){
  const m=l.match(/^([A-Z0-9_]+)=(.*)$/);if(m)env[m[1]]=m[2].trim();}
const BASE=env.JCHING_BASE||'https://j-star-data.vercel.app';
const execute=process.argv.includes('--execute');
const events=JSON.parse(readFileSync(join(process.cwd(),'scripts/hk-dec-manifest.json'),'utf8'));
const r=await fetch(`${BASE}/api/admin/events-upsert`,{
  method:'POST',headers:{'Content-Type':'application/json','x-ingest-token':env.INGEST_TOKEN},
  body:JSON.stringify({mode:execute?'upsert':'dry',events}),
});
const j=await r.json();
console.log(execute?'EXECUTE':'DRY',"HTTP",r.status);
if(!r.ok){console.log(JSON.stringify(j).slice(0,400));process.exit(1);}
console.log(execute?`upserted=${j.upserted}`:`would_upsert=${j.would_upsert}`);
if(execute)console.log(j.ids.join("\n"));
