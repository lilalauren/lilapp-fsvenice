import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";

export const Route = createFileRoute("/packing")({
  head: () => ({
    meta: [
      { title: "Packing Guide — The Northern Crossing" },
      {
        name: "description",
        content:
          "Day-by-day packing plan and attire tier key for the Sabbatical 2026 Northern Crossing.",
      },
    ],
  }),
  component: Packing,
});

type AttireTier = "resort" | "smart" | "formal" | "theme";

function TierPill({ tier, children }: { tier: AttireTier; children: React.ReactNode }) {
  const map: Record<AttireTier, string> = {
    resort: "border-primary/40 bg-accent text-foreground",
    smart: "border-border bg-secondary text-foreground",
    formal: "border-foreground/60 bg-foreground text-background",
    theme: "border-destructive/40 bg-destructive/10 text-foreground",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${map[tier]}`}
    >
      {children}
    </span>
  );
}

type Day = {
  date: string;
  title: string;
  weather: string;
  day: string;
  evening: string;
  tier: AttireTier;
  tierLabel: string;
  pack: string;
};

const DAYS: Day[] = [
  {
    date: "Fri, Jul 10",
    title: "London",
    weather: "68–75°F",
    day: "Hotel check-in, afternoon London excursions.",
    evening:
      "Welcome Reception & Dinner. Dresses/skirts/elevated denim with a polished top, or trousers/dark denim/blazer/collared shirt. Heels, dressy flats, or loafers.",
    tier: "smart",
    tierLabel: "Elevated smart casual",
    pack: "Daytime casual for arrival + excursions, one polished-but-not-formal outfit for tonight, light layer for the Londoner Lounge afterward.",
  },
  {
    date: "Sat, Jul 11",
    title: "Dover",
    weather: "66–74°F",
    day: "Brunch, luggage collection by 10am, coach to Dover, board ship, sail-away on pool deck.",
    evening: "Full Group Dinner, assigned seating.",
    tier: "resort",
    tierLabel: "Evening Resort Elegant",
    pack: "Comfortable travel clothes for the transfer/boarding, swim/pool-deck option for sail-away, evening resort elegant outfit.",
  },
  {
    date: "Sun, Jul 12",
    title: "Zeebrugge / Bruges & Ghent",
    weather: "66–74°F",
    day: "Port day, various excursions — cobblestone streets, so comfortable walking shoes.",
    evening:
      "Half group assigned dinner / half open seating, then Chocolate Reception 9:30–11pm. No outfit change needed — outdoor pool deck runs 52–60°F, bring a light layer.",
    tier: "resort",
    tierLabel: "Evening Resort Elegant",
    pack: "Walking shoes, daytime excursion layer, one evening outfit that works for both dinner and the outdoor reception, light wrap/jacket for the pool deck at night.",
  },
  {
    date: "Mon, Jul 13",
    title: "Amsterdam",
    weather: "65–73°F",
    day: "Various excursions.",
    evening: "Half group dinner, Jason Suran (mentalist) after dinner.",
    tier: "resort",
    tierLabel: "Evening Resort Elegant",
    pack: "Walking shoes for excursions, evening resort elegant outfit.",
  },
  {
    date: "Tue, Jul 14",
    title: "At Sea",
    weather: "evenings 52–60°F",
    day: "Guest speakers, sommelier luncheon, trivia, wine tasting, casino competition.",
    evening:
      "Open seating dinner, then 70s Theme After-Dinner Party. Festive/elevated 70s: bold prints, flared silhouettes, metallics, jumpsuits, disco details, vintage accessories.",
    tier: "theme",
    tierLabel: "70s Theme (costume-adjacent)",
    pack: "Daytime resort casual (no excursions, all onboard) and your 70s-themed outfit for tonight — plan ahead, this isn't just 'elegant.'",
  },
  {
    date: "Wed, Jul 15",
    title: "Oslo",
    weather: "64–75°F",
    day: "Excursions ending in Oslo, refresh time before evening.",
    evening:
      "Oslo Off-Ship Event at the former U.S. Embassy — your most elevated night of the trip. Floor-length gowns, formal cocktail dresses, or dark suits/tuxedo-optional with dress shirt and tie.",
    tier: "formal",
    tierLabel: "Formal",
    pack: "Walking shoes for excursions, then your one true formal outfit and formal shoes — the outfit that needs the most planning/ironing room in your bag.",
  },
  {
    date: "Thu, Jul 16",
    title: "Gothenburg",
    weather: "63–72°F",
    day: "Champagne flight tasting, trivia, guest speaker, various excursions.",
    evening: "Open seating dinner, Silverscreen Musical Show after.",
    tier: "resort",
    tierLabel: "Evening Resort Elegant",
    pack: "Walking shoes, evening resort elegant outfit (can repeat from earlier in the week).",
  },
  {
    date: "Fri, Jul 17",
    title: "Aarhus",
    weather: "62–71°F",
    day: "Boarding/DJ at pool deck.",
    evening:
      "Full Group Dinner, assigned seating, 'Bathrobes at the Bar' Bon Voyage after.",
    tier: "resort",
    tierLabel: "Evening Resort Elegant",
    pack: "Evening resort elegant outfit, comfortable robe/loungewear for the bon voyage close-out.",
  },
  {
    date: "Sat, Jul 18",
    title: "Copenhagen",
    weather: "64–73°F",
    day: "Disembark 8–10am.",
    evening: "—",
    tier: "smart",
    tierLabel: "Comfortable travel",
    pack: "Comfortable travel clothes; all luggage packed the night before per the Travel Guide's disembarking notes.",
  },
];

function Packing() {
  return (
    <div className="min-h-screen bg-background pb-16">
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-2">
          <Link
            to="/schedule/full"
            className="rounded-md p-1 text-subtle hover:bg-secondary hover:text-foreground"
            aria-label="Back"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-sm font-semibold text-foreground">Packing Guide</h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-6 px-4 pt-6">
        <section>
          <h2 className="text-lg font-semibold text-foreground">
            Sabbatical 2026 — Day-by-Day Packing Plan
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">The Northern Crossing</p>
        </section>

        <section className="rounded-lg border border-border bg-card p-4">
          <h3 className="label-caps mb-3">Attire tier key</h3>
          <p className="mb-3 text-sm text-foreground/90">
            Three dress code levels appear across the trip — here's what each actually means, so
            "Evening Resort Elegant" doesn't sound dressier than it is.
          </p>
          <ul className="space-y-2 text-sm text-foreground/90">
            <li className="flex flex-col gap-1">
              <TierPill tier="resort">Evening Resort Elegant</TierPill>
              <span>
                The default, 5 of 8 nights. Dresses, skirts, slacks, collared shirts, blouses, or
                sport coats, plus a light scarf or wrap for the breeze. Think "nice hotel
                restaurant," not black tie.
              </span>
            </li>
            <li className="flex flex-col gap-1">
              <TierPill tier="smart">Elevated smart casual</TierPill>
              <span>
                July 10 only. A notch more relaxed than Evening Resort Elegant — "slightly elevated
                from everyday casual."
              </span>
            </li>
            <li className="flex flex-col gap-1">
              <TierPill tier="formal">Formal</TierPill>
              <span>July 15, Oslo only. Floor-length gowns or tuxedo-optional.</span>
            </li>
            <li className="flex flex-col gap-1">
              <TierPill tier="theme">70s Theme</TierPill>
              <span>
                July 14 After-Dinner Party. Bold prints, flared silhouettes, metallics, jumpsuits,
                disco details.
              </span>
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h3 className="label-caps px-1">Day by day</h3>
          {DAYS.map((d) => (
            <article
              key={d.date}
              className="rounded-lg border border-border bg-card p-4"
            >
              <header className="flex items-baseline justify-between gap-3">
                <div>
                  <h4 className="text-base font-semibold text-foreground">
                    {d.date} — {d.title}
                  </h4>
                  <p className="text-xs text-muted-foreground">{d.weather}</p>
                </div>
                <TierPill tier={d.tier}>{d.tierLabel}</TierPill>
              </header>
              <dl className="mt-3 space-y-2 text-sm text-foreground/90">
                <div>
                  <dt className="label-caps">Day</dt>
                  <dd>{d.day}</dd>
                </div>
                <div>
                  <dt className="label-caps">Evening</dt>
                  <dd>{d.evening}</dd>
                </div>
                <div>
                  <dt className="label-caps">Pack for today</dt>
                  <dd>{d.pack}</dd>
                </div>
              </dl>
            </article>
          ))}
        </section>

        <section className="rounded-lg border border-border bg-card p-4">
          <h3 className="label-caps mb-2">Repeat-outfit math</h3>
          <p className="text-sm text-foreground/90">
            Outfits that get real, distinct treatment and can't be improvised from daytime wear:
          </p>
          <ol className="mt-2 list-inside list-decimal space-y-1 text-sm text-foreground/90">
            <li>July 14 — 70s theme (festive/costume-adjacent)</li>
            <li>July 15 — Oslo formal (gown or tux-optional)</li>
          </ol>
          <p className="mt-2 text-sm text-foreground/90">
            Every other evening is Evening Resort Elegant, so 2–3 elegant outfits can rotate across
            the other 5 elegant nights without repeating back-to-back.
          </p>
        </section>

        <section className="rounded-lg border border-border bg-card p-4">
          <h3 className="label-caps mb-2">General essentials</h3>
          <ul className="list-inside list-disc space-y-1 text-sm text-foreground/90">
            <li>Comfortable walking shoes (cobblestones on multiple excursions)</li>
            <li>
              Light layers / rain jacket or compact umbrella — Northern Europe in July is rarely
              hot, and evenings run 52–60°F even when days are warm
            </li>
            <li>
              Type G adapter (UK, for the London overnight), Type C (most of Europe), Type K
              (Denmark, if extending in Copenhagen)
            </li>
            <li>Swimsuit, if joining pool deck or water-based excursions</li>
            <li>Passport, driver's license, prescription meds, seasickness remedies</li>
          </ul>
        </section>
      </main>
    </div>
  );
}
