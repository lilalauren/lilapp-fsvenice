// "Updates" bell: what changed in Schedule and Key People since this phone last looked.
// Uses each row's "Last modified" field. Seen times live only on this phone.
import type { TripData } from "./airtable.server";

const SEEN_KEY = "lilapp:venice:seen";
const BASELINE_KEY = "lilapp:venice:baseline";

export type SeenMap = Record<string, string>;

export type UpdateItem = {
  id: string;
  kind: "schedule" | "person";
  title: string;
  detail: string;
  lastModified: string;
  date?: string;
};

const valid = (v: string | undefined) => {
  const t = v ? Date.parse(v) : NaN;
  return Number.isNaN(t) ? null : t;
};

/** Updated when Last modified is newer than what this phone has seen (or the first-run baseline). */
export function isUpdated(
  lastModified: string | undefined,
  seen: string | undefined,
  baseline: string,
) {
  const lm = valid(lastModified);
  const ref = valid(seen) ?? valid(baseline);
  return lm != null && ref != null && lm > ref;
}

export function collectUpdates(trip: TripData, seen: SeenMap, baseline: string): UpdateItem[] {
  const items: UpdateItem[] = [
    ...trip.schedule.map((r) => ({
      id: r.id,
      kind: "schedule" as const,
      title: r.eventName || "Untitled",
      detail: [r.day, r.startTime].filter(Boolean).join(" · "),
      lastModified: r.lastModified,
      date: r.date,
    })),
    ...trip.people.map((p) => ({
      id: p.id,
      kind: "person" as const,
      title: p.name,
      detail: [p.title, p.company].filter(Boolean).join(" · "),
      lastModified: p.lastModified,
    })),
  ];
  return items
    .filter((i) => isUpdated(i.lastModified, seen[i.id], baseline))
    .sort((a, b) => (valid(b.lastModified) ?? 0) - (valid(a.lastModified) ?? 0));
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable */
  }
}

export function readSeen(): SeenMap {
  return read<SeenMap>(SEEN_KEY, {});
}

/** First visit sets the baseline, so nothing shows as "updated" on a fresh install. */
export function readBaseline(): string {
  const existing = read<string | null>(BASELINE_KEY, null);
  if (existing) return existing;
  const now = new Date().toISOString();
  write(BASELINE_KEY, now);
  return now;
}

export function markSeen(items: Array<Pick<UpdateItem, "id" | "lastModified">>): SeenMap {
  const seen = readSeen();
  for (const i of items) seen[i.id] = i.lastModified;
  write(SEEN_KEY, seen);
  return seen;
}
