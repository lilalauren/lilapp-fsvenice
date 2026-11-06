import { describe, it } from "node:test";
import { scheduleBeo } from "./venice-beos";
import assert from "node:assert/strict";

import type { ActivityRow, ScheduleRow, TripData } from "./airtable.server";
import { tripFromRecords } from "./airtable.server";
import { mergeWithCache } from "./offline";
import { peopleInGroup } from "./people";
import { resumePhoto } from "./resume-photos";
import {
  buildDayItems,
  isAssigned,
  isSetupRow,
  matchActivity,
  scheduleRowForActivity,
  sortActivities,
} from "./schedule";
import {
  formatDayLabel,
  formatDayLong,
  isEventPast,
  nowInVenice,
  parseTimeToMinutes,
} from "./time";
import { collectUpdates, isUpdated } from "./updates";
import { lookbookImages, scheduleImages } from "./venice-images";

const row = (over: Partial<ScheduleRow>): ScheduleRow => ({
  id: "r",
  eventName: "",
  date: "2026-11-07",
  day: "Saturday",
  callTime: "",
  decorAdvance: "",
  startTime: "",
  endTime: "",
  sortTime: "",
  sortHint: "",
  type: "",
  venue: "",
  boatTransfer: "",
  departureSpot: "",
  photographers: [],
  dressCode: "",
  vipFocus: "",
  notes: "",
  decorToShoot: "",
  photographyRequests: "",
  rush: false,
  lastModified: "",
  ...over,
});

const activity = (over: Partial<ActivityRow>): ActivityRow => ({
  id: "a",
  activity: "",
  runBy: "",
  start: "",
  end: "",
  gettingThere: "",
  meetingPoint: "",
  signedUp: null,
  lilaCovering: "",
  photographer: "",
  notes: "",
  ...over,
});

describe("Venice time", () => {
  it("reads Venice wall-clock time whatever the phone's zone", () => {
    // 09:15 UTC on Nov 6 is 10:15 in Venice (CET, UTC+1).
    assert.deepEqual(nowInVenice(new Date("2026-11-06T09:15:00Z")), {
      date: "2026-11-06",
      minutes: 10 * 60 + 15,
    });
  });

  it("parses Lauren's time text and ignores free text", () => {
    assert.equal(parseTimeToMinutes("7:00 PM"), 19 * 60);
    assert.equal(parseTimeToMinutes("~6:30 PM"), 18 * 60 + 30);
    assert.equal(parseTimeToMinutes("6:45 AM (team leaves the Danieli)"), 6 * 60 + 45);
    assert.equal(parseTimeToMinutes("14:00"), 14 * 60);
    assert.equal(parseTimeToMinutes("TBD"), null);
  });

  it("marks an event past only after its end, in Venice time", () => {
    const coffee = row({ date: "2026-11-06", startTime: "10:00 AM", endTime: "10:45 AM" });
    assert.equal(isEventPast(coffee, new Date("2026-11-06T09:30:00Z")), false); // 10:30 Venice
    assert.equal(isEventPast(coffee, new Date("2026-11-06T10:00:00Z")), true); // 11:00 Venice
  });

  it("formats the dropdown and the heading the Catalyst way", () => {
    assert.equal(formatDayLabel("2026-11-05"), "Thursday, Nov 5");
    assert.equal(formatDayLong("2026-11-05"), "THURSDAY, November 5");
  });
});

