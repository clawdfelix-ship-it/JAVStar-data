#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';import { join } from 'node:path';
const env={};
for(const l of readFileSync(join(homedir(),'.config/jching-ingest.env'),'utf8').split('\n')){
  const m=l.match(/^([A-Z0-9_]+)=(.*)$/);if(m)env[m[1]]=m[2].trim();}
const BASE=env.JCHING_BASE;
const all=JSON.parse(readFileSync(join(process.cwd(),'scripts/hk-tw-nov-manifest.json'),'utf8'));
const grp=all.filter(e=>e.id.includes("-grp-")).map(({needsPlaceholder,...r})=>r);
const execute=process.argv.includes("--execute");
const r=await fetch(`${BASE}/api/admin/events-upsert`,{
  method:'POST',headers:{'Content-Type':'application/json','x-ingest-token':env.INGEST_TOKEN},
  body:JSON.stringify({mode:execute?'upsert':'dry',events:grp}),
});
const j=await r.json();
console.log(execute?'EXECUTE':'DRY',"筆數",grp.length,"HTTP",r.status,JSON.stringify(j).slice(0,300));
