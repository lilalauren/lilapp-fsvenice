// Time helpers. All display uses lowercase am/pm per LILApp spec.

// Parse "1:00 PM", "3 pm", "13:00", "2:00–2:45 pm" (returns first time as minutes).
export function parseTimeToMinutes(input?: string): number | null {
  if (!input) return null;
  const cleaned = input.replace(/[\u2013\u2014]/g, "-").trim();
  const first = cleaned.split(/\s*-\s*/)[0].trim();
  // Match "H", "H:MM", with optional am/pm
  const m = first.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm|AM|PM)?/);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = m[2] ? parseInt(m[2], 10) : 0;
  const ampm = m[3]?.toLowerCase();
  if (ampm === "pm" && h < 12) h += 12;
  if (ampm === "am" && h === 12) h = 0;
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

// Normalize "1:00 PM" -> "1:00 pm"; "3 pm" -> "3 pm"; "13:00" -> "1:00 pm".
export function formatTime(input?: string): string {
  if (!input) return "";
  const m = parseTimeToMinutes(input);
  if (m == null) return input.trim().toLowerCase();
  const h24 = Math.floor(m / 60);
  const mm = m % 60;
  const ampm = h24 >= 12 ? "pm" : "am";
  const h12 = ((h24 + 11) % 12) + 1;
  return mm === 0 ? `${h12} ${ampm}` : `${h12}:${String(mm).padStart(2, "0")} ${ampm}`;
}

// Format range "1:00 PM" .. "2:45 PM" -> "1:00–2:45 pm" (share ampm if same).
export function formatTimeRange(start?: string, end?: string): string {
  const s = formatTime(start);
  const e = formatTime(end);
  if (s && e) {
    const sAm = s.endsWith("am") || s.endsWith("pm");
    const eAm = e.endsWith("am") || e.endsWith("pm");
    if (sAm && eAm) {
      const sSuffix = s.slice(-2);
      const eSuffix = e.slice(-2);
      if (sSuffix === eSuffix) {
        return `${s.slice(0, -3)}–${e}`;
      }
    }
    return `${s}–${e}`;
  }
  return s || e;
}

// SINGLE source of truth for "has this event elapsed?" comparisons.
// Airtable times are treated as timezone-naive local wall-clock values —
// "2:00 pm" means 2:00 pm in whatever timezone the device is currently in.
// We build both the event moment and "now" from local components (year,
// month, day, hours, minutes) — never through Date.parse of an ISO string
// with 'Z', never through UTC conversion, no timezone offsets anywhere.
// The device clock is the single reference; as phones auto-update
// timezones country to country, comparisons follow automatically.
export function isEventPast(
  row: { date?: string; endTime?: string; startTime?: string; callTime?: string },
  now: Date = new Date(),
): boolean {
  if (!row.date) return false;
  const [y, m, d] = row.date.split("-").map(Number);
  if (!y || !m || !d) return false;
  // Prefer END time — an event isn't "past" until it's actually over.
  // Fall back to start, then call, then end-of-day.
  const endMin =
    parseTimeToMinutes(row.endTime) ??
    parseTimeToMinutes(row.startTime) ??
    parseTimeToMinutes(row.callTime);
  const eventLocal = new Date(y, m - 1, d, 0, 0, 0, 0);
  if (endMin != null) {
    eventLocal.setHours(Math.floor(endMin / 60), endMin % 60, 0, 0);
  } else {
    eventLocal.setHours(23, 59, 0, 0);
  }
  const nowLocal = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    now.getHours(),
    now.getMinutes(),
    now.getSeconds(),
    0,
  );
  return eventLocal.getTime() < nowLocal.getTime();
}

// Back-compat wrapper — prefer isEventPast. Every comparison in the app
// routes through isEventPast so they can't drift apart.
export function isPast(dateISO?: string, callOrStart?: string, now: Date = new Date()): boolean {
  return isEventPast({ date: dateISO, endTime: callOrStart }, now);
}

// "in Xm" / "in Xh Ym" / "now" / "" (past). Used ambiently.
export function relativeUntil(dateISO?: string, timeStr?: string, now: Date = new Date()): string {
  if (!dateISO) return "";
  const mins = parseTimeToMinutes(timeStr);
  if (mins == null) return "";
  const [y, m, d] = dateISO.split("-").map(Number);
  const target = new Date(y, m - 1, d, 0, 0, 0);
  target.setMinutes(mins);
  const diffMs = target.getTime() - now.getTime();
  if (diffMs <= 0) return "now";
  const totalMin = Math.round(diffMs / 60000);
  if (totalMin < 60) return `in ${totalMin}m`;
  const h = Math.floor(totalMin / 60);
  const m2 = totalMin % 60;
  if (h < 24) return m2 ? `in ${h}h ${m2}m` : `in ${h}h`;
  const days = Math.floor(h / 24);
  return `in ${days}d`;
}

export function todayISO(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatDateLong(dateISO?: string): string {
  if (!dateISO) return "";
  const [y, m, d] = dateISO.split("-").map(Number);
  if (!y) return dateISO;
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function formatDateShort(dateISO?: string): string {
  if (!dateISO) return "";
  const [y, m, d] = dateISO.split("-").map(Number);
  if (!y) return dateISO;
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

// Compact chip label, e.g. "WED · JUL 15" — always uppercase.
export function formatDayShort(dateISO?: string): string {
  if (!dateISO) return "";
  const [y, m, d] = dateISO.split("-").map(Number);
  if (!y) return dateISO;
  const dt = new Date(y, m - 1, d);
  const wk = dt.toLocaleDateString(undefined, { weekday: "short" }).toUpperCase().replace(/\.$/, "");
  const mo = dt.toLocaleDateString(undefined, { month: "short" }).toUpperCase().replace(/\.$/, "");
  return `${wk} · ${mo} ${d}`;
}
