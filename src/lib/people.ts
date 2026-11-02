import type { PersonRow, TripData } from "./airtable.server";
import { normalizeName } from "./schedule";

// Lauren's Key People groups. Older group names fold into the matching option.
export const RESUME_GROUPS = [
  { label: "Leadership", groups: ["leadership", "four seasons vip"] },
  { label: "Worldwide Sales Team", groups: ["worldwide sales team"] },
  { label: "Danieli Hotel Staff", groups: ["danieli hotel staff", "hotel host"] },
  { label: "DMC & Client Contact", groups: ["dmc", "client contact"] },
] as const;

export function peopleInGroup(people: PersonRow[], label: string): PersonRow[] {
  const option = RESUME_GROUPS.find((g) => g.label === label) ?? RESUME_GROUPS[0];
  return people
    .filter((p) => (option.groups as readonly string[]).includes(normalizeName(p.group)))
    .sort((a, b) => (a.order ?? 999) - (b.order ?? 999) || a.name.localeCompare(b.name));
}

/** Team-member dropdown: the Team table, or anyone named in Schedule if Team is empty. */
export function teamNames(data: TripData): string[] {
  const fromTeam = data.team.map((t) => t.name);
  if (fromTeam.length) return fromTeam;
  return Array.from(new Set(data.schedule.flatMap((r) => r.photographers))).sort();
}

/** Key People on an activity (their Activity field names it), not counting DMC or client staff. */
export function activityVips(people: PersonRow[], activityName: string): string {
  const target = normalizeName(activityName.replace(/\s*\((part \d+|backup)\)\s*$/i, ""));
  if (!target) return "";
  return people
    .filter((p) => !["dmc", "client contact"].includes(normalizeName(p.group)))
    .filter((p) =>
      p.activity
        .split(/[;,\n]/)
        .map(normalizeName)
        .some((a) => a && (a === target || a.startsWith(target) || target.startsWith(a))),
    )
    .map((p) => p.name)
    .join(", ");
}
