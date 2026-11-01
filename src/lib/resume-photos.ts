// Supplied portraits live in public/photos so every host serves them.
// Add a line per photo Lauren supplies: ["first last", "/photos/first-last.jpg"].
const portraits = new Map<string, string>([]);

export function normalizePersonName(name: string) {
  return name
    .toLowerCase()
    .replace(/\b(mr|mrs|ms|dr)\.?\s+/g, "")
    .trim()
    .replace(/\s+/g, " ");
}

/** A supplied portrait wins; otherwise the Airtable Photo; otherwise "" (initials). */
export function resumePhoto(name: string, airtablePhoto: string) {
  return portraits.get(normalizePersonName(name)) || airtablePhoto;
}

export function personInitials(name: string) {
  return name
    .replace(/\(.*?\)/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}
