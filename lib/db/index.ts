import { neon } from '@neondatabase/serverless';

// Create a lazy-initialized SQL client
// Supports multiple env var names for Neon connections
let _sql: ReturnType<typeof neon> | null = null;

function getSql() {
  if (!_sql) {
    // Try multiple possible env var names
    const url =
      process.env.DATABASE_URL ||
      process.env.POSTGRES_URL ||
      process.env.POSTGRES_URL_NON_POOLING ||
      '';
    if (!url) {
      throw new Error('No database connection string found in environment variables');
    }
    _sql = neon(url);
  }
  return _sql;
}

// Export a function that calls the sql template tag
export default function sql(strings: TemplateStringsArray, ...values: any[]) {
  return getSql()(strings, ...values);
}