#!/usr/bin/env node
// 正式 upsert（mode 預設 upsert）
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
  body:JSON.stringify({mode:'upsert',events}),
});
const j=await r.json();
console.log("HTTP",r.status);
console.log(JSON.stringify(j).slice(0,600));
if(!r.ok||!j.success)process.exit(1);
