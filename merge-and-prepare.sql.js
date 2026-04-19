const fs = require('fs');

// Load all parts
const p1 = JSON.parse(fs.readFileSync('scraped-part1-full.json', 'utf8'));
const p2 = JSON.parse(fs.readFileSync('scraped-part2-full.json', 'utf8'));
const p3 = JSON.parse(fs.readFileSync('scraped-part3-full.json', 'utf8'));
const p4 = JSON.parse(fs.readFileSync('scraped-part4-full.json', 'utf8'));
const p5 = JSON.parse(fs.readFileSync('scraped-part5-full.json', 'utf8'));

const all = [...p1, ...p2, ...p3, ...p4, ...p5];
console.log('Total records before dedup:', all.length);

// Deduplicate by ID (keep first occurrence)
const uniqueMap = new Map();
all.forEach(a => { if (a.id) uniqueMap.set(a.id, a); });
const unique = Array.from(uniqueMap.values());
console.log('After dedup:', unique.length);

// Generate SQL INSERT statements
function escape(str) {
  if (str === null || str === undefined) return 'NULL';
  return "'" + String(str).replace(/'/g, "''") + "'";
}

function toDate(str) {
  if (!str) return 'NULL';
  // Already YYYY-MM-DD format
  if (str.match(/^\d{4}-\d{2}-\d{2}$/)) return "'" + str + "'";
  return 'NULL';
}

let insertCount = 0;
let skipCount = 0;
const batchSize = 100;
let sqlStatements = [];

for (const a of unique) {
  const id = a.id || '';
  const name_ja = escape(a.name_ja || '');
  const name_cn = escape(a.name_cn || '');
  const birthday = toDate(a.birthday);
  const age = a.age ? String(a.age) : 'NULL';
  const zodiac = escape(a.zodiac);
  const height = a.height ? String(a.height) : 'NULL';
  const bust = a.bust ? String(a.bust) : 'NULL';
  const waist = a.waist ? String(a.waist) : 'NULL';
  const hip = a.hip ? String(a.hip) : 'NULL';
  const cup = escape(a.cup);
  const agency = escape(a.agency);
  const hobby = escape(a.hobby);
  const debut_date = toDate(a.debut_date);
  const debut_year = a.debut_year ? String(a.debut_year) : 'NULL';
  const debut_work = escape(a.debut_work);
  const blog = escape(a.blog);
  const official_site = escape(a.official_site);
  const tags = escape(a.tags);
  const avatar_url = escape(a.avatar_url);
  
  const sql = `INSERT OR IGNORE INTO actresses (id, name_ja, name_cn, birthday, age, zodiac, height, bust, waist, hip, cup, agency, hobby, debut_date, debut_year, debut_work, blog, official_site, tags, avatar_url) VALUES (${escape(id)}, ${name_ja}, ${name_cn}, ${birthday}, ${age}, ${zodiac}, ${height}, ${bust}, ${waist}, ${hip}, ${cup}, ${agency}, ${hobby}, ${debut_date}, ${debut_year}, ${debut_work}, ${blog}, ${official_site}, ${tags}, ${avatar_url});`;
  
  sqlStatements.push(sql);
  insertCount++;
}

console.log('\n=== 準備入庫 ===');
console.log('總共:', insertCount, '條記錄');
console.log('SQL 語句:', sqlStatements.length, '條');

// Save to file
fs.writeFileSync('merge-statements.sql', sqlStatements.join('\n'));
console.log('已保存到 merge-statements.sql');

// Show first 3 as sample
console.log('\n=== Sample SQL (first 3) ===');
sqlStatements.slice(0, 3).forEach((s, i) => console.log(i+1 + ':', s.substring(0, 120) + '...'));
