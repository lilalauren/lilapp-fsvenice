import { extractPortMonthDay, type AgendaRow, type ExcursionAssignRow, type RoomDropRow, type TeamRow } from "./airtable.server";

import { parseTimeToMinutes, isEventPast } from "./time";

// Sort a list of assignee names to match the manual order defined in the
// Airtable Team LILA view. Names not present in the team list fall to the end,
// preserving their original relative order.
export function sortNamesByTeam(names: string[], team: TeamRow[]): string[] {
  const order = new Map<string, number>();
  team.forEach((t, i) => order.set(t.displayName.toLowerCase(), i));
  const rank = (n: string) => {
    const key = n.toLowerCase();
    if (order.has(key)) return order.get(key)!;
    // fuzzy: match by inclusion (e.g. first name vs "First Last")
    for (const [k, i] of order.entries()) {
      if (k.includes(key) || key.includes(k)) return i;
    }
    return Number.MAX_SAFE_INTEGER;
  };
  return [...names]
    .map((n, i) => ({ n, i, r: rank(n) }))
    .sort((a, b) => a.r - b.r || a.i - b.i)
    .map((x) => x.n);
}

// Return a new agenda where each row's assignedPhotographers is sorted by
// the Team LILA manual order.
export function agendaWithTeamOrder(agenda: AgendaRow[], team: TeamRow[]): AgendaRow[] {
  if (!team.length) return agenda;
  return agenda.map((r) => ({
    ...r,
    assignedPhotographers: sortNamesByTeam(r.assignedPhotographers, team),
  }));
}

export type DayInfo = {
  date: string; // ISO YYYY-MM-DD
  day?: string; // Weekday
  portName?: string;
  atSea: boolean;
};

/**
 * Build the per-trip day list DIRECTLY from Airtable ROS rows.
 * - Distinct dates come from Full Agenda (ROS) rows.
 * - A date is included only when at least one row on that date has an
 *   Assigned Photographer (filters out internal-only setup days).
 * - Port name comes directly from the ROS "Port" column (populated for every
 *   trip day, including embarkation/disembarkation and sea days).
 * - Sorted chronologically. The `excursions` arg is unused but retained for
 *   call-site compatibility.
 */
