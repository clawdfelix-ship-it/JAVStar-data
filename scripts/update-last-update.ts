import { sql } from '../lib/db/index.ts';

async function getLastUpdate() {
  try {
    const result = await sql`SELECT MAX(created_at) as last_update FROM events`;
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (e) {
    console.error('Error:', e.message);
  }
}

getLastUpdate();