describe("Schedule rules", () => {
  it("treats Décor (with the accent) and setup rows as SETUP", () => {
    assert.equal(isSetupRow(row({ eventName: "After Party Décor" })), true);
    assert.equal(isSetupRow(row({ eventName: "Giving Back Corner (setup with gifts)" })), true);
    assert.equal(isSetupRow(row({ eventName: "Welcome Reception" })), false);
  });

  it("puts a Décor Advance line just ahead of its event", () => {
    const items = buildDayItems(
      [row({ id: "w", eventName: "Welcome Reception", sortTime: "19:00", decorAdvance: "TBD" })],
      [],
    );
    assert.deepEqual(
      items.map((i) => i.kind),
      ["decor", "event"],
    );
  });

  it("adds Décor lines only before main events, not activities or transfers", () => {
    const items = buildDayItems(
      [
        row({ id: "a", type: "Activity", sortTime: "09:30", decorAdvance: "9:00 AM" }),
        row({ id: "t", type: "Transfer", sortTime: "18:30", decorAdvance: "TBD" }),
        row({ id: "g", type: "Evening Event", sortTime: "20:00", decorAdvance: "6:00 PM" }),
      ],
      [],
    );
    assert.deepEqual(
      items.map((i) => i.key),
      ["a", "t", "decor-g", "g"],
    );
  });

  it("filters to one team member by exact name", () => {
    assert.equal(isAssigned(["Lauren", "Gonzalo"], "lauren"), true);
    assert.equal(isAssigned(["Joanna"], "Ann"), false);
    const rows = [
      row({ id: "1", photographers: ["Lauren", "Gonzalo", "Gabrielle"], sortTime: "19:00" }),
      row({ id: "2", photographers: ["Gonzalo"], sortTime: "12:30" }),
    ];
    assert.deepEqual(
      buildDayItems(rows, [], "Lauren").map((i) => i.key),
      ["1"],
    );
  });

  it("places the Activities card where the Activity rows start", () => {
    const rows = [
      row({ id: "dep", eventName: "Activity Departures", type: "Transfer", sortTime: "08:45" }),
      row({ id: "a1", eventName: "A Window Into Murano", type: "Activity", sortTime: "09:30" }),
    ];
    const items = buildDayItems(
      rows,
      [activity({ id: "m", activity: "A Window Into Murano" })],
      null,
      { activitiesCard: true },
    );
    assert.deepEqual(
      items.map((i) => i.kind),
      ["event", "activities", "event"],
    );
  });

  it("anchors the Activities card on the earliest Activity row, not the first in Airtable", () => {
    const rows = [
      row({
        id: "late",
        eventName: "The Key to Venice by Design",
        type: "Activity",
        sortTime: "09:31",
      }),
      row({
        id: "early",
        eventName: "Unlocking Venetian Flavours (Part 1)",
        type: "Activity",
        sortTime: "09:00",
      }),
    ];
    const items = buildDayItems(
      rows,
      [activity({ id: "x", activity: "Unlocking Venetian Flavours" })],
      null,
      { activitiesCard: true },
    );
    assert.equal(items[0]?.kind, "activities");
  });

  it("leaves the Activities group card out of the Schedule by default", () => {
    const rows = [
      row({ id: "a1", eventName: "A Window Into Murano", type: "Activity", sortTime: "09:30" }),
    ];
    const items = buildDayItems(rows, [activity({ id: "m", activity: "A Window Into Murano" })]);
    assert.deepEqual(
      items.map((i) => i.kind),
      ["event"],
    );
  });

  it("links Schedule rows to their Activities row by name", () => {
    const flavours = activity({ activity: "Unlocking Venetian Flavours" });
    assert.equal(
      matchActivity(row({ eventName: "Unlocking Venetian Flavours (Part 1)" }), [flavours]),
      flavours,
    );
    assert.equal(
      matchActivity(row({ eventName: "Brunch – Terrazza Danieli" }), [flavours]),
      undefined,
    );
  });

  it("lists LILA-covered activities first", () => {
    const sorted = sortActivities([
      activity({ activity: "Reel", lilaCovering: "No", start: "10:30 AM" }),
      activity({ activity: "Serenissima", lilaCovering: "Likely", start: "9:30 AM" }),
      activity({ activity: "Murano", lilaCovering: "Yes", start: "9:30 AM" }),
    ]);
    assert.deepEqual(
      sorted.map((a) => a.activity),
      ["Murano", "Serenissima", "Reel"],
    );
  });
});

describe("Airtable loading", () => {
  it("keeps going when one table fails", () => {
    const trip = tripFromRecords({
      SCHEDULE: [{ id: "s", createdTime: "", fields: { "Event Name": "Coffee Break" } }],
      LOOKBOOK: null,
    });
    assert.equal(trip.schedule.length, 1);
    assert.equal(trip.loaded.SCHEDULE, true);
    assert.equal(trip.loaded.LOOKBOOK, false);
    assert.deepEqual(trip.lookbook, []);
  });

  it("never overwrites good offline data with a failed table", () => {
    const cached = tripFromRecords({
      LOOKBOOK: [{ id: "l", createdTime: "", fields: { Event: "Welcome Reception" } }],
    });
    const fresh = tripFromRecords({ LOOKBOOK: null });
    const merged = mergeWithCache(fresh, cached as TripData);
    assert.equal(merged.lookbook[0]?.event, "Welcome Reception");
    assert.equal(merged.loaded.LOOKBOOK, true);
  });
});

