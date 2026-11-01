export type EmailSubscriptionInput = {
  email: string;
  actress_name?: string | null;
  source?: string | null;
};

export type EmailSubscriptionRecord = {
  email: string;
  actress_name: string | null;
  source: string;
};

type SqlExecutor = (strings: TemplateStringsArray, ...values: any[]) => Promise<unknown>;

let ddlReady = false;

function cleanText(value: unknown, max: number): string | null {
  const cleaned = String(value ?? '').trim().slice(0, max);
  return cleaned ? cleaned : null;
}

export function normalizeEmailSubscription(input: EmailSubscriptionInput): EmailSubscriptionRecord {
  const email = String(input.email ?? '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Invalid email');
  }

  return {
    email,
    actress_name: cleanText(input.actress_name, 120),
    source: cleanText(input.source, 40) || 'unknown',
  };
}

async function getDefaultSqlExecutor(): Promise<SqlExecutor> {
  const mod = await import('./db');
  return mod.default as SqlExecutor;
}

export async function ensureEmailSubscriptionsTable(sqlExecutor?: SqlExecutor): Promise<void> {
  if (ddlReady) return;
  const executor = sqlExecutor || (await getDefaultSqlExecutor());

  await executor`
    CREATE TABLE IF NOT EXISTS email_subscriptions (
      email TEXT PRIMARY KEY,
      actress_name TEXT,
      source TEXT NOT NULL DEFAULT 'unknown',
      status TEXT NOT NULL DEFAULT 'active',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await executor`
    CREATE INDEX IF NOT EXISTS email_subscriptions_status_idx
    ON email_subscriptions (status, updated_at DESC)
  `;
  ddlReady = true;
}

export async function upsertEmailSubscription(
  input: EmailSubscriptionInput,
  sqlExecutor?: SqlExecutor
): Promise<EmailSubscriptionRecord> {
  const record = normalizeEmailSubscription(input);
  const executor = sqlExecutor || (await getDefaultSqlExecutor());
  await ensureEmailSubscriptionsTable(executor);

  await executor`
    INSERT INTO email_subscriptions (email, actress_name, source, status)
    VALUES (${record.email}, ${record.actress_name}, ${record.source}, 'active')
    ON CONFLICT (email)
    DO UPDATE SET
      actress_name = COALESCE(EXCLUDED.actress_name, email_subscriptions.actress_name),
      source = EXCLUDED.source,
      status = 'active',
      updated_at = now()
  `;

  return record;
}
