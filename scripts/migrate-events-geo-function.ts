// Fix events_derive_geo_type():
//  - detect Taiwan / Hong Kong from title as well as venue
//  - when venue yields nothing, retain a *canonical* caller-supplied prefecture
//    (manual/config ingest where venue is not yet announced). Previously the
//    function overwrote any explicit prefecture with NULL for empty venue, so
//    Taiwan events with no venue vanished from the 🇹🇼 台灣 tab.
// Idempotent: CREATE OR REPLACE, safe to re-run.
try { process.loadEnvFile(); } catch {}
import pg from 'pg';
const { Pool } = pg;

const connectionString = process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL;
if (!connectionString) {
  console.error('Missing DATABASE_URL');
  process.exit(1);
}
const pool = new Pool({ connectionString });

const FN = `
CREATE OR REPLACE FUNCTION public.events_derive_geo_type()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  explicit text := COALESCE(NEW.prefecture,'');
BEGIN
  -- ---- prefecture / region ----
  IF COALESCE(NEW.venue,'') ~ '(台北|臺北|台湾|台灣)'
     OR COALESCE(NEW.title,'') ~ '(台北|臺北|台湾|台灣)' THEN
    NEW.prefecture := '台北';
  ELSIF COALESCE(NEW.venue,'') ~ '香港' OR COALESCE(NEW.title,'') ~ '香港' THEN
    NEW.prefecture := '香港';
  ELSIF COALESCE(NEW.venue,'') = '' AND COALESCE(NEW.title,'') ~ '(オンライン|配信|リモート|LINE公式|Zoom|Web.{0,3}イベント)' THEN
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
    -- 3) fall back to a *canonical* caller-supplied prefecture (manual ingest
    --    with empty venue), otherwise the venue's first token.
    IF NEW.prefecture IS NULL OR NEW.prefecture = '' THEN
      IF explicit ~ '^(台北|新北|高雄|台中|台南|桃園|基隆|新竹|嘉義|屏東|宜蘭|花蓮|台東|香港|オンライン)$'
         OR explicit ~ '(県|都|府|道)$' THEN
        NEW.prefecture := explicit;
      ELSE
        NEW.prefecture := NULLIF(btrim(regexp_replace(COALESCE(NEW.venue,''),'[\\s　]+.*','')),'');
      END IF;
    END IF;
  END IF;

  -- ---- event type (inferred from title keywords; site has no type field) ----
  IF NEW.title ~ '撮影会' THEN
    NEW.event_type := 'photo';
  ELSIF NEW.title ~ 'オフ会' THEN
    NEW.event_type := 'offkai';
  ELSIF NEW.title ~ '(DVD|ＤＶＤ|ブルーレイ|Blu-ray|リリース|発売記念|即売会|販売イベント|発売イベント)' THEN
    NEW.event_type := 'dvd';
  ELSIF NEW.title ~ '(サイン|チェキ|握手|お渡し|特典会|ミーグリ|2ショット|ツーショット|来店|1日店長|一日店長|トークショー|写真集|REbecca|グラビア|生誕祭|バースデー|ファンミーティング)' THEN
    NEW.event_type := 'meet';
  ELSIF NEW.title ~ '『[^』]{2,}』[^『』]{0,12}[＠@]' THEN
    NEW.event_type := 'meet';
  ELSIF NEW.title ~ 'イベント'
        AND NEW.title !~ '(オンライン|配信|リモート|Zoom|カフェ|コラボ|ハーレム|ボードゲーム|ワゴン|ライブ|ショー|福袋|キャンペーン|ハグ|交流会|茶会|パーティ|ナイト|クルーズ|バスツアー|フェス|スナック|吞み|呑み|歌)' THEN
    NEW.event_type := 'meet';
  ELSIF COALESCE(NEW.event_type,'') = '' OR NEW.event_type NOT IN ('dvd','photo','offkai','meet','other') THEN
    NEW.event_type := 'other';
  END IF;

  RETURN NEW;
END;
$function$
`;

async function main() {
  await pool.query(FN);
  console.log('✓ replaced events_derive_geo_type()');
  await pool.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
