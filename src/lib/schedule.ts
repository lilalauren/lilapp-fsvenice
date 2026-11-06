import type { ActivityRow, ScheduleRow } from "./airtable.server";
import { isEventPast, isHappeningNow, nowInVenice, parseTimeToMinutes } from "./time";

/** Lowercase, accent-free, single-spaced, ASCII dashes — for matching names. */
export function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[–—]/g, "-")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Setup/décor rows are prep time, not guest-facing events. Matches "Décor" with the accent. */
export function isSetupRow(row: Pick<ScheduleRow, "eventName" | "type">): boolean {
  const text = normalizeName(`${row.eventName} ${row.type}`);
  return /\bsetup\b|\bdecor\b/.test(text);
}

/** Sort Time - hidden ("14:00") first, then Start, then Call. Untimed rows go first in the day. */
export function sortMinutes(row: Pick<ScheduleRow, "sortTime" | "startTime" | "callTime">): number {
  return (
    parseTimeToMinutes(row.sortTime) ??
    parseTimeToMinutes(row.startTime) ??
    parseTimeToMinutes(row.callTime) ??
    -1
  );
}

export function sortSchedule(rows: ScheduleRow[]): ScheduleRow[] {
  return rows
    .map((row, i) => ({ row, i }))
    .sort(
      (a, b) =>
        a.row.date.localeCompare(b.row.date) ||
        sortMinutes(a.row) - sortMinutes(b.row) ||
        // Same start time: "Sort Time - hidden" decides (e.g. 08:55 before 09:05).
        (parseTimeToMinutes(a.row.sortHint) ?? 0) - (parseTimeToMinutes(b.row.sortHint) ?? 0) ||
        a.i - b.i,
    )
    .map((x) => x.row);
}

export function scheduleDays(rows: ScheduleRow[]): string[] {
  return Array.from(new Set(rows.map((r) => r.date).filter(Boolean))).sort();
}

/** Team-member filter: exact name match (no "Ann" matching "Joanna"). */
export function isAssigned(names: string[], person: string): boolean {
  const p = normalizeName(person);
  return names.some((n) => normalizeName(n) === p);
}

const ACTIVITY_SUFFIX = /\s*\((part \d+|backup)\)\s*$/i;

/** Link a Schedule row to its Activities row by name, e.g. "… Flavours (Part 1)". */
export function matchActivity(
  row: ScheduleRow,
  activities: ActivityRow[],
): ActivityRow | undefined {
  const event = normalizeName(row.eventName.replace(ACTIVITY_SUFFIX, ""));
  if (!event) return undefined;
  return activities.find((a) => {
    const name = normalizeName(a.activity);
    return name === event || event.startsWith(name) || name.startsWith(event);
  });
}

/** The Schedule row for an activity (the reverse of matchActivity), e.g. for its call time. */
export function scheduleRowForActivity(
  activity: ActivityRow,
  rows: ScheduleRow[],
): ScheduleRow | undefined {
  return sortSchedule(rows).find((r) => matchActivity(r, [activity]) === activity);
}

/** LILA covering "Yes" first, then "Likely", then everything else; earliest start first. */
export function sortActivities(activities: ActivityRow[]): ActivityRow[] {
  const rank = (a: ActivityRow) =>
    ({ yes: 0, likely: 1 })[normalizeName(a.lilaCovering) as "yes" | "likely"] ?? 2;
  return [...activities].sort(
    (a, b) =>
      rank(a) - rank(b) ||
      (parseTimeToMinutes(a.start) ?? 0) - (parseTimeToMinutes(b.start) ?? 0) ||
      a.activity.localeCompare(b.activity),
  );
}

// Décor shoots happen before the main events, never before activities or transfers.
const NO_DECOR_TYPES = ["activity", "transfer", "arrival", "departure", "wellness"];

/** A main event with a Décor Advance gets its own Décor line just before it. */
export function hasDecorCard(row: ScheduleRow): boolean {
  return Boolean(
    row.decorAdvance && !isSetupRow(row) && !NO_DECOR_TYPES.includes(normalizeName(row.type)),
  );
}

export type DayItem =
  | { kind: "event"; key: string; row: ScheduleRow; setup: boolean }
  | { kind: "decor"; key: string; row: ScheduleRow }
  | { kind: "activities"; key: string; date: string; activities: ActivityRow[] };

/**
 * One day's run of show:
 * - every main event with a Décor Advance gets its own Décor line just ahead of it;
 * - optionally, the Activities table as one group card where Saturday's activities start.
 */
export function buildDayItems(
  rows: ScheduleRow[],
  activities: ActivityRow[],
  person?: string | null,
  { activitiesCard = false }: { activitiesCard?: boolean } = {},
): DayItem[] {
  const visible = person ? rows.filter((r) => isAssigned(r.photographers, person)) : rows;
  const myActivities = person
    ? activities.filter((a) => isAssigned([a.photographer], person))
    : activities;
  // The Activities table has no date; it belongs to the day of the first Activity row.
  // Off by default: the Schedule already lists each activity as its own row.
  const activityAnchor = activitiesCard
    ? sortSchedule(rows).find((r) => normalizeName(r.type) === "activity")
    : undefined;

  const items: DayItem[] = [];
  let activitiesPlaced = false;
  for (const row of sortSchedule(visible)) {
    if (
      !activitiesPlaced &&
      activityAnchor &&
      myActivities.length > 0 &&
      row.date === activityAnchor.date &&
      sortMinutes(row) >= sortMinutes(activityAnchor)
    ) {
      items.push({
        kind: "activities",
        key: `activities-${row.date}`,
        date: row.date,
        activities: sortActivities(myActivities),
      });
      activitiesPlaced = true;
    }
    if (hasDecorCard(row)) items.push({ kind: "decor", key: `decor-${row.id}`, row });
    items.push({ kind: "event", key: row.id, row, setup: isSetupRow(row) });
  }
  if (!activitiesPlaced && activityAnchor && myActivities.length > 0) {
    items.push({
      kind: "activities",
      key: `activities-${activityAnchor.date}`,
      date: activityAnchor.date,
      activities: sortActivities(myActivities),
    });
  }
  return items;
}

export function itemDate(item: DayItem): string {
  return item.kind === "activities" ? item.date : item.row.date;
}

export function isItemPast(item: DayItem, now: Date = new Date()): boolean {
  if (item.kind === "decor") return isEventPast(item.row, now);
  if (item.kind === "activities") {
    const end = Math.max(...item.activities.map((a) => parseTimeToMinutes(a.end) ?? 0));
    const venice = nowInVenice(now);
    if (item.date !== venice.date) return item.date < venice.date;
    return end > 0 && end < venice.minutes;
  }
  return isEventPast(item.row, now);
}

/** "Happening Now" and "Up Next" for one person's day (My Schedule). */
export function nowAndNext(
  rows: ScheduleRow[],
  dateISO: string,
  now: Date = new Date(),
): { happening: ScheduleRow | null; upNext: ScheduleRow | null } {
  const today = sortSchedule(rows.filter((r) => r.date === dateISO));
  const happening = today.find((r) => isHappeningNow(r, now)) ?? null;
  const upNext =
    today.find((r) => r !== happening && !isEventPast(r, now) && !isHappeningNow(r, now)) ?? null;
  return { happening, upNext };
}
