import sql from './lib/db';
import * as fs from 'fs';

// Load all parts and merge
const p1 = JSON.parse(fs.readFileSync('scraped-part1-full.json', 'utf8'));
const p2 = JSON.parse(fs.readFileSync('scraped-part2-full.json', 'utf8'));
const p3 = JSON.parse(fs.readFileSync('scraped-part3-full.json', 'utf8'));
const p4 = JSON.parse(fs.readFileSync('scraped-part4-full.json', 'utf8'));
const p5 = JSON.parse(fs.readFileSync('scraped-part5-full.json', 'utf8'));

const all = [...p1, ...p2, ...p3, ...p4, ...p5];
console.log('Total records:', all.length);

// Deduplicate by ID
const uniqueMap = new Map();
all.forEach(a => { if (a.id) uniqueMap.set(a.id, a); });
const unique = Array.from(uniqueMap.values());
console.log('After dedup:', unique.length);

function escape(str: string | null | undefined): string | null {
  if (!str) return null;
  return str.replace(/'/g, "''");
}

async function insertActress(a: any) {
  const id = String(a.id || '');
  const name_ja = escape(a.name_ja) || '';
  const name_cn = escape(a.name_cn) || null;
  const birthday = a.birthday || null;
  const age = a.age || null;
  const zodiac = escape(a.zodiac) || null;
  const height = a.height || null;
  const bust = a.bust || null;
  const waist = a.waist || null;
  const hip = a.hip || null;
  const cup = escape(a.cup) || null;
  const agency = escape(a.agency) || null;
  const hobby = escape(a.hobby) || null;
  const debut_date = a.debut_date || null;
  const debut_year = a.debut_year || null;
  const debut_work = escape(a.debut_work) || null;
  const blog = escape(a.blog) || null;
  const official_site = escape(a.official_site) || null;
  const tags = escape(a.tags) || null;
  const avatar_url = escape(a.avatar_url) || null;

  try {
    await sql`
      INSERT INTO actresses (id, name_ja, name_cn, birthday, age, zodiac, height, bust, waist, hip, cup, agency, hobby, debut_date, debut_year, debut_work, blog, official_site, tags, avatar_url, created_at, updated_at)
      VALUES (${id}, ${name_ja}, ${name_cn}, ${birthday}, ${age}, ${zodiac}, ${height}, ${bust}, ${waist}, ${hip}, ${cup}, ${agency}, ${hobby}, ${debut_date}, ${debut_year}, ${debut_work}, ${blog}, ${official_site}, ${tags}, ${avatar_url}, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET
        name_ja = EXCLUDED.name_ja,
        name_cn = EXCLUDED.name_cn,
        birthday = EXCLUDED.birthday,
        age = EXCLUDED.age,
        zodiac = EXCLUDED.zodiac,
        height = EXCLUDED.height,
        bust = EXCLUDED.bust,
        waist = EXCLUDED.waist,
        hip = EXCLUDED.hip,
        cup = EXCLUDED.cup,
        agency = EXCLUDED.agency,
        hobby = EXCLUDED.hobby,
        debut_date = EXCLUDED.debut_date,
        debut_year = EXCLUDED.debut_year,
        debut_work = EXCLUDED.debut_work,
        blog = EXCLUDED.blog,
        official_site = EXCLUDED.official_site,
        tags = EXCLUDED.tags,
        avatar_url = EXCLUDED.avatar_url,
        updated_at = NOW()
    `;
    return true;
  } catch (err: any) {
    // silent
    return false;
  }
}

async function main() {
  let success = 0;
  let failed = 0;
  const batchSize = 50;
  
  for (let i = 0; i < unique.length; i += batchSize) {
    const batch = unique.slice(i, i + batchSize);
    const promises = batch.map(a => insertActress(a));
    const results = await Promise.all(promises);
    const ok = results.filter(r => r).length;
    success += ok;
    failed += (results.length - ok);
    
    if ((i + batchSize) % 500 === 0 || i + batchSize >= unique.length) {
      console.log(`Progress: ${i + batchSize}/${unique.length} | success: ${success} | failed: ${failed}`);
    }
  }
  
  console.log('\n=== COMPLETE ===');
  console.log('Total:', unique.length);
  console.log('Success:', success);
  console.log('Failed:', failed);
}

main().catch(e => { console.error(e.message); process.exit(1); });
