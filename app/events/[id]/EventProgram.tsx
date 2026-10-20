'use client';

// 活動節目詳情 renderer — 由 events.program_json 渲染。
// 支援 4 種結構（見 skill event-detail-record）：
//   photo  — sessions[]（場次/時間/限額/C位分鐘）+ addons[]（加購券/套票）+ rules[]
//   off    — schedule[][]（流程表）+ includes[] + addons[]
//   flash  — package（套餐）+ addons[]
//   meet   — sessions[]（時間）+ perks[]（特典券）+ entry_ticket
// 通用 fallback：任何未預期欄位都唔會令頁面爆。

type Any = any;

function money(n: unknown): string | null {
  return typeof n === 'number' && Number.isFinite(n) ? `$${n.toLocaleString()}` : null;
}

// 「待定」灰 chip（造型未公布）
function Chip({ children, tone }: { children: React.ReactNode; tone?: 'grey' | 'gold' }) {
  const base =
    tone === 'gold'
      ? 'bg-amber-300/20 text-amber-100 border-amber-300/40'
      : 'bg-stone-700/60 text-stone-300 border-stone-600';
  return (
    <span className={`inline-block rounded-md border px-2 py-0.5 text-xs ${base}`}>
      {children}
    </span>
  );
}

function Costume({ value }: { value: unknown }) {
  if (!value) return null;
  const s = String(value);
  // 「待定（性感是必須的）」→ 只顯示「待定」，唔作主辦未公布嘅具體內容
  const label = s.includes('待定') ? '造型待定' : s;
  return <Chip tone={s.includes('待定') ? 'grey' : 'gold'}>{label}</Chip>;
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="fdb-card mt-4 rounded-2xl border border-stone-800 bg-stone-900/40 p-6">
      <h2 className="mb-4 text-lg font-bold text-amber-100">{title}</h2>
      {children}
    </div>
  );
}

function Rules({ rules }: { rules: Any }) {
  if (!Array.isArray(rules) || rules.length === 0) return null;
  return (
    <ul className="mt-2 space-y-1.5 text-sm text-stone-300">
      {rules.map((r: string, i: number) => (
        <li key={i} className="flex gap-2">
          <span className="text-amber-200/50">・</span>
          <span>{r}</span>
        </li>
      ))}
    </ul>
  );
}

