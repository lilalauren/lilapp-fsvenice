import { normalizeName } from "./schedule";

// The Danieli's Banquet Event Orders (PDFs in public/beo/), matched to Schedule events by
// name: an Event Name that starts with a key gets that BEO's pill.
export type Beo = { number: string; title: string; src: string };

const HOSPITALITY: Beo = {
  number: "1",
  title: "Hospitality Desk · First Noble Floor · Thu Nov 5",
  src: "/beo/beo-1-hospitality-desk-nov-5.pdf",
};
const WELCOME: Beo = {
  number: "2",
  title: "Welcome Reception · Bar Dandolo · Thu Nov 5",
  src: "/beo/beo-2-welcome-reception-nov-5.pdf",
};
const MISERICORDIA: Beo = {
  number: "4",
  title: "Coffee Break, Meeting & Lunch · Misericordia · Fri Nov 6",
  src: "/beo/beo-4-misericordia-coffee-meeting-lunch-nov-6.pdf",
};
const BRUNCH: Beo = {
  number: "4",
  title: "Brunch · Terrazza Danieli · Sat Nov 7",
  src: "/beo/beo-4-brunch-terrazza-nov-7.pdf",
};
const FAREWELL: Beo = {
  number: "5",
  title: "Farewell Dinner · Palazzo Polignac · Sat Nov 7",
  src: "/beo/beo-5-farewell-polignac-nov-7.pdf",
};

const BEOS: Array<[string, Beo]> = [
  ["hospitality lounge", HOSPITALITY],
  ["welcome reception", WELCOME],
  ["group departure to scuola", MISERICORDIA],
  ["business session", MISERICORDIA],
  ["coffee break", MISERICORDIA],
  ["1:1 appointments", MISERICORDIA],
  ["lunch - a venetian rhythm", MISERICORDIA],
  ["brunch - terrazza danieli", BRUNCH],
  ["cocktail reception", FAREWELL],
  ["farewell gala dinner", FAREWELL],
  ["after party", FAREWELL],
];

export function scheduleBeo(eventName: string): Beo | undefined {
  const name = normalizeName(eventName);
  return BEOS.find(([key]) => name.startsWith(key))?.[1];
}
