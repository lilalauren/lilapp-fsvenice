import { normalizeName } from "./schedule";

// Images cropped from the Venice creative deck (Vincenzo Dascanio) and the PPI EMEA
// Lookbook, matched to events by name. Files live in public/venice/.
// Keys are normalized event names (see normalizeName): a Schedule row matches when its
// Event Name starts with the key; a Lookbook row matches its Event exactly.

export type VeniceImage = { src: string; caption: string };

export const LOOKBOOK_IMAGES: Array<[string, VeniceImage[]]> = [
  [
    "welcome reception",
    [
      { src: "/venice/lookbook-welcome-reception.webp", caption: "Lookbook" },
      { src: "/venice/deck-06.webp", caption: "Mood board" },
      { src: "/venice/deck-07.webp", caption: "Flower palette" },
      { src: "/venice/deck-23.webp", caption: "Dress code suggestion" },
    ],
  ],
  [
    "business session & lunch",
    [
      { src: "/venice/lookbook-business-session-lunch.webp", caption: "Lookbook" },
      { src: "/venice/deck-32.webp", caption: "Flower palette (meeting)" },
      { src: "/venice/deck-50.webp", caption: "Mood board (lunch)" },
      { src: "/venice/deck-51.webp", caption: "Flower palette (lunch)" },
    ],
  ],
  [
    "venice unveiled: dine arounds",
    [{ src: "/venice/lookbook-dine-arounds.webp", caption: "Lookbook" }],
  ],
  ["activities: unlock venice", [{ src: "/venice/lookbook-activities.webp", caption: "Lookbook" }]],
  [
    "farewell evening on the grand canal",
    [
      { src: "/venice/lookbook-farewell.webp", caption: "Lookbook" },
      { src: "/venice/deck-67.webp", caption: "Mood board" },
      { src: "/venice/deck-68.webp", caption: "Flower palette" },
      { src: "/venice/deck-69.webp", caption: "Light inspiration" },
      { src: "/venice/deck-70.webp", caption: "Dress code suggestion" },
    ],
  ],
];

