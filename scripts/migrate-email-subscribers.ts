import sql from '../lib/db';

async function main() {
  await sql`
    CREATE TABLE IF NOT EXISTS email_subscribers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'active',
      source TEXT NOT NULL DEFAULT 'jching',
      unsubscribe_token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
      consent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      last_event_id TEXT,
      request_ip_hash TEXT
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS email_subscribers_status_idx ON email_subscribers(status, consent_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS email_subscribers_ip_idx ON email_subscribers(request_ip_hash, consent_at DESC)`;
  const rows = (await sql`SELECT count(*)::int AS n FROM email_subscribers`) as Array<{ n: number }>;
  console.log(`email_subscribers ready; rows=${rows[0].n}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
