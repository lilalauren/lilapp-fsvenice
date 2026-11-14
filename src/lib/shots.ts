// "Got it" ticks on each event's Coverage Assignments. Saved only on this phone,
// keyed by event and by the shot's own text, so editing one line in Airtable only
// clears that line.
const KEY = "lilapp:venice:shots";

type ShotMap = Record<string, string[]>;

function read(): ShotMap {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ShotMap) : {};
  } catch {
    return {};
  }
}

export function gotShots(eventId: string): string[] {
  return read()[eventId] ?? [];
}

export function toggleShot(eventId: string, shot: string): string[] {
  const all = read();
  const current = new Set(all[eventId] ?? []);
  if (current.has(shot)) current.delete(shot);
  else current.add(shot);
  all[eventId] = [...current];
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* storage unavailable: ticks just won't be remembered */
  }
  return all[eventId];
}
