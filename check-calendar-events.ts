import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:***REMOVED_SECRET***@ep-bitter-pond-an6f3hui-pooler.c-6.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require');

async function main() {
  const events = await sql`
    SELECT datetime::date as date, COUNT(*)::int as cnt
    FROM events
    WHERE datetime >= '2026-05-28' AND datetime < '2026-09-01'
    GROUP BY date
    ORDER BY date
    LIMIT 30
  `;

  console.log(JSON.stringify(events, null, 2));
}

main();
