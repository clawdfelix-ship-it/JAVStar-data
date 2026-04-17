/**
 * Seed Script - Import scraped actresses to Neon database
 */

import sql from '@/lib/db';
import * as fs from 'fs';

async function seed() {
  console.log('Starting seed process...');
  
  // Read scraped data
  const data = JSON.parse(fs.readFileSync('./scraped-actresses.json', 'utf-8'));
  console.log(`Loaded ${data.length} actresses from scraped-actresses.json`);
  
  // Clear existing data
  console.log('Clearing existing actress data...');
  await sql`DELETE FROM actresses`;
  
  // Insert actresses
  console.log('Inserting actresses...');
  let inserted = 0;
  let failed = 0;
  
  for (const actress of data) {
    try {
      await sql`
        INSERT INTO actresses (id, name_ja, name_cn, birthday, height, bust, waist, hip, debut_date, avatar_url, created_at, updated_at)
        VALUES (
          ${actress.id},
          ${actress.name_ja},
          ${actress.name_cn || ''},
          ${actress.birthday || null},
          ${actress.height ? String(actress.height) : null},
          ${actress.bust ? String(actress.bust) : null},
          ${actress.waist ? String(actress.waist) : null},
          ${actress.hip ? String(actress.hip) : null},
          ${actress.debut_date || null},
          ${actress.avatar_url || ''},
          NOW(),
          NOW()
        )
      `;
      inserted++;
      if (inserted % 20 === 0) {
        console.log(`  Inserted ${inserted}/${data.length}...`);
      }
    } catch (err: any) {
      failed++;
      if (failed <= 5) {
        console.error(`Failed to insert ${actress.name_ja}: ${err.message}`);
      }
    }
  }
  
  console.log(`\n✅ Seed complete! Inserted ${inserted} actresses, ${failed} failed.`);
  
  // Verify
  const result = await sql`SELECT COUNT(*) as count FROM actresses`;
  console.log(`Total actresses in DB: ${result[0].count}`);
  
  // Show sample
  const samples = await sql`SELECT id, name_ja, birthday, height FROM actresses LIMIT 5`;
  console.log('\nSample data:');
  console.log(samples);
}

seed().catch(console.error);