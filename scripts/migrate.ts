// Manual migration script - use direct pg for DDL
import pg from 'pg';
const { Pool } = pg;

const connectionString = process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL;
if (!connectionString) {
  console.error('Missing POSTGRES_URL_NON_POOLING');
  process.exit(1);
}

const pool = new Pool({ connectionString });

async function migrate() {
  console.log('Adding new columns to actresses table...\n');

  const newColumns = [
    'age INTEGER',
    'zodiac TEXT',
    'cup TEXT',
    'agency TEXT',
    'hobby TEXT',
    'debut_year INTEGER',
    'debut_work TEXT',
    'blog TEXT',
    'official_site TEXT',
    'tags TEXT'
  ];

  // Check existing columns
  const existingResult = await pool.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'actresses' ORDER BY ordinal_position`
  );
  const existingNames = existingResult.rows.map((r) => r.column_name);
  console.log('Current columns:', existingNames.join(', '), '\n');

  for (const colDef of newColumns) {
    const colName = colDef.split(' ')[0];
    if (existingNames.includes(colName)) {
      console.log(`✓ ${colName} already exists`);
      continue;
    }
    try {
      await pool.query(`ALTER TABLE actresses ADD COLUMN ${colDef}`);
      console.log(`✓ Added ${colName}`);
    } catch (e: any) {
      console.log(`✗ ${colName}: ${e.message.split('\n')[0]}`);
    }
  }

  console.log('\nMigration complete!');
  
  // Show final schema
  const final = await pool.query(
    `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'actresses' ORDER BY ordinal_position`
  );
  console.log('\nFinal schema:');
  final.rows.forEach((r) => console.log(`  ${r.column_name}: ${r.data_type}`));
  
  await pool.end();
}

migrate().catch((e) => { console.error(e); process.exit(1); });