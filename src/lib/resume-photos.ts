// Supplied portraits live in public/photos so every host serves them.
// Headshots from the client's PPI slides (Introducing, Your Worldwide Sales Team, Our Host).
// Add a line per photo Lauren supplies: ["first last", "/photos/first-last.webp"].
const portraits = new Map<string, string>([
  ["adrian messerli", "/photos/adrian-messerli.webp"],
  ["adriano rausa", "/photos/adriano-rausa.webp"],
  ["alessia venturini", "/photos/alessia-venturini.webp"],
  ["alexis hughes", "/photos/alexis-hughes.webp"],
  ["anne mansfield", "/photos/anne-mansfield.webp"],
  ["audrey bozzi", "/photos/audrey-bozzi.webp"],
  ["carolyn mar", "/photos/carolyn-mar.webp"],
  ["christian zandonella", "/photos/christian-zandonella.webp"],
  ["claire harvey", "/photos/claire-harvey.webp"],
  ["fiona williams", "/photos/fiona-williams.webp"],
  ["francesco maria corazzi", "/photos/francesco-maria-corazzi.webp"],
  ["jasmine lee", "/photos/jasmine-lee.webp"],
  ["joerg zimmermann", "/photos/joerg-zimmermann.webp"],
  ["khaled al-idrissi", "/photos/khaled-al-idrissi.webp"],
  ["mahmoud salah", "/photos/mahmoud-salah.webp"],
  ["marc speichert", "/photos/marc-speichert.webp"],
  ["massimo colella", "/photos/massimo-colella.webp"],
  ["matteo manetta", "/photos/matteo-manetta.webp"],
  ["meryem marbouhy", "/photos/meryem-marbouhy.webp"],
  ["nabila bristow", "/photos/nabila-bristow.webp"],
  ["nathalie lazukina", "/photos/nathalie-lazukina.webp"],
  ["sara zanettin", "/photos/sara-zanettin.webp"],
  ["smeralda midili", "/photos/smeralda-midili.webp"],
  ["victoria matteucci", "/photos/victoria-matteucci.webp"],
]);

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
