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
