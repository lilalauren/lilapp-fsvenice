import type { BriefingRow } from "./airtable.server";
import { normalizeName } from "./schedule";

export type Place = "briefing" | "resume" | "hidden";

/** Briefing table "Show On": empty means the Briefing tab. */
export function placeOf(row: Pick<BriefingRow, "showOn">): Place {
  const v = normalizeName(row.showOn);
  return v === "resume" || v === "hidden" ? v : "briefing";
}

export function rowsFor(rows: BriefingRow[], place: Place): BriefingRow[] {
  return rows.filter((r) => placeOf(r) === place);
}

export function findSection(rows: BriefingRow[], name: string): BriefingRow | undefined {
  return rows.find((r) => normalizeName(r.section) === name);
}

/** The client's Cvent app link, wherever it sits in the Briefing table. */
export function cventUrl(rows: BriefingRow[]): string | undefined {
  for (const r of rows) {
    const match = r.content.match(/https?:\/\/[^\s]*cvent[^\s]*/i);
    if (match) return match[0];
  }
  return undefined;
}

/** "Guest counts" lines like "Hoteliers: 70"; blank numbers are skipped. */
export function guestCounts(rows: BriefingRow[]): Array<{ label: string; value: string }> {
  const row = findSection(rows, "guest counts");
  if (!row) return [];
  return row.content
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-–—•*·]+\s*/, "").match(/^(.+?):\s*(\S.*)$/))
    .filter((m): m is RegExpMatchArray => Boolean(m))
    .map((m) => ({ label: m[1]!.trim(), value: m[2]!.trim() }));
}