export const SCHEDULE_IMAGES: Array<[string, VeniceImage[]]> = [
  [
    "hospitality lounge",
    [
      { src: "/venice/deck-09.webp", caption: "Airport decorations" },
      { src: "/venice/deck-10.webp", caption: "Entrance layout" },
      { src: "/venice/deck-11.webp", caption: "Photobooth layout" },
      { src: "/venice/deck-12.webp", caption: "Floor plan" },
      { src: "/venice/deck-13.webp", caption: "Layout" },
      { src: "/venice/deck-14.webp", caption: "Registration & badges desk" },
      { src: "/venice/deck-15.webp", caption: "Gift station · Piedaterre" },
      { src: "/venice/deck-16.webp", caption: "Gift station · Laguna B" },
      { src: "/venice/deck-17.webp", caption: "Gift station · Fortuny notebooks" },
      { src: "/venice/deck-18.webp", caption: "Cocktail tables" },
      { src: "/venice/deck-19.webp", caption: "Food station" },
      { src: "/venice/deck-20.webp", caption: "Drink station" },
      { src: "/venice/deck-21.webp", caption: "Lounge" },
    ],
  ],
  [
    "welcome reception",
    [
      { src: "/venice/deck-25.webp", caption: "Floor plan · Option A" },
      { src: "/venice/deck-26.webp", caption: "Floor plan · Option B" },
      { src: "/venice/deck-27.webp", caption: "Buffet" },
      { src: "/venice/deck-28.webp", caption: "Bar" },
      { src: "/venice/deck-29.webp", caption: "Gramophone station" },
      { src: "/venice/deck-30.webp", caption: "General decoration" },
      { src: "/venice/deck-24.webp", caption: "Entertainment inspiration" },
    ],
  ],
  [
    "business session",
    [
      { src: "/venice/deck-33.webp", caption: "Entrance layout" },
      { src: "/venice/deck-34.webp", caption: "Tunnel layout" },
      { src: "/venice/deck-36.webp", caption: "Floor plan · Step 1" },
      { src: "/venice/deck-37.webp", caption: "Floor plan · Step 2" },
      { src: "/venice/deck-38.webp", caption: "Layout · front view" },
      { src: "/venice/deck-39.webp", caption: "Layout · stage view" },
      { src: "/venice/deck-40.webp", caption: "Lounge N.26" },
      { src: "/venice/deck-41.webp", caption: "Lounge N.7" },
      { src: "/venice/deck-42.webp", caption: "Lounge N.2" },
    ],
  ],
  [
    "coffee break",
    [
      { src: "/venice/deck-43.webp", caption: "Floor plan · coffee break" },
      { src: "/venice/deck-44.webp", caption: "Bar" },
      { src: "/venice/deck-45.webp", caption: "Buffet" },
      { src: "/venice/deck-46.webp", caption: "Cocktail tables" },
      { src: "/venice/deck-47.webp", caption: "Mise en place" },
    ],
  ],
  [
    "lunch - a venetian rhythm",
    [
      { src: "/venice/deck-52.webp", caption: "Floor plan · 124 seated" },
      { src: "/venice/deck-53.webp", caption: "Lunch layout" },
      { src: "/venice/deck-54.webp", caption: "Buffet" },
      { src: "/venice/deck-55.webp", caption: "Bar" },
      { src: "/venice/deck-56.webp", caption: "Bistrot tables" },
      { src: "/venice/deck-57.webp", caption: "Cocktail tables" },
      { src: "/venice/deck-58.webp", caption: "General decoration" },
      { src: "/venice/deck-59.webp", caption: "Mise en place · buffet" },
      { src: "/venice/deck-60.webp", caption: "Mise en place" },
    ],
  ],
  [
    "brunch - terrazza danieli",
    [
      { src: "/venice/deck-62.webp", caption: "Mood board" },
      { src: "/venice/deck-63.webp", caption: "Brunch layout" },
      { src: "/venice/deck-64.webp", caption: "General decoration" },
    ],
  ],
  [
    "farewell gala dinner",
    [
      { src: "/venice/deck-72.webp", caption: "Entrance" },
      { src: "/venice/deck-73.webp", caption: "Floor plan · cocktail" },
      { src: "/venice/deck-74.webp", caption: "Cocktail layout" },
      { src: "/venice/deck-75.webp", caption: "Bar" },
      { src: "/venice/deck-76.webp", caption: "DJ booth" },
      { src: "/venice/deck-77.webp", caption: "Cocktail tables" },
      { src: "/venice/deck-78.webp", caption: "General decoration" },
      { src: "/venice/deck-79.webp", caption: "Smoking area" },
      { src: "/venice/deck-80.webp", caption: "Stairs" },
      { src: "/venice/deck-81.webp", caption: "Floor plan · dinner 140" },
      { src: "/venice/deck-82.webp", caption: "Dinner layout" },
      { src: "/venice/deck-83.webp", caption: "Centerpieces" },
      { src: "/venice/deck-84.webp", caption: "Tablecloth & chairs" },
      { src: "/venice/deck-85.webp", caption: "General decoration" },
      { src: "/venice/deck-86.webp", caption: "Mise en place" },
      { src: "/venice/deck-87.webp", caption: "Performance area" },
      { src: "/venice/deck-88.webp", caption: "Smoking area" },
      { src: "/venice/deck-71.webp", caption: "Entertainment inspiration" },
    ],
  ],
  [
    "after party",
    [
      { src: "/venice/deck-89.webp", caption: "Floor plan · after party" },
      { src: "/venice/deck-90.webp", caption: "After party layout" },
      { src: "/venice/deck-91.webp", caption: "Lounge N.3" },
      { src: "/venice/deck-92.webp", caption: "General decoration & bathroom" },
    ],
  ],
];

export function scheduleImages(eventName: string): VeniceImage[] {
  const name = normalizeName(eventName);
  return SCHEDULE_IMAGES.find(([key]) => name.startsWith(key))?.[1] ?? [];
}

export function lookbookImages(event: string): VeniceImage[] {
  const name = normalizeName(event);
  return LOOKBOOK_IMAGES.find(([key]) => name === key)?.[1] ?? [];
}
