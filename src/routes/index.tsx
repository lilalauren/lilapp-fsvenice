import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { Printer } from "lucide-react";

import {
  ActivitiesGroupCard,
  ActivityCard,
  DecorCard,
  EventCard,
  ExpandAll,
} from "@/components/lilapp/cards";
import { NotesList, Quiet, SelectBox } from "@/components/lilapp/ui";
import {
  buildDayItems,
  isItemPast,
  itemDate,
  matchActivity,
  nowAndNext,
  scheduleDays,
  type DayItem,
} from "@/lib/schedule";
import {
  formatDayLabel,
  formatDayLong,
  formatDayPlain,
  nowInVenice,
  relativeUntil,
  TIME_LABEL,
} from "@/lib/time";
import { tripQueryOptions } from "@/lib/trip";
import { useDisplayName } from "@/lib/use-display-name";
import { amenitiesForDay } from "@/lib/briefing";
import { activityVips, teamNames } from "@/lib/people";
import type { ActivityRow, TripData } from "@/lib/airtable.server";

type ScheduleSearch = { day?: string; who?: string; view?: "mine" };

const pick = (search: Record<string, unknown>, key: string) =>
  typeof search[key] === "string" && search[key] ? (search[key] as string) : undefined;

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): ScheduleSearch => ({
    day: pick(search, "day"),
    who: pick(search, "who"),
    view: search.view === "mine" ? "mine" : undefined,
  }),
  head: () => ({ meta: [{ title: "Schedule — LILApp Venice" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(tripQueryOptions),
  component: SchedulePage,
});

function SchedulePage() {
  const { data } = useSuspenseQuery(tripQueryOptions);
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/" });
  const days = useMemo(() => scheduleDays(data.schedule), [data.schedule]);

  // During the trip, open on today in Venice; before or after, show all days.
  const [defaultDay] = useState(() => {
    const today = nowInVenice().date;
    return days.includes(today) ? today : "";
  });
  const day = search.day === "all" ? "" : (search.day ?? defaultDay);
  const who = search.who ?? "";
  const setSearch = (next: ScheduleSearch) =>
    navigate({ search: (prev) => ({ ...prev, ...next }), replace: true });

  return (
    <>
      <div className="mb-3 grid grid-cols-2 rounded-[13px] bg-secondary p-1 text-sm">
        {(["full", "mine"] as const).map((v) => {
          const active = (search.view ?? "full") === v;
          return (
            <button
              key={v}
              type="button"
              onClick={() => setSearch({ view: v === "mine" ? "mine" : undefined })}
              aria-pressed={active}
              className={
                active
                  ? "min-h-11 rounded-[10px] bg-sage font-semibold text-foreground"
                  : "min-h-11 rounded-[10px] font-medium text-muted-foreground"
              }
            >
              {v === "full" ? "Full Schedule" : "My Schedule"}
            </button>
          );
        })}
      </div>
      {search.view === "mine" ? (
        <MySchedule data={data} days={days} />
      ) : (
        <FullSchedule
          data={data}
          days={days}
          day={day}
          who={who}
          onDay={(d) => setSearch({ day: d || "all" })}
          onWho={(w) => setSearch({ who: w || undefined })}
        />
      )}
    </>
  );
}

function FullSchedule({
  data,
  days,
  day,
  who,
  onDay,
  onWho,
}: {
  data: TripData;
  days: string[];
  day: string;
  who: string;
  onDay: (d: string) => void;
  onWho: (w: string) => void;
}) {
  const items = useMemo(() => {
    const rows = day ? data.schedule.filter((r) => r.date === day) : data.schedule;
    return buildDayItems(rows, data.activities, who);
  }, [data, day, who]);

  const grouped = useMemo(() => {
    const map = new Map<string, DayItem[]>();
    for (const item of items) map.set(itemDate(item), [...(map.get(itemDate(item)) ?? []), item]);
    return Array.from(map.entries());
  }, [items]);

  // Centre on the first card that hasn't finished, once finished cards sit above it.
  const currentKey = useMemo(() => {
    const index = items.findIndex((i) => !isItemPast(i));
    return index > 0 ? items[index]!.key : null;
  }, [items]);
  const [expandAll, setExpandAll] = useState<boolean | undefined>(undefined);
  const currentRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!currentKey) return;
    const id = window.setTimeout(
      () => currentRef.current?.scrollIntoView({ block: "center", behavior: "smooth" }),
      120,
    );
    return () => window.clearTimeout(id);
  }, [currentKey]);

  return (
    <>
      <div className="flex gap-2">
        <SelectBox label="Team member" value={who} onChange={onWho}>
          <option value="">All team</option>
          {teamNames(data).map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </SelectBox>
        <SelectBox label="Day" value={day} onChange={onDay}>
          <option value="">All days</option>
          {days.map((d) => (
            <option key={d} value={d}>
              {formatDayLabel(d)}
            </option>
          ))}
        </SelectBox>
      </div>
      <div className="mt-1 flex items-center justify-between">
        <Link
          to="/print"
          search={{ day: day || undefined, who: who || undefined }}
          className="-ml-1 inline-flex min-h-11 items-center gap-1.5 px-1 text-sm font-semibold text-primary"
        >
          <Printer className="size-4" aria-hidden />
          Print briefing
        </Link>
        <ExpandAll allOpen={Boolean(expandAll)} onClick={() => setExpandAll(!expandAll)} />
      </div>
      <p className="text-sm text-muted-foreground">{TIME_LABEL}</p>

      {!data.loaded.SCHEDULE && data.schedule.length === 0 ? (
        <Quiet>Schedule not loaded yet.</Quiet>
      ) : grouped.length === 0 ? (
        <Quiet>Nothing scheduled for {who || "this filter"}.</Quiet>
      ) : (
        grouped.map(([d, dayItems]) => (
          <section key={d} className="mt-5">
            <h2 className="ui-page-title mb-3">{formatDayLong(d)}</h2>
            <div className="space-y-3">
              {dayItems.map((item) => (
                <ScheduleItem
                  key={item.key}
                  item={item}
                  activities={data.activities}
                  expandAll={expandAll}
                  cardRef={item.key === currentKey ? currentRef : undefined}
                />
              ))}
              <DayAmenities
                lines={amenitiesForDay(data.briefing, formatDayPlain(d).split(",")[0] ?? "")}
              />
            </div>
          </section>
        ))
      )}
    </>
  );
}

