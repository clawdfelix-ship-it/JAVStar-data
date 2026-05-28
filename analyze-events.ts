const events = require('./scraped-events-search.json');

// Better actress name extraction
function extractActress(title) {
  // Remove leading date patterns
  let clean = title
    .replace(/^[\d\/]+[\.月]?[\(（]?[金土日月火水木][^\)）]*[\)）]?/, '')
    .replace(/^[0-9]+月[0-9]+日[\(（]?[金土日月火水木][^\)）]*[\)）]?/, '')
    .trim();
  
  // Extract actress name (Japanese chars before ちゃん/さん/san)
  const m = clean.match(/^([\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]{2,20})(ちゃん|san|さん|嬢|先生)/);
  if (m) return m[1];
  
  // Fallback: first 2+ Japanese chars
  const first = clean.match(/^([\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]{2,})/);
  if (first) return first[1];
  
  return clean.split(/\s+/)[0];
}

events.forEach(e => {
  e.actress_name = extractActress(e.event_name);
});

// Stats
const byActress = {};
events.forEach(e => {
  byActress[e.actress_name] = (byActress[e.actress_name] || 0) + 1;
});
const sorted = Object.entries(byActress).sort((a,b) => b[1]-a[1]);
console.log('Top 20 actresses:');
sorted.slice(0,20).forEach(([n,c]) => console.log(`  ${c}x ${n}`));
console.log(`\nTotal unique: ${sorted.length} | Total events: ${events.length}`);
console.log('\nSample:');
events.slice(0,8).forEach(e => console.log(`  "${e.actress_name}" <- "${e.event_name}"`));

// Save cleaned
const fs = require('fs');
fs.writeFileSync('scraped-events-clean.json', JSON.stringify(events, null, 2));
console.log('\nSaved to scraped-events-clean.json');
