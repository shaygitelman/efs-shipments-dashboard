// The demo's mock data is written relative to a fixed anchor date rather
// than the real "today". This keeps every scenario (arriving in 2 days,
// delayed by 5, etc.) accurate no matter when the demo is actually opened.
export const TODAY = new Date("2026-08-22T08:00:00.000Z");

export function daysFromToday(offset: number, hour = 9): string {
  const d = new Date(TODAY);
  d.setUTCDate(d.getUTCDate() + offset);
  d.setUTCHours(hour, 0, 0, 0);
  return d.toISOString();
}

export function diffDays(a: string, b: string): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  const da = new Date(a);
  const db = new Date(b);
  return Math.round((da.getTime() - db.getTime()) / msPerDay);
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

// Israeli dd.mm.yyyy format. `short` drops the year for tight columns.
export function formatDate(iso: string, short = false): string {
  const d = new Date(iso);
  const day = pad(d.getUTCDate());
  const month = pad(d.getUTCMonth() + 1);
  return short ? `${day}.${month}` : `${day}.${month}.${d.getUTCFullYear()}`;
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const hours = pad(d.getUTCHours());
  const minutes = pad(d.getUTCMinutes());
  return `${formatDate(iso)}, ${hours}:${minutes}`;
}

// Hebrew has its own dual form for "2" (יומיים), so this can't be a generic
// pluralization — it's spelled out explicitly for the small day counts that
// actually occur in shipment timing (delays, ETAs within a week or two).
function hebrewDayCount(days: number): string {
  if (days === 1) return "יום אחד";
  if (days === 2) return "יומיים";
  return `${days} ימים`;
}

export function relativeToToday(iso: string): string {
  const days = diffDays(iso, TODAY.toISOString());
  if (days === 0) return "היום";
  if (days === 1) return "מחר";
  if (days === -1) return "אתמול";
  if (days === -2) return "לפני יומיים";
  if (days > 1) return `בעוד ${hebrewDayCount(days)}`;
  return `לפני ${hebrewDayCount(Math.abs(days))}`;
}
