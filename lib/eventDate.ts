const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const DATE_TIME = /^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2}))?/;

export function isDateOnly(value: string): boolean {
  return DATE_ONLY.test(value.trim());
}

function isValidCalendarDate(year: number, month: number, day: number): boolean {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

export function isSupportedEventDate(value: string | null | undefined): boolean {
  if (!value) return false;
  const input = value.trim();
  const match = input.match(DATE_ONLY) || input.match(DATE_TIME);
  if (!match) return false;
  return isValidCalendarDate(Number(match[1]), Number(match[2]), Number(match[3]));
}

export function getEventDateSource(event: { datetime?: string | null; date_iso?: string | null }): string {
  const raw = event.datetime?.trim() || '';
  if (isSupportedEventDate(raw)) return raw;
  const normalized = event.date_iso?.trim() || '';
  return isSupportedEventDate(normalized) ? normalized : '';
}

/** Parse a date-only as UTC noon so its calendar day is stable in every host TZ. */
export function parseEventDate(value: string): Date {
  const input = value.trim();
  const dateOnly = input.match(DATE_ONLY);
  if (dateOnly) {
    const [, year, month, day] = dateOnly;
    const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 12));
    return date.getUTCFullYear() === Number(year)
      && date.getUTCMonth() === Number(month) - 1
      && date.getUTCDate() === Number(day) ? date : new Date(NaN);
  }
  // Keep the source wall clock; do not silently turn source-local time into HKT.
  // Construct via UTC so this stays the source date/time even in another host TZ.
  const dateTime = input.match(DATE_TIME);
  if (dateTime) {
    const [, year, month, day, hour, minute, second = '0'] = dateTime;
    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second)));
  }
  return new Date(NaN);
}

export function getEventDateKey(value: string): string | null {
  const input = value.trim();
  const match = input.match(DATE_ONLY) || input.match(DATE_TIME);
  return match && isValidCalendarDate(Number(match[1]), Number(match[2]), Number(match[3]))
    ? `${match[1]}-${match[2]}-${match[3]}` : null;
}

export function formatEventDateLabel(
  value: string,
  options: Intl.DateTimeFormatOptions,
  locale = 'ja-JP',
): string {
  const date = parseEventDate(value);
  if (Number.isNaN(date.getTime())) return '日期待確認';
  // A source date is a calendar day, not an instant. Format it in UTC so the
  // browser/server timezone can never move it into the previous/next weekday.
  const timeZone = isDateOnly(value) ? 'UTC' : (options.timeZone || 'UTC');
  return date.toLocaleDateString(locale, { ...options, timeZone });
}

export function formatEventWeekday(value: string): string {
  return formatEventDateLabel(value, { weekday: 'short' });
}

export function formatEventTime(value: string): string {
  const input = value.trim();
  if (isDateOnly(input)) return '時間待公布';
  const match = input.match(DATE_TIME);
  return match ? `${match[4]}:${match[5]}` : '時間待公布';
}

export function getEventTimeZoneLabel(value: string): string | null {
  const input = value.trim();
  if (!DATE_TIME.test(input) || !isSupportedEventDate(input)) return null;
  if (/Z$/i.test(input)) return 'UTC';
  const offset = input.match(/([+-]\d{2}:\d{2})$/);
  return offset ? `UTC${offset[1]}` : '來源時間';
}

export function getICSEventDates(value: string): { allDay: true; start: string; end: string } | { allDay: false } {
  const input = value.trim();
  if (!isDateOnly(input)) return { allDay: false };
  const start = parseEventDate(input);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  const key = (date: Date) => date.toISOString().slice(0, 10).replace(/-/g, '');
  return { allDay: true, start: key(start), end: key(end) };
}

export function getICSDateLines(value: string): string[] {
  const input = value.trim();
  const allDay = getICSEventDates(input);
  if (allDay.allDay) return [`DTSTART;VALUE=DATE:${allDay.start}`, `DTEND;VALUE=DATE:${allDay.end}`];
  if (!isSupportedEventDate(input)) throw new Error('Cannot export an event without a valid source date');
  const dateOnly = input.match(DATE_TIME);
  if (!dateOnly) throw new Error('Cannot export an event without a valid source time');
  const [, , , , hour, minute, second = '00'] = dateOnly;
  const localStart = `${dateOnly[1]}${dateOnly[2]}${dateOnly[3]}T${hour}${minute}${second}`;
  const end = new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]), Number(hour), Number(minute) + 120, Number(second));
  const pad = (n: number) => String(n).padStart(2, '0');
  const localEnd = `${end.getFullYear()}${pad(end.getMonth() + 1)}${pad(end.getDate())}T${pad(end.getHours())}${pad(end.getMinutes())}${pad(end.getSeconds())}`;
  if (/Z$|[+-]\d{2}:\d{2}$/i.test(input)) {
    const startInstant = new Date(input);
    const endInstant = new Date(startInstant.getTime() + 120 * 60 * 1000);
    const utc = (date: Date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    return [`DTSTART:${utc(startInstant)}`, `DTEND:${utc(endInstant)}`];
  }
  // A source-local time without an offset is floating, not an instant in the viewer's TZ.
  return [`DTSTART:${localStart}`, `DTEND:${localEnd}`];
}