function Addons({ addons }: { addons: Any }) {
  if (!Array.isArray(addons) || addons.length === 0) return null;
  return (
    <div className="space-y-3">
      {addons.map((a: Any, i: number) => {
        const price = money(a.price) ?? (a.price_per_min ? `$${a.price_per_min}/分鐘` : null);
        const bits: string[] = [];
        if (a.capacity_text) bits.push(a.capacity_text);
        if (a.limit_per_fan) bits.push(`每人限 ${a.limit_per_fan}`);
        if (a.max_per_fan) bits.push(`每人最多 ${a.max_per_fan}`);
        if (typeof a.inventory === 'number') bits.push(`餘 ${a.inventory}`);
        return (
          <div key={i} className="rounded-xl border border-amber-900/40 bg-amber-950/20 p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-bold text-amber-50">{a.name}</span>
              {price && <span className="font-bold text-amber-300">{price}</span>}
            </div>
            {bits.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {bits.map((b, j) => (
                  <Chip key={j}>{b}</Chip>
                ))}
              </div>
            )}
            {a.original_price && (
              <p className="mt-2 text-xs text-stone-400 line-through">
                原價 {money(a.original_price)}
                {typeof a.save === 'number' ? `　慳 ${money(a.save)}` : ''}
              </p>
            )}
            {Array.isArray(a.includes) && a.includes.length > 0 && (
              <ul className="mt-2 space-y-1 text-xs text-stone-300">
                {a.includes.map((x: string, j: number) => (
                  <li key={j}>・{x}</li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function EventProgram({ program }: { program: Record<string, Any> }) {
  const p = program || {};
  const sessions = Array.isArray(p.sessions) ? p.sessions : [];
  const hasSchedule = Array.isArray(p.schedule) && p.schedule.length > 0;

  return (
    <>
      {p.format && (
        <Section title="活動形式">
          <p className="text-sm leading-relaxed text-stone-200">{p.format}</p>
        </Section>
      )}

      {/* 攝影會 / 見面會：場次表 */}
      {sessions.length > 0 && (
        <Section title="場次安排">
          <div className="space-y-3">
            {sessions.map((s: Any, i: number) => (
              <div key={i} className="rounded-xl border border-stone-700/70 bg-stone-900/60 p-4">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  {s.slot && <span className="font-bold text-amber-50">{s.slot}</span>}
                  {s.time && (
                    <span className="font-mono text-sm text-amber-200">{s.time}</span>
                  )}
                  {money(s.price ?? s.entry_price) && (
                    <span className="font-bold text-amber-300">
                      {money(s.price ?? s.entry_price)}
                    </span>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {s.capacity_text && <Chip>{s.capacity_text}</Chip>}
                  {typeof s.c_position_min === 'number' && (
                    <Chip tone="gold">C 位 {s.c_position_min} 分鐘</Chip>
                  )}
                  {typeof s.inventory === 'number' && <Chip>餘 {s.inventory}</Chip>}
                  <Costume value={s.costume} />
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* OFF 會：入場時間 + 流程表 */}
      {hasSchedule && (
        <Section title="流程安排">
          <div className="space-y-2">
            {p.schedule.map((row: Any, i: number) => (
              <div key={i} className="flex gap-4">
                <span className="w-32 shrink-0 font-mono text-sm text-amber-200">
                  {Array.isArray(row) ? row[0] : row.time}
                </span>
                <span className="text-sm text-stone-200">
                  {Array.isArray(row) ? row[1] : row.label}
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* OFF 會：包含項目 */}
      {Array.isArray(p.includes) && p.includes.length > 0 && (
        <Section title="票種包含">
          <ul className="space-y-1.5 text-sm text-stone-200">
            {p.includes.map((x: string, i: number) => (
              <li key={i} className="flex gap-2">
                <span className="text-amber-200/50">・</span>
                <span>{x}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* 快閃：套餐 */}
      {p.package && (
        <Section title="套餐內容">
          <div className="rounded-xl border border-rose-900/50 bg-rose-950/20 p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-bold text-amber-50">{p.package.name}</span>
              <span className="font-bold text-amber-300">{money(p.package.price)}</span>
            </div>
            {p.package.original_price && (
              <p className="mt-1 text-xs text-stone-400 line-through">
                原價 {money(p.package.original_price)}
                {typeof p.package.save === 'number' ? `　慳 ${money(p.package.save)}` : ''}
              </p>
            )}
            {Array.isArray(p.package.includes) && (
              <ul className="mt-2 space-y-1 text-xs text-stone-300">
                {p.package.includes.map((x: string, i: number) => (
                  <li key={i}>・{x}</li>
                ))}
              </ul>
            )}
          </div>
          {p.note && <p className="mt-3 text-xs text-stone-400">{p.note}</p>}
        </Section>
      )}

      {/* 見面會：入場票 */}
      {p.entry_ticket && (
        <Section title="入場票">
          <div className="flex flex-wrap items-baseline gap-3">
            <span className="font-bold text-amber-50">入場券</span>
            <span className="font-bold text-amber-300">{money(p.entry_ticket.price)}</span>
            {p.entry_ticket.limit_per_fan && (
              <Chip>每人限 {p.entry_ticket.limit_per_fan}</Chip>
            )}
          </div>
        </Section>
      )}

      {/* 見面會：特典券 */}
      {Array.isArray(p.perks) && p.perks.length > 0 && (
        <Section title="特典券（現場加購）">
          <div className="grid gap-3 sm:grid-cols-2">
            {p.perks.map((k: Any, i: number) => (
              <div key={i} className="rounded-xl border border-stone-700/70 bg-stone-900/60 p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-bold text-amber-50">{k.name}</span>
                  <span className="font-bold text-amber-300">{money(k.price)}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {k.limit_per_fan && <Chip>每人限 {k.limit_per_fan}</Chip>}
                  {k.total_capacity_text && <Chip>{k.total_capacity_text}</Chip>}
                  {k.duration_sec && <Chip tone="gold">{k.duration_sec} 秒</Chip>}
                </div>
                {k.note && <p className="mt-2 text-xs text-stone-400">{k.note}</p>}
              </div>
            ))}
          </div>
        </Section>
      )}

      <Addons addons={p.addons} />

      {/* 造型狀態 */}
      {p.costume_status && (
        <Section title="造型">
          <div className="flex flex-wrap items-center gap-2">
            <Costume value={p.costume_status} />
            <span className="text-xs text-stone-400">{p.costume_status}</span>
          </div>
        </Section>
      )}
      {p.costume && !p.costume_status && (
        <Section title="造型">
          <div className="flex flex-wrap items-center gap-2">
            <Costume value={p.costume} />
          </div>
        </Section>
      )}

      {Array.isArray(p.rules) && p.rules.length > 0 && (
        <Section title="參加守則">
          <Rules rules={p.rules} />
        </Section>
      )}

      <div className="mt-6 rounded-2xl border border-rose-400/50 bg-rose-950/25 p-5 text-center text-sm font-bold text-rose-100">
        如有更多活動資訊，歡迎提供俾 JCHING
      </div>
    </>
  );
}