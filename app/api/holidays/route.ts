import { NextResponse } from 'next/server';

export const revalidate = 86400; // 1 day cache

interface Holiday {
  date: string;  // YYYY-MM-DD
  name: string;
}

// Parse ICS to extract holidays
function parseICS(ics: string): Holiday[] {
  const holidays: Holiday[] = [];
  const events = ics.split('BEGIN:VEVENT').slice(1);

  for (const ev of events) {
    const dateMatch = ev.match(/DTSTART;VALUE=DATE:(\d{8})/);
    const nameMatch = ev.match(/SUMMARY:(.+?)(?:\r?\n|$)/);
    if (dateMatch && nameMatch) {
      const d = dateMatch[1];
      holidays.push({
        date: `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`,
        name: nameMatch[1].trim(),
      });
    }
  }
  return holidays;
}

export async function GET() {
  try {
    const res = await fetch('https://www.1823.gov.hk/common/ical/tc.ics', {
      next: { revalidate: 86400 },
    });
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    const ics = await res.text();
    const holidays = parseICS(ics);
    return NextResponse.json({ holidays, updated_at: new Date().toISOString() });
  } catch (error) {
    console.error('Holidays fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch holidays', holidays: [] }, { status: 500 });
  }
}
