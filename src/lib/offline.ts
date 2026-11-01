import type { TableKey, TripData } from "./airtable.server";
import { VENICE_TZ } from "./time";

const STORAGE_KEY = "lilapp:venice:trip-cache:v1";
export const CACHE_EVENT = "lilapp:trip-cache-updated";

export type CachedTrip = { savedAt: number; data: TripData };

const TABLE_FIELDS: Record<TableKey, keyof Omit<TripData, "loaded">> = {
  SCHEDULE: "schedule",
  ACTIVITIES: "activities",
  KEY_PEOPLE: "people",
  ATTIRE: "attire",
  LOOKBOOK: "lookbook",
  TEAM: "team",
  BRIEFING: "briefing",
  OPEN_QUESTIONS: "questions",
};

/**
 * A table that failed this time keeps the copy saved on this phone, so one
 * hiccup never wipes good data from the offline cache.
 */
export function mergeWithCache(fresh: TripData, cached: TripData | null): TripData {
  if (!cached) return fresh;
  const merged = { ...fresh, loaded: { ...fresh.loaded } };
  for (const [table, field] of Object.entries(TABLE_FIELDS) as [
    TableKey,
    keyof Omit<TripData, "loaded">,
  ][]) {
    if (!fresh.loaded[table] && cached.loaded?.[table]) {
      (merged as Record<string, unknown>)[field] = cached[field];
      merged.loaded[table] = true;
    }
  }
  return merged;
}

export function saveTripCache(data: TripData): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ savedAt: Date.now(), data } satisfies CachedTrip),
    );
    window.dispatchEvent(new Event(CACHE_EVENT));
  } catch {
    /* storage full or unavailable — offline cache is best effort */
  }
}

export function readTripCache(): CachedTrip | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedTrip;
    if (!parsed || typeof parsed.savedAt !== "number" || !parsed.data?.loaded) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Register the service worker so pages and assets stay available offline. */
export function registerOfflineWorker(): void {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;
  if (window.location.protocol !== "https:" && window.location.hostname !== "localhost") return;
  navigator.serviceWorker.register("/sw.js").catch(() => undefined);
}

export function formatSavedAt(savedAt: number): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: VENICE_TZ,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(savedAt));
}
