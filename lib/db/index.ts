import { neon } from '@neondatabase/serverless';

// Create a lazy-initialized SQL client
let _sql: ReturnType<typeof neon> | null = null;

function getSql() {
  if (!_sql) {
    _sql = neon(process.env.DATABASE_URL || '');
  }
  return _sql;
}

// Export a function that calls the sql template tag
export default function sql(strings: TemplateStringsArray, ...values: any[]) {
  return getSql()(strings, ...values);
}