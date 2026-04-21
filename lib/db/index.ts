import { neon } from '@neondatabase/serverless';

// Create a lazy-initialized SQL client
let _sql: ReturnType<typeof neon> | null = null;

function getSql() {
  if (!_sql) {
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

// Named export for use with: import { sql } from '@/lib/db'
export function sql(strings: TemplateStringsArray, ...values: any[]) {
  return getSql()(strings, ...values);
}

// Default export for backward compatibility: import sql from '@/lib/db'
export default sql;

// Export getSql for raw queries (allows unsafe() usage)
export { getSql };