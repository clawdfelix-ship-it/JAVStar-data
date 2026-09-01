try { process.loadEnvFile(); } catch {}
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL!);

// av-event.jp list pages give no event_type/prefecture fields — the scraper
// only captures 開催場所 into `venue`. Derive both from venue/title in a
// BEFORE INSERT/UPDATE trigger so EVERY writer path stays consistent.
const TRIGGER_FN = `
CREATE OR REPLACE FUNCTION events_derive_geo_type() RETURNS trigger AS $$
BEGIN
  -- ---- prefecture / region ----
  IF COALESCE(NEW.venue,'') ~ '(台北|臺北|台湾|台灣)' THEN
    NEW.prefecture := '台北';
  ELSIF COALESCE(NEW.venue,'') ~ '香港' THEN
    NEW.prefecture := '香港';
  ELSIF COALESCE(NEW.venue,'') = '' AND NEW.title ~ '(オンライン|オンライン|配信|リモート|LINE公式|Zoom|Web.{0,3}イベント)' THEN
    -- no physical venue + online keyword -> online event
    NEW.prefecture := 'オンライン';
  ELSE
    -- 1) standard prefecture name embedded in venue (東京都/大阪府/北海道/xx県)
    NEW.prefecture := substring(COALESCE(NEW.venue,'') from
      '(北海道|青森県|岩手県|宮城県|秋田県|山形県|福島県|茨城県|栃木県|群馬県|埼玉県|千葉県|東京都|神奈川県|新潟県|富山県|石川県|福井県|山梨県|長野県|岐阜県|静岡県|愛知県|三重県|滋賀県|京都府|大阪府|兵庫県|奈良県|和歌山県|鳥取県|島根県|岡山県|広島県|山口県|徳島県|香川県|愛媛県|高知県|福岡県|佐賀県|長崎県|熊本県|大分県|宮崎県|鹿児島県|沖縄県)');
    -- 2) Tokyo-area landmarks/wards that don't include the literal 東京都
    IF NEW.prefecture IS NULL OR NEW.prefecture = '' THEN
      IF COALESCE(NEW.venue,'') ~ '(秋葉原|アキバ|千代田|外神田|神田|渋谷|新宿|池袋|上野|有楽町|銀座|秋葉|浅草|六本木|恵比寿|中野|立川|町田)' THEN
        NEW.prefecture := '東京都';
      END IF;
    END IF;
    -- 3) fall back to whatever messy value was inserted (e.g. 東京 -> 東京都)
    IF (NEW.prefecture IS NULL OR NEW.prefecture = '') AND COALESCE(NEW.prefecture,'') = '' THEN
      NEW.prefecture := NULLIF(btrim(regexp_replace(COALESCE(NEW.venue,''),'[\\s　]+.*','')),'');
    END IF;
  END IF;

  -- ---- event type (inferred from title keywords; site has no type field) ----
  IF NEW.title ~ '撮影会' THEN
    NEW.event_type := 'photo';
  ELSIF NEW.title ~ 'オフ会' THEN
    NEW.event_type := 'offkai';
  ELSIF NEW.title ~ '(DVD|ＤＶＤ|ブルーレイ|BD|リリース|発売記念|即売会|販売イベント|発売イベント)' THEN
    NEW.event_type := 'dvd';
  ELSIF COALESCE(NEW.event_type,'') = '' OR NEW.event_type NOT IN ('dvd','photo','offkai','other') THEN
    -- normalize legacy junk values (e.g. 'イベント','release','實體活動') to other
    NEW.event_type := 'other';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
`;

async function main() {
  await sql.query(TRIGGER_FN);
  await sql`DROP TRIGGER IF EXISTS trg_events_geo_type ON events`;
  await sql`
    CREATE TRIGGER trg_events_geo_type
    BEFORE INSERT OR UPDATE OF venue, title, prefecture, event_type ON events
    FOR EACH ROW EXECUTE FUNCTION events_derive_geo_type()`;
  console.log('trigger created');

  // Backfill: touch every row so the trigger recomputes.
  const r = await sql`
    UPDATE events SET venue = venue
    WHERE date_iso IS NOT NULL`;
  console.log('backfilled rows:', (r as any[]).length ?? r);

  // Verify
  const pf = await sql`
    SELECT COALESCE(NULLIF(prefecture,''),'(null)') AS p, COUNT(*)::int cnt
    FROM events GROUP BY 1 ORDER BY cnt DESC LIMIT 15`;
  console.log('prefecture now:', pf);
  const et = await sql`
    SELECT event_type, COUNT(*)::int cnt FROM events GROUP BY 1 ORDER BY cnt DESC`;
  console.log('event_type now:', et);
}
main().catch(e => { console.error(e.message); process.exit(1); });
