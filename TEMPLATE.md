# Four Seasons LILApp template

This repo (branch **Venice**, tag **four-seasons-template-v1**) is the starting point for future
Four Seasons LILApp jobs. Always start a new job from the tag, not from whatever Venice looks like
later:

```bash
git clone --branch four-seasons-template-v1 https://github.com/lilalauren/lilapp-fsvenice NEW-FOLDER
```

Then copy it into the new job's own empty repo. Never edit this repo for a new job.

## What's in the template

- **Schedule:** team and day dropdowns, Call / Event times, photographer names in bold caps,
  first Coverage Assignments shown on the card, details in a bottom sheet (Briefing, then
  Coverage Assignments with tick boxes), Décor / Layout / BEO buttons, Décor shoot lines before
  main events, an Amenities card at the end of each day, past events fold to one line.
- **My Schedule:** opens on your day once you've picked your name; Happening Now opens itself.
- **Tabs:** Resume, Schedule, Activities, Lookbook, Briefing; header buttons for At a Glance,
  the client's Cvent app, the updates bell and Pending Questions.
- **Behind the scenes:** Airtable is the single source of truth, each table loads on its own,
  offline copy on the phone, refresh every minute, local event time.

## Step 1: Airtable

1. In Airtable, **duplicate the Venice base** (FS_Venice_PPI_EMEA_2026) with its structure only,
   then fill in the new job's rows. This keeps every column the app expects, including Call Time,
   Briefing, Coverage Requirements, Décor Advance, Show On, Planner Notes and Last modified.
2. Planner-only details (menus, guest counts, hotel logistics) go in **Planner Notes**, which the
   app never shows.
3. Add the new base to the existing **LILApp** Airtable token. Don't create a new token.

## Step 2: settings to change in the code

| What                                                                 | File                                                                                                        |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Airtable base ID and table IDs                                       | `src/lib/airtable.server.ts` (`DEFAULT_BASE_ID`, `TABLES`)                                                  |
| Time zone and the time note ("All times shown in Venice time (CET)") | `src/lib/time.ts` (`VENICE_TZ`, `TIME_LABEL`)                                                               |
| App name, link preview title and image address                       | `src/routes/__root.tsx`, `public/manifest.webmanifest`                                                      |
| Header line ("LILApp · Venice")                                      | `src/components/lilapp/AppShell.tsx`                                                                        |
| Name-picker subtitle                                                 | `src/routes/pick-name.tsx`                                                                                  |
| Phone storage names (so jobs never mix on one phone)                 | `src/lib/offline.ts`, `updates.ts`, `shots.ts`, `use-display-name.ts`, and the cache name in `public/sw.js` |
| Décor renders and floor plans                                        | `public/venice/` and `src/lib/venice-images.ts`                                                             |
| BEOs                                                                 | `public/beo/` and `src/lib/venice-beos.ts`                                                                  |
| Resume headshots                                                     | `public/photos/` and `src/lib/resume-photos.ts`                                                             |

Remove any tab the new job doesn't need rather than leaving it empty.

## Step 3: Netlify

Connect the new repo, then set these environment variables:

| Variable           | Value                                |
| ------------------ | ------------------------------------ |
| `AIRTABLE_PAT`     | The existing "LILApp" Airtable token |
| `AIRTABLE_BASE_ID` | Optional; the new base's ID          |

The token is read on the server only. Never put it in the code.

## Check before sending it to the team

```bash
bun install
bun run test
bun run build
```

Then open it on a phone: Schedule, a card's details, My Schedule, and every tab.