export function buildDayList(
  agenda: AgendaRow[],
  _excursions: ExcursionAssignRow[],
): DayInfo[] {
  const perDate = new Map<
    string,
    { day?: string; port?: string; hasAssignments: boolean }
  >();
  for (const r of agenda) {
    if (!r.date) continue;
    const cur = perDate.get(r.date) ?? { day: r.day, port: r.port, hasAssignments: false };
    if (r.assignedPhotographers.length > 0) cur.hasAssignments = true;
    if (!cur.day && r.day) cur.day = r.day;
    if (!cur.port && r.port) cur.port = r.port;
    perDate.set(r.date, cur);
  }

  const out: DayInfo[] = [];
  for (const [date, info] of perDate) {
    if (!info.hasAssignments) continue; // hide internal-only dates
    const portName = info.port;
    const atSea = !portName || /at\s*sea/i.test(portName);
    out.push({
      date,
      day: info.day,
      portName: atSea ? undefined : portName,
      atSea,
    });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

// A "port excursions" agenda row is the umbrella event for a port day
// (e.g. "Port: Amsterdam-Netherlands Excursions"). Individual activity
// breakdown lives in the Excursion Assignments table; each photographer has
// their own call/bus/return times, so we treat this row specially.
export function isPortExcursionRow(row: { eventName: string; assignedPhotographers?: string[] }): boolean {
  const n = row.eventName?.toLowerCase() ?? "";
  // Umbrella row for port excursions: either explicitly prefixed with "Port:"
  // or the title uses the plural form ("... Excursions").
  return /^\s*port\s*:/.test(n) || /\bexcursions\b/.test(n);
}

// Filter agenda for a given photographer (case-insensitive; matches any assigned name that includes token or vice versa).
export function filterForPhotographer(agenda: AgendaRow[], name: string): AgendaRow[] {
  const n = name.trim().toLowerCase();
  return agenda.filter((r) =>
    r.assignedPhotographers.some((p) => {
      const pn = p.toLowerCase();
      return pn === n || pn.includes(n) || n.includes(pn);
    }),
  );
}

// Filter excursion assignments for a photographer on a specific ISO date
// (YYYY-MM-DD). Matching is by month+day parsed from the Port string, since
// excursion rows only carry "Thursday, July 16 - Gothenburg, Sweden" (no year).
export function excursionsForPhotographerOnDay(
  excursions: ExcursionAssignRow[],
  photographer: string,
  dateISO?: string,
): ExcursionAssignRow[] {
  const n = photographer.trim().toLowerCase();
  let targetMonth: number | undefined;
  let targetDay: number | undefined;
  if (dateISO) {
    const m = dateISO.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) {
      targetMonth = parseInt(m[2], 10);
      targetDay = parseInt(m[3], 10);
    }
  }
  return excursions.filter((ex) => {
    const matchName = ex.photographers.some((p) => {
      const pn = p.toLowerCase();
      return pn === n || pn.includes(n) || n.includes(pn);
    });
    if (!matchName) return false;
    if (targetMonth && targetDay) {
      const md = extractPortMonthDay(ex.port);
      return !!md && md.month === targetMonth && md.day === targetDay;
    }
    return true;
  });
}

// Return all excursion rows scheduled on a specific ISO date (YYYY-MM-DD),
// matched by month+day parsed from the Port string.
export function excursionsOnDay(
  excursions: ExcursionAssignRow[],
  dateISO?: string,
): ExcursionAssignRow[] {
  if (!dateISO) return [];
  const m = dateISO.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return [];
  const month = parseInt(m[2], 10);
  const day = parseInt(m[3], 10);
  return excursions.filter((ex) => {
    const md = extractPortMonthDay(ex.port);
    return !!md && md.month === month && md.day === day;
  });
}

// Room drops scheduled on a given ISO date. Sort not-yet-captured first.
export function roomDropsOnDay(rows: RoomDropRow[], dateISO?: string): RoomDropRow[] {
  if (!dateISO) return [];
  const filtered = rows.filter((r) => r.date === dateISO);
  return filtered.sort((a, b) => Number(a.captured) - Number(b.captured));
}

export type ExcursionGroup = {
  key: string;
  excursion: string;
  activityOverview?: string;
  guestCount?: string;
  port?: string;
  assignments: Array<{
    id: string;
    photographers: string[];
    callTime?: string;
    busDepartureTime?: string;
    arrivalBackAtPort?: string;
  }>;
  earliestCallMin: number | null;
};

// Collapse per-photographer excursion rows into one group per excursion name
// so a card can list each photographer with their own individual times.
export function groupExcursionAssignments(rows: ExcursionAssignRow[]): ExcursionGroup[] {
  const byKey = new Map<string, ExcursionGroup>();
  for (const r of rows) {
    const key = (r.excursion || r.id).trim();
    const g = byKey.get(key) ?? {
      key,
      excursion: r.excursion || "(Untitled excursion)",
      activityOverview: r.activityOverview,
      guestCount: r.guestCount,
      port: r.port,
      assignments: [],
      earliestCallMin: null,
    };
    if (!g.activityOverview && r.activityOverview) g.activityOverview = r.activityOverview;
    if (!g.guestCount && r.guestCount) g.guestCount = r.guestCount;
    g.assignments.push({
      id: r.id,
      photographers: r.photographers,
      callTime: r.callTime,
      busDepartureTime: r.busDepartureTime,
      arrivalBackAtPort: r.arrivalBackAtPort,
    });
    const t = parseTimeToMinutes(r.callTime ?? r.busDepartureTime);
    if (t != null && (g.earliestCallMin == null || t < g.earliestCallMin)) {
      g.earliestCallMin = t;
    }
    byKey.set(key, g);
  }
  return Array.from(byKey.values());
}

export type DaySequenceItem =
  | { kind: "agenda"; row: AgendaRow; sortMin: number | null }
  | { kind: "excursion"; group: ExcursionGroup; sortMin: number | null };

// Build an ordered mixed sequence of agenda rows and excursion groups for a
// single day, sorted by earliest call/start time. Items without a parseable
// time sink to the bottom in their original order.
export function buildDaySequence(
  agenda: AgendaRow[],
  excursions: ExcursionAssignRow[],
  dateISO: string,
): DaySequenceItem[] {
  const dayAgenda = agenda.filter((r) => r.date === dateISO);
  const groups = groupExcursionAssignments(excursionsOnDay(excursions, dateISO));
  const items: DaySequenceItem[] = [
    ...dayAgenda.map<DaySequenceItem>((row) => ({
      kind: "agenda",
      row,
      sortMin: parseTimeToMinutes(row.callTime ?? row.startTime),
    })),
    ...groups.map<DaySequenceItem>((group) => ({
      kind: "excursion",
      group,
      sortMin: group.earliestCallMin,
    })),
  ];
  return items
    .map((it, i) => ({ it, i }))
    .sort((a, b) => {
      const av = a.it.sortMin;
      const bv = b.it.sortMin;
      if (av == null && bv == null) return a.i - b.i;
      if (av == null) return 1;
      if (bv == null) return -1;
      return av - bv || a.i - b.i;
    })
    .map((x) => x.it);
}


// Return the "Happening Now" and "Up Next" for a photographer's day.
export function nowAndNext(
  rows: AgendaRow[],
  todayISO: string,
  now: Date = new Date(),
): { happening: AgendaRow | null; upNext: AgendaRow | null; nextCallTime?: string } {
  const today = rows.filter((r) => r.date === todayISO);
  let happening: AgendaRow | null = null;
  let upNext: AgendaRow | null = null;

  const nowMin = now.getHours() * 60 + now.getMinutes();
  for (const r of today) {
    const start = parseTimeToMinutes(r.startTime ?? r.callTime);
    const end = parseTimeToMinutes(r.endTime);
    if (start == null) continue;
    if (nowMin >= start && (end == null || nowMin <= end)) {
      if (!happening) happening = r;
    } else if (start > nowMin && !upNext) {
      upNext = r;
    }
  }
  // If nothing is currently happening, upNext = first non-past today
  if (!happening && !upNext) {
    upNext =
      today.find((r) => !isEventPast(r, now)) ?? null;
  }
  return { happening, upNext, nextCallTime: upNext?.callTime ?? upNext?.startTime };
}
