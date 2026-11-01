# LILApp | Sabbatical 2026 

LILApp — Design Spec for Lovable

Event Operations Platform - Created by LILA PHOTO

This document captures every product and design decision made so far, to brief Lovable's build. It is not exhaustive of every possible feature — it's the considered foundation for the photographer-facing schedule experience.

1. Product Principles (non-negotiable)

Airtable is the single source of truth. LILApp is a presentation layer — never duplicate data, never require duplicate entry, never expose hidden Airtable fields (e.g. "Client Notes (Internal Only)" must never render).

Live sync required. The app must read from Airtable's API directly (not a static export) and refresh live, so it's a continuously updating document for the team — this is the single most important technical requirement.

Manual sort order must be respected. LILA manually orders rows in Airtable; the app must preserve that order, never re-sort by date/time/any other field on its own logic.

Progressive disclosure. Only show populated fields. Never display "N/A," empty sections, or placeholder text.

Inline expansion. Assignments expand in place. Never navigate to a separate screen to read details — users should never lose their place.

Mobile-first, always. The team views this exclusively on phones, often on their feet, mid-event. Design for that first.

"Always advance." Every screen should answer: where am I now, where am I next, what do I need — location, equipment, attire — for both.

Reduce thinking. Never rely on subtle visual cues alone (e.g. color) to convey meaning that matters operationally (like Call Time) — label plainly. A tired brain should never have to decode anything.

2. Data Model (Airtable)

Full Agenda / ROS — primary source of truth for daily schedule

Fields: Event Name, Assigned Photographer (supports multiple), Day, Date, Call Time, Start Time, End Time, Location, Where to Go, Coverage Requirements, Event Timeline, Attire, Attire Details, Equipment Needs, Client Notes (Internal Only — never displayed).

Attire vs Attire Details: Attire is the short category (e.g. "Evening Resort Elegant"); Attire Details is the specific guidance. Display both, stacked, when populated.

Equipment Needs: only populated when it deviates from standard kit (e.g. macro lens for a product shot, second flash for couples portraits). Never force a note for standard situations. Phase 2: a standard-gear-profile system keyed to event type (e.g. "Couples Portrait" → auto-implies standard prep) is a deliberate future feature, not MVP.

Event Timeline: a distinct field from Coverage Requirements/Photography Notes — a minute-by-minute, time-stamped breakdown (e.g. "8–8:30pm — Dance show"). Format as a bulleted list, time leading each line in a fixed-width column so descriptions align regardless of time-string length. Long descriptions wrap and stay left-aligned under themselves, never sliding back under the time column.

Excursion Assignments — supplemental, not authoritative

Matched to ROS by Photographer + Date. Never overrides or merges as competing data — appended as an additional labeled section within the same day's card, blended seamlessly (no visual "this came from a different table" distinction needed).

Travel Tab — fully separate

Flight/hotel/cabin logistics for the team. Not part of daily event cards. No dedicated top-level nav tab needed — accessible somewhere sensible, not competing with the live schedule.

Team table

Use Display Name only, never raw Airtable identifiers.

Phase 2 (not in this build): Production Queue for editors

