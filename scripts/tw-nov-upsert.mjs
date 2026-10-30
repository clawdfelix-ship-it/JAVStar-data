#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';import { join } from 'node:path';
const env={};
for(const l of readFileSync(join(homedir(),'.config/jching-ingest.env'),'utf8').split('\n')){
  const m=l.match(/^([A-Z0-9_]+)=(.*)$/);if(m)env[m[1]]=m[2].trim();}
const BASE=env.JCHING_BASE;
const all=JSON.parse(readFileSync(join(process.cwd(),'scripts/hk-tw-nov-manifest.json'),'utf8'));
const only=process.argv[2]==="solo" ? all.filter(e=>!e.needsPlaceholder) : all;
const execute=process.argv.includes("--execute");
const body=all.map(({needsPlaceholder,...rest})=>rest); // 欄位清乾淨
const payload= (process.argv[2]==="solo") ? body.filter(e=>!e.id.includes("-grp-")) : body;
const r=await fetch(`${BASE}/api/admin/events-upsert`,{
  method:'POST',headers:{'Content-Type':'application/json','x-ingest-token':env.INGEST_TOKEN},
  body:JSON.stringify({mode:execute?'upsert':'dry',events:payload}),
});
const j=await r.json();
console.log(execute?'EXECUTE':'DRY',"筆數",payload.length,"HTTP",r.status);
console.log(JSON.stringify(j).slice(0,400));
