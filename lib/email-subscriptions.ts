export type EmailSubscriptionInput = {
  email: string;
  actressName: string | null;
  source: string;
};

type Queryable = {
  query: (sql: string, params?: unknown[]) => Promise<unknown>;
};

async function getDefaultDb(): Promise<Queryable> {
  const { getSql } = await import('./db/index');
  return getSql() as Queryable;
}

function clean(value: unknown, max: number): string {
  return String(value ?? '').trim().slice(0, max);
}

export function normalizeEmailSubscription(body: unknown): EmailSubscriptionInput | null {
  const input = (body ?? {}) as Record<string, unknown>;
  const email = clean(input.email, 320).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;

  const actressName = clean(input.actress_name, 200) || null;
  const source = clean(input.source, 80) || 'homepage';

  return { email, actressName, source };
}

export async function ensureEmailSubscriptionsTable(db?: Queryable): Promise<void> {
  const client = db || await getDefaultDb();
  await client.query(`
    CREATE TABLE IF NOT EXISTS email_subscriptions (
      id BIGSERIAL PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      actress_name TEXT,
      source TEXT NOT NULL DEFAULT 'homepage',
      status TEXT NOT NULL DEFAULT 'active',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

export async function upsertEmailSubscription(
  input: EmailSubscriptionInput,
  db?: Queryable
): Promise<void> {
  const client = db || await getDefaultDb();
  await ensureEmailSubscriptionsTable(client);
  await client.query(
    `INSERT INTO email_subscriptions (email, actress_name, source, status)
     VALUES ($1, $2, $3, 'active')
     ON CONFLICT (email) DO UPDATE SET
       actress_name = COALESCE(EXCLUDED.actress_name, email_subscriptions.actress_name),
       source = EXCLUDED.source,
       status = 'active',
       updated_at = NOW()`,
    [input.email, input.actressName, input.source]
  );
}
