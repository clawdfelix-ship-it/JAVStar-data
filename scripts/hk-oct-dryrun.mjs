#!/usr/bin/env node
// POST events-upsert mode=dry（唔寫庫）驗證 61 筆
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';import { join } from 'node:path';
const env={};
for(const l of readFileSync(join(homedir(),'.config/jching-ingest.env'),'utf8').split('\n')){
  const m=l.match(/^([A-Z0-9_]+)=(.*)$/);if(m)env[m[1]]=m[2].trim();}
const BASE=env.JCHING_BASE||'https://j-star-data.vercel.app';
const events=JSON.parse(readFileSync(join(process.cwd(),'scripts/hk-oct-manifest.json'),'utf8'));
const r=await fetch(`${BASE}/api/admin/events-upsert`,{
  method:'POST',
  headers:{'Content-Type':'application/json','x-ingest-token':env.INGEST_TOKEN},
  body:JSON.stringify({mode:'dry',events}),
});
const j=await r.json();
console.log("HTTP",r.status);
if(!r.ok){console.log(JSON.stringify(j).slice(0,500));process.exit(1);}
console.log("mode:",j.mode,"would_upsert:",j.would_upsert);
// 抽樣
for(const e of j.events.slice(0,2))console.log(JSON.stringify(e));
console.log("...");
console.log("最後一筆:",JSON.stringify(j.events.at(-1)));