A fundamentally different data model/UI (Kanban-style, not calendar-style) for editors (e.g. Tanya) and any photographers doing their own first-pass culling. Recommended stages: Not started → First cull → Second cull → Ready to tone → Toning → Ready for review → Approved → Uploaded → Delivered, plus an Owner field (Photographer/Editor) since responsibility shifts mid-pipeline. Recommendation: editors update status directly in Airtable (they're at a desk, not mobile); LILApp displays this as a read-only live production queue, filterable by day/photographer/editor/status. Notifications (push, in-app, reminders) are a separate, significantly larger technical phase — not part of this build.

3. Visual Design System

Palette (light mode only)

Token Hex Use Paper (background) #ffffff Ink (primary text) #1f241f Muted text #6b766b secondary info (location, event time) Subtle text #8b968b field labels, tertiary info Rules/dividers #e5ebe5 Accent (deep dark sage) #3a4a3a Call Time, active-state border, primary buttons Accent soft highlight #eef2ee active card background tint

Typography & alignment rules

Call Time and Event Time are the same font size, distinguished by weight only (Call = bold/500, Event = regular/400) — not by size. Using size creates baseline misalignment with adjacent content.

Both times use lowercase am/pm (softer than uppercase).

Time values sit in a fixed-width column (not auto-sized to content) so multi-line labels ("Call"/"Event") and the event name column align identically across every row regardless of how long the time string is (e.g. "2:00–2:45 pm" vs "3–4 pm"). This was a recurring bug — always verify column width accommodates the longest expected string before shipping.

Field labels in the detail sheet (Where to Go, Coverage Requirements, etc.) are uppercase with letter-spacing, regardless of casing in Airtable.

Event title and location are set close together (near-zero gap) to read as one grouped unit.

One accent color, used sparingly and consistently — not six.

"Now" indication

A sage border + soft background tint marks whatever is currently active. This device only means something when it's contrasting against non-active items — in views where many things could be simultaneously "current" (Full Schedule), don't apply it; let the section header ("Happening Now") do that job instead.

Never put a countdown inside the "Happening Now" card — it undermines being present at the current event. Countdown text ("Next call time in 12m") lives ambiently outside/above the highlighted card.

Past events (call time already elapsed) grey out at ~40% opacity. No manual checkbox — this is automatic based on current time vs. Call Time.

4. Screens

My Schedule — Now/Next (default landing view)

Header: date + day-picker chevron, avatar/initial, "My Schedule" / "Full Schedule" toggle.

Ambient "Next call time in Xm" sits below the header, outside any card.

"Happening Now" — one bordered/tinted card, full Call/Event time treatment, named pills (co-photographers on the same assignment), chevron to expand into detail sheet.

"Up Next" — same structure, unhighlighted.

A single "See full day" button leads into the full scrollable list. (No "Rest of Today" section — cut for real-estate and alignment reasons; the button covers this need.)

My Schedule — Full Day (complete chronological list)

Every card structurally identical (this matters — a "Happening Now" label inside one card broke alignment across the list; the border/tint alone signals active state).

Day picker: a dropdown/sheet listing every day with port name, an anchor icon for at-sea days, a pin icon for port days, and past days dimmed with a checkmark. (Chosen over a horizontal date-strip — port context was the deciding factor.)

Rows tappable (chevron-right) into the detail sheet.

Full Schedule (team-wide)

Same list structure as My Schedule Full Day, chronological, but every event shows named pills for whoever's assigned — plain names, not initials-only avatars (initials force the reader to decode who's who; full names remove that step entirely).

No "Happening Now" highlight here — with multiple concurrent events across different people, a shared border stops meaning anything distinct.

Scroll affordance: a static (non-animated — motion was distracting) pill reading "Scroll for more" with a chevron, positioned in its own dedicated space below the visible rows, not floating/overlapping content.

Detail Sheet (expanded card)

Slides up as a bottom sheet, dimming the schedule behind it (not a full navigation/route change — same screen, same place).

Fixed header (event name, location, Call/Event time) + independently scrollable body.

Body sections, shown only if populated: Where to Go, Coverage Requirements, Attire + Attire Details, Equipment, Event Timeline.

Event Timeline: shows first 5 items, then a soft fade + explicit "X more items · scroll or tap to expand full timeline" — content is never fully hidden (always reachable by scrolling within the mini-list), the label is just insurance against missing it.

Print / PDF

8.5x11, works in black-and-white (color is accent-only, never load-bearing).

Two options: lean table (Call, Event Time, Event/Location, Attire) or full detail (adds Coverage Requirements, Photography Notes, Attire Details, Equipment per event, in an editorial block layout with a light serif accent on headers).

My Schedule print = one photographer. Full Schedule print = adds a Photographer column (comma-separated names for multi-person events).

Available by single day or full multi-day schedule.

Packing Guide (separate from live schedule)

General/reference content only (weather by port, packing essentials, theme-night overview) — not tied to any specific moment in time.

Small header icon, not a persistent bottom-nav tab (it's used once pre-trip, not during live events — doesn't deserve permanent screen real estate).

Per-event Attire/Attire Details (in ROS) is separate from this and always shown in context on the relevant day's card.

5. Naming

My Schedule / Full Schedule — exact terminology, matches the product doc. Not "Mine"/"All."

Product name is LILApp exactly — no sub-brand names like "Command Center."

Team members shown by Display Name only.

6. Known Open Questions (flag to Lovable, don't guess)

Whether Event Timeline is populated from a client-provided minute-by-minute breakdown that will need import/parsing once received.

Exact behavior for events with more than ~5 people assigned in the pill layout at very long lists — confirm wrapping holds up.

Whether Full Schedule needs a per-teammate filter (e.g. "just show me Chalo's day") in addition to the full interleaved list.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://photo-flow-live.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/c8b3d95d-88d3-4c12-a75b-62201c84c969).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