describe("Resume and Updates", () => {
  it("groups Key People for the Resume dropdown", () => {
    const trip = tripFromRecords({
      KEY_PEOPLE: [
        { id: "1", createdTime: "", fields: { Name: "Carolyn Mar", Group: "Leadership" } },
        { id: "2", createdTime: "", fields: { Name: "Paola", Group: "DMC" } },
        { id: "3", createdTime: "", fields: { Name: "Sara (Fortuny)", Group: "Client Contact" } },
      ],
    });
    assert.deepEqual(
      peopleInGroup(trip.people, "DMC & Client Contact").map((p) => p.name),
      ["Paola", "Sara (Fortuny)"],
    );
  });

  it("flags rows modified after this phone last looked", () => {
    assert.equal(isUpdated("2026-11-06T10:00:00Z", undefined, "2026-11-06T09:00:00Z"), true);
    assert.equal(
      isUpdated("2026-11-06T10:00:00Z", "2026-11-06T10:00:00Z", "2026-11-01T00:00:00Z"),
      false,
    );
    const trip = tripFromRecords({
      SCHEDULE: [
        {
          id: "s",
          createdTime: "",
          fields: { "Event Name": "Welcome Reception", "Last modified": "2026-11-05T17:00:00Z" },
        },
      ],
    });
    assert.equal(collectUpdates(trip, {}, "2026-11-05T12:00:00Z").length, 1);
  });
});

describe("Resume headshots", () => {
  it("finds a supplied photo for everyone on the client's slides", () => {
    for (const name of [
      "Marc Speichert",
      "Adrian Messerli",
      "Anne Mansfield",
      "Claire Harvey",
      "Carolyn Mar",
      "Joerg Zimmermann",
      "Khaled Al-Idrissi",
      "Audrey Bozzi",
      "Fiona Williams",
      "Mahmoud Salah",
      "Meryem Marbouhy",
      "Nathalie Lazukina",
      "Victoria Matteucci",
      "Nabila Bristow",
      "Alexis Hughes",
      "Jasmine Lee",
      "Christian Zandonella",
      "Francesco Maria Corazzi",
      "Sara Zanettin",
      "Smeralda Midili",
      "Alessia Venturini",
      "Matteo Manetta",
      "Massimo Colella",
      "Adriano Rausa",
    ]) {
      assert.match(resumePhoto(name, ""), /^\/photos\/.+\.webp$/, name);
    }
    assert.equal(resumePhoto("Mark", "https://airtable/photo.jpg"), "https://airtable/photo.jpg");
  });
});

describe("Deck and Lookbook images", () => {
  it("matches images to events by name", () => {
    assert.ok(scheduleImages("Farewell Gala Dinner – Beyond the Doors").length > 5);
    assert.ok(scheduleImages("Lunch – A Venetian Rhythm (market style)").length > 0);
    assert.equal(scheduleImages("Cocktail Reception")[1]?.caption, "Floor plan · cocktail");
    assert.equal(scheduleImages("1:1 Appointments").length, 0);
    assert.equal(lookbookImages("Activities: Unlock Venice")[0]?.caption, "Lookbook");
  });
});

describe("BEOs", () => {
  it("matches each BEO to its events by name", () => {
    assert.equal(
      scheduleBeo("Hospitality Lounge & Gifting Experience, Giving Corner")?.number,
      "1",
    );
    assert.equal(scheduleBeo("Welcome Reception")?.number, "2");
    assert.match(
      scheduleBeo("Lunch – A Venetian Rhythm (market style)")?.src ?? "",
      /misericordia/,
    );
    assert.match(scheduleBeo("Brunch – Terrazza Danieli")?.src ?? "", /brunch/);
    assert.equal(scheduleBeo("Cocktail Reception")?.number, "5");
    assert.equal(scheduleBeo("Welcome Speeches"), undefined);
  });
});

describe("same-time events", () => {
  it("uses Sort Time - hidden to order events that start together", () => {
    const items = buildDayItems(
      [
        row({ id: "flavours", sortTime: "09:00", sortHint: "09:05" }),
        row({ id: "fortuny", sortTime: "09:00", sortHint: "08:55" }),
      ],
      [],
    );
    assert.deepEqual(
      items.map((i) => i.key),
      ["fortuny", "flavours"],
    );
  });
});

describe("activity call times", () => {
  it("finds the Schedule row (and its call time) for an activity", () => {
    const murano = activity({ id: "m", activity: "A Window Into Murano" });
    const rows = [row({ id: "s", eventName: "A Window Into Murano", callTime: "8:45 AM" })];
    assert.equal(scheduleRowForActivity(murano, rows)?.callTime, "8:45 AM");
    assert.equal(scheduleRowForActivity(activity({ activity: "Reel Venice" }), rows), undefined);
  });
});