/** End of the day: that day's amenities from the Briefing "Amenities" row. */
function DayAmenities({ lines }: { lines: string[] }) {
  if (lines.length === 0) return null;
  return (
    <section className="rounded-[13px] border border-border px-4 py-3">
      <h3 className="label-caps mb-1">Amenities</h3>
      <NotesList notes={lines.join("\n")} />
    </section>
  );
}

/** The Activities card only belongs on the day that has Activity rows. */
function rowsHaveActivityDay(data: TripData, day: string) {
  return data.schedule.some((r) => r.date === day && r.type.toLowerCase() === "activity");
}

function ScheduleItem({
  item,
  activities,
  expandAll,
  cardRef,
}: {
  item: DayItem;
  activities: ActivityRow[];
  expandAll?: boolean;
  cardRef?: React.Ref<HTMLElement>;
}) {
  const past = isItemPast(item);
  if (item.kind === "decor") return <DecorCard row={item.row} past={past} cardRef={cardRef} />;
  if (item.kind === "activities")
    return <ActivitiesGroupCard activities={item.activities} past={past} cardRef={cardRef} />;
  return (
    <EventCard
      row={item.row}
      setup={item.setup}
      past={past}
      activity={matchActivity(item.row, activities)}
      expandAll={expandAll}
      cardRef={cardRef}
    />
  );
}

function MySchedule({ data, days }: { data: TripData; days: string[] }) {
  const [name, , hydrated] = useDisplayName();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(t);
  }, []);

  if (!hydrated) return null;
  if (!name) {
    return (
      <div className="py-8 text-center">
        <p className="ui-body text-muted-foreground">
          Pick your name so LILApp knows whose schedule to show.
        </p>
        <Link
          to="/pick-name"
          className="mt-4 inline-flex min-h-11 items-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground"
        >
          Pick your name
        </Link>
      </div>
    );
  }

  const today = nowInVenice(now).date;
  const day = days.includes(today)
    ? today
    : (days.find((d) => d > today) ?? days[days.length - 1] ?? today);
  const mine = data.schedule.filter((r) =>
    r.photographers.some((p) => p.toLowerCase() === name.toLowerCase()),
  );
  const { happening, upNext } = nowAndNext(mine, day, now);
  const myActivities = data.activities.filter(
    (a) => a.photographer.toLowerCase() === name.toLowerCase(),
  );
  const ambient = upNext
    ? relativeUntil(upNext.date, upNext.callTime || upNext.startTime, now)
    : "";

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="ui-page-title">{formatDayLong(day)}</h2>
        <Link to="/pick-name" className="ui-label shrink-0 text-[11px]">
          {name} · change
        </Link>
      </div>
      {ambient && !happening ? (
        <p className="ui-body mt-1 text-muted-foreground">
          Next call time <span className="font-semibold text-foreground">{ambient}</span>
        </p>
      ) : null}
      {happening ? (
        <section className="mt-4">
          <h3 className="ui-label mb-2">Happening Now</h3>
          <EventCard
            row={happening}
            setup={false}
            past={false}
            activity={matchActivity(happening, data.activities)}
          />
        </section>
      ) : null}
      {upNext ? (
        <section className="mt-4">
          <h3 className="ui-label mb-2">Up Next</h3>
          <EventCard
            row={upNext}
            setup={false}
            past={false}
            activity={matchActivity(upNext, data.activities)}
          />
        </section>
      ) : null}
      {myActivities.length > 0 && day === days.find((d) => rowsHaveActivityDay(data, d)) ? (
        <section className="mt-4">
          <h3 className="ui-label mb-2">Your Activities</h3>
          <div className="space-y-3">
            {myActivities.map((a) => (
              <ActivityCard key={a.id} activity={a} vips={activityVips(data.people, a.activity)} />
            ))}
          </div>
        </section>
      ) : null}
      {!happening && !upNext ? <Quiet>Nothing scheduled for you on this day.</Quiet> : null}
      <Link
        to="/"
        search={{ day, who: name }}
        className="mt-6 flex min-h-11 w-full items-center justify-center rounded-md border border-border text-sm font-medium text-foreground hover:bg-secondary"
      >
        See My Full Day
      </Link>
    </div>
  );
}
