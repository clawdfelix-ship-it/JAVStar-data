import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSql } from '@/lib/db';
import EventProgram from './EventProgram';

export const dynamic = 'force-dynamic';

type Row = {
  id: string;
  title: string;
  venue: string;
  prefecture: string;
  event_type: string;
  url: string;
  organizer: string;
  date_iso: string | Date | null;
  program_json: unknown;
  actress_id: string;
  name_ja: string | null;
  name_cn: string | null;
  avatar_url: string | null;
};

const TYPE_LABEL: Record<string, string> = {
  meet: '見面會', photo: '攝影會', offkai: 'OFF會', other: '其他', dvd: '發售',
};

async function getEvent(id: string): Promise<Row | null> {
  const rows: unknown[] = await (getSql() as any).query(
    `SELECT e.id, e.title, e.venue, e.prefecture, e.event_type, e.url, e.organizer,
            e.date_iso, e.program_json,
            a.id AS actress_id, a.name_ja, a.name_cn, a.avatar_url
     FROM events e LEFT JOIN actresses a ON e.actress_id = a.id
     WHERE e.id = $1 LIMIT 1`,
    [id]
  );
  return ((rows as Row[])[0]) || null;
}

function fmtDate(v: string | Date | null): string {
  if (!v) return '日期待定';
  const d = typeof v === 'string' ? new Date(v) : v;
  const iso = new Date(d.getTime() + 8 * 3600 * 1000).toISOString().slice(0, 10);
  const wd = ['日', '一', '二', '三', '四', '五', '六'][new Date(iso + 'T00:00:00+08:00').getDay()];
  const [y, m, dd] = iso.split('-');
  return `${y}.${m}.${dd}（${wd}）`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const row = await getEvent(id).catch(() => null);
  if (!row) return { title: '活動 | JCHING CALENDAR' };
  return {
    title: `${row.title} | JCHING CALENDAR`,
    description: `${fmtDate(row.date_iso)} ${row.venue || row.prefecture} ${row.title}`,
  };
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const row = await getEvent(id);
  if (!row) notFound();

  const program = (row.program_json || null) as Record<string, any> | null;
  // 注意：DB name_cn 試過係垃圾值（「古賀まつな【旧名】」），唔可信；女優名統一用日文顯示名。
  const actress = row.name_ja || row.name_cn || '';

  return (
    <main className="min-h-screen bg-[#0d0b08] text-stone-100">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Link
          href="/events"
          className="text-sm text-amber-200/70 hover:text-amber-200"
        >
          ← 返回活動列表
        </Link>

        <div className="fdb-card mt-4 rounded-2xl border border-amber-900/30 bg-stone-900/60 p-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-rose-600/90 px-3 py-1 text-xs font-bold text-white">
              {fmtDate(row.date_iso)}
            </span>
            <span className="rounded-full border border-rose-400/50 bg-rose-950/40 px-3 py-1 text-xs font-bold text-rose-200">
              {TYPE_LABEL[row.event_type] || '活動'}
            </span>
            {actress && (
              <Link
                href={`/actress/${row.actress_id}`}
                className="rounded-full bg-amber-300 px-3 py-1 text-xs font-bold text-stone-900 hover:bg-amber-200"
              >
                {actress}
              </Link>
            )}
          </div>

          <h1 className="mt-4 text-3xl font-bold leading-tight text-amber-50">
            {row.title}
          </h1>

          <dl className="mt-5 space-y-2 text-sm">
            {row.venue && (
              <div className="flex gap-3">
                <dt className="w-20 shrink-0 text-amber-200/60">地點</dt>
                <dd className="text-stone-100">{row.venue}</dd>
              </div>
            )}
            <div className="flex gap-3">
              <dt className="w-20 shrink-0 text-amber-200/60">主辦</dt>
              <dd className="text-stone-100">
                {row.organizer === 'javstarmeet' ? 'JAVStarMeet' : row.organizer}
              </dd>
            </div>
          </dl>

          {row.url && (
            <a
              href={row.url}
              className="mt-5 inline-block rounded-lg bg-rose-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-rose-500"
            >
              前往購票
            </a>
          )}
        </div>

        {program ? (
          <EventProgram program={program} />
        ) : (
          <div className="fdb-card mt-4 rounded-2xl border border-stone-800 bg-stone-900/40 p-6 text-sm text-stone-400">
            呢場活動嘅詳細場次／票種／規則尚未公布。如有更多資訊，歡迎提供俾我哋。
          </div>
        )}
      </div>
    </main>
  );
}