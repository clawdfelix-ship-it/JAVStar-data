type SqlLike = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<Array<{ actress_id: string | number }>>;

export async function confirmFanBinding(
  db: SqlLike,
  {
    bindCode,
    chatId,
    tgHandle,
  }: {
    bindCode: string;
    chatId: number;
    tgHandle?: string;
  },
): Promise<string | null> {
  const identityKey = `tgchat:${chatId}`;
  const displayHandle = tgHandle || `tg:${chatId}`;

  const rows = await db`
    WITH updated_link AS (
      UPDATE fan_tg_links
      SET chat_id=${chatId}, status='bound', consumed_at=now()
      WHERE bind_code=${bindCode}
        AND status='pending'
        AND expires_at > now()
      RETURNING actress_id, region_pref
    ), upserted_subscription AS (
      INSERT INTO fan_subscriptions
        (actress_id, tg_handle, identity_key, channel_pref, region_pref, source, status)
      SELECT actress_id, ${displayHandle}, ${identityKey}, 'tg', region_pref, 'jching-tg', 'active'
      FROM updated_link
      ON CONFLICT (actress_id, identity_key)
      DO UPDATE SET
        tg_handle=COALESCE(NULLIF(EXCLUDED.tg_handle, ''), fan_subscriptions.tg_handle),
        channel_pref='tg',
        region_pref=EXCLUDED.region_pref,
        status='active',
        updated_at=now()
      RETURNING actress_id
    )
    SELECT actress_id FROM upserted_subscription`;

  return rows[0] ? String(rows[0].actress_id) : null;
}
