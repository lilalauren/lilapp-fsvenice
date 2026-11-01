// Time helpers. Every comparison uses Venice wall-clock time (Europe/Rome),
// whatever timezone the phone happens to be in. Times are displayed exactly
// as typed in Airtable.

export const VENICE_TZ = "Europe/Rome";
export const TIME_LABEL = "All times shown in Venice time (CET)";

// Parse "1:00 PM", "~6:30 PM", "13:00", "6:45 AM (team leaves…)" → minutes.
// Free text such as "TBD" or "Before 6:45 PM" returns null.
export function parseTimeToMinutes(input?: string): number | null {
  if (!input) return null;
  const m = input
    .replace(/[–—]/g, "-")
    .trim()
    .match(/^~?\s*(\d{1,2})(?::(\d{2}))?\s*([ap]\.?m\.?)?/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = m[2] ? parseInt(m[2], 10) : 0;
  const ampm = m[3]?.toLowerCase().replace(/\./g, "");
  if (ampm === "pm" && h < 12) h += 12;
  if (ampm === "am" && h === 12) h = 0;
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

// "7:00 PM" + "10:30 PM" → "7:00 PM – 10:30 PM".
export function formatTimeRange(start?: string, end?: string): string {
  const s = start?.trim() ?? "";
  const e = end?.trim() ?? "";
  return s && e ? `${s} – ${e}` : s || e;
}

/** Current date + minutes past midnight in Venice. */
export function nowInVenice(now: Date = new Date()): { date: string; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: VENICE_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    minutes: (Number(get("hour")) % 24) * 60 + Number(get("minute")),
  };
}

// SINGLE source of truth for "has this event finished?". An event isn't past
// until its END time (falling back to start, then call, then end of day).
export function isEventPast(
  row: { date?: string; endTime?: string; startTime?: string; callTime?: string },
  now: Date = new Date(),
): boolean {
  const day = row.date?.slice(0, 10);
  if (!day) return false;
  const venice = nowInVenice(now);
  if (day !== venice.date) return day < venice.date;
  const end =
    parseTimeToMinutes(row.endTime) ??
    parseTimeToMinutes(row.startTime) ??
    parseTimeToMinutes(row.callTime);
  return (end ?? 24 * 60 - 1) < venice.minutes;
}

/** Is the event running right now (between call/start and end)? */
export function isHappeningNow(
  row: { date?: string; endTime?: string; startTime?: string; callTime?: string },
  now: Date = new Date(),
): boolean {
  const venice = nowInVenice(now);
  if (row.date?.slice(0, 10) !== venice.date) return false;
  const start = parseTimeToMinutes(row.startTime) ?? parseTimeToMinutes(row.callTime);
  if (start == null || start > venice.minutes) return false;
  return !isEventPast(row, now);
}

// "in Xm" / "in Xh Ym" / "now" / "" (past or no time). Used ambiently.
export function relativeUntil(dateISO?: string, timeStr?: string, now: Date = new Date()): string {
  const mins = parseTimeToMinutes(timeStr);
  if (!dateISO || mins == null) return "";
  const venice = nowInVenice(now);
  const dayDiff = Math.round(
    (Date.parse(`${dateISO}T00:00:00Z`) - Date.parse(`${venice.date}T00:00:00Z`)) / 864e5,
  );
  const total = dayDiff * 24 * 60 + mins - venice.minutes;
  if (total <= 0) return "now";
  if (total < 60) return `in ${total}m`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h < 24) return m ? `in ${h}h ${m}m` : `in ${h}h`;
  return `in ${Math.floor(h / 24)}d`;
}

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sept",
  "Oct",
  "Nov",
  "Dec",
];

function parseDay(date: string): Date | null {
  const d = new Date(`${date.slice(0, 10)}T12:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Dropdown label: "Thursday, Nov 5". */
export function formatDayLabel(date: string): string {
  const d = parseDay(date);
  if (!d) return date;
  return `${WEEKDAYS[d.getUTCDay()]}, ${MONTHS_SHORT[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

/** Day heading: "THURSDAY, November 5". */
export function formatDayLong(date: string): string {
  const d = parseDay(date);
  if (!d) return date;
  return `${WEEKDAYS[d.getUTCDay()]!.toUpperCase()}, ${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

/** "Thursday, November 5" — matches the Day text Lauren uses in Lookbook and Attire. */
export function formatDayPlain(date: string): string {
  const d = parseDay(date);
  if (!d) return date;
  return `${WEEKDAYS[d.getUTCDay()]}, ${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

/** "6:42 PM", "Yesterday 4:15 PM" or "Nov 6 4:15 PM" in Venice time. */
export function formatChangeTime(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const clock = new Intl.DateTimeFormat("en-US", {
    timeZone: VENICE_TZ,
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
  const day = (x: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: VENICE_TZ }).format(x);
  if (day(d) === day(now)) return clock;
  if (day(d) === day(new Date(now.getTime() - 864e5))) return `Yesterday ${clock}`;
  const md = new Intl.DateTimeFormat("en-US", {
    timeZone: VENICE_TZ,
    month: "short",
    day: "numeric",
  }).format(d);
  return `${md} ${clock}`;
}

const CLOCK_RE = /^~?\s*\d{1,2}(:\d{2})?\s*([ap]\.?m\.?)?/i;

/** Compact clock for the time column: "6:45 AM (team leaves…)" → "6:45 am", "7:00 PM" → "7 pm". */
export function shortTime(input?: string): string {
  const text = input?.trim() ?? "";
  const minutes = parseTimeToMinutes(text);
  if (minutes == null || !CLOCK_RE.test(text)) return text;
  const h24 = Math.floor(minutes / 60);
  const mm = minutes % 60;
  const h12 = ((h24 + 11) % 12) + 1;
  const suffix = h24 >= 12 ? "pm" : "am";
  return `${text.startsWith("~") ? "~" : ""}${h12}${mm ? `:${String(mm).padStart(2, "0")}` : ""} ${suffix}`;
}

/** "10:45 AM" + "12:50 PM" → "10:45 am–12:50 pm"; shares the suffix: "7–10 pm". */
export function shortRange(start?: string, end?: string): string {
  const s = shortTime(start);
  const e = shortTime(end);
  if (!s || !e) return s || e;
  const suffix = / (am|pm)$/;
  const sm = s.match(suffix)?.[1];
  if (sm && sm === e.match(suffix)?.[1]) return `${s.replace(suffix, "")}–${e}`;
  return `${s}–${e}`;
}
