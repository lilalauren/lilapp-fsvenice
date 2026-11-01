# LILApp | Four Seasons PPI EMEA Venice 2026

Read-only, phone-first crew app for the LILA PHOTO team (Lauren, Gonzalo, Gabrielle) at
Preferred Partner Insider EMEA 2026, Danieli, Venezia, A Four Seasons Hotel — November 5–8, 2026.

Built from the Sabbatical build (`lilalauren/photo-flow-live`), with pieces from Catalyst
(Schedule layout), Four Seasons Madrid (SETUP cards, print briefing, offline), M Financial
(coverage details) and Breakers Ops / Panattoni (Resume, Updates bell, pinch-zoom).

## Screens

- **Schedule** — Full Schedule / My Schedule. Team member and day dropdowns. Opens on the
  current card; finished cards fold to time + title. Décor Advance shows as a muted SETUP line
  ahead of its event; Boat Transfer and Departure Spot show when filled in. Tap **More** for
  Dress Code, VIP Focus, Photography Requests, Décor to Shoot, Notes and the deck's décor
  renders and floor plans (tap to zoom). **Print briefing** prints one day, optionally for one
  team member.
- **Activities** — every row in the Activities table, LILA covering first.
- **Resume** — Key People by group (Leadership · Danieli Hotel Staff · DMC & Client Contact).
- **Lookbook** — Lookbook rows by day with the day's Attire, the Lookbook pages, mood boards and
  flower palettes.
- **Briefing** — Briefing table, Team travel, Open Questions.
- **Program at a Glance** (calendar icon) and the **Updates** bell (what changed in Schedule
  and Key People since you last looked, from "Last modified").

All times are Venice time (Europe/Rome) and displayed exactly as typed in Airtable.

## Data

Airtable base `FS_Venice_PPI_EMEA_2026` (`appYbc2zQI75G8KUu`) is the single source of truth.
Each table loads on its own, so one missing table never breaks the app, and the last good copy
is kept on the phone for offline use. Table IDs are in `src/lib/airtable.server.ts`; field names
are Lauren's own.

Deck and Lookbook images live in `public/venice/` and are matched to events by name in
`src/lib/venice-images.ts`. Supplied Key People portraits go in `public/photos/` and are listed
in `src/lib/resume-photos.ts`.

## Environment

| Variable           | Value                                     |
| ------------------ | ----------------------------------------- |
| `AIRTABLE_PAT`     | The shared "LILApp" personal access token |
| `AIRTABLE_BASE_ID` | Optional; defaults to `appYbc2zQI75G8KUu` |

## Develop

```bash
bun install
bun run dev
bun run test
bun run build
```

Deploys on Netlify from GitHub (`netlify.toml`).
