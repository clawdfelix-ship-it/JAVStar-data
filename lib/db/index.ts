import { neon } from '@neondatabase/serverless';

// Create a lazy-initialized SQL client
// Supports both DATABASE_URL (standard) and POSTGRES_URL (Vercel Neon integration)
let _sql: ReturnType<typeof neon> | null = null;

function getSql() {
  if (!_sql) {
    const url = process.env.DATABASE_URL || process.env.POSTGRES_URL || '';
    if (!url) {
      throw new Error('Neither DATABASE_URL nor POSTGRES_URL environment variable is set');
    }
    _sql = neon(url);
  }
  return _sql;
}

// Export a function that calls the sql template tag
export default function sql(strings: TemplateStringsArray, ...values: any[]) {
  return getSql()(strings, ...values);
}