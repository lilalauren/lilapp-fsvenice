import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { ArrowLeft, Printer } from "lucide-react";

import { NotesList } from "@/components/lilapp/ui";
import type { ActivityRow } from "@/lib/airtable.server";
import { buildDayItems, itemDate, type DayItem } from "@/lib/schedule";
import { formatDayLong, formatTimeRange, parseTimeToMinutes, TIME_LABEL } from "@/lib/time";
import { tripQueryOptions } from "@/lib/trip";

type PrintSearch = { day?: string; who?: string };

const pick = (search: Record<string, unknown>, key: string) =>
  typeof search[key] === "string" && search[key] ? (search[key] as string) : undefined;

export const Route = createFileRoute("/print")({
  validateSearch: (search: Record<string, unknown>): PrintSearch => ({
    day: pick(search, "day"),
    who: pick(search, "who"),
  }),
  head: () => ({
    meta: [{ title: "Print briefing — LILApp Venice" }, { name: "robots", content: "noindex" }],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(tripQueryOptions),
  component: PrintPage,
});

function edge(items: DayItem[], pickFirst: boolean): string {
  let best = "";
  let bestMin = pickFirst ? Infinity : -Infinity;
  for (const item of items) {
    if (item.kind !== "event") continue;
    const value = pickFirst
      ? item.row.callTime || item.row.startTime
      : item.row.endTime || item.row.startTime;
    const min = parseTimeToMinutes(value);
    if (min != null && (pickFirst ? min < bestMin : min > bestMin)) {
      bestMin = min;
      best = value;
    }
  }
  return best;
}

function Summary({ items }: { items: DayItem[] }) {
  const events = items.filter((i) => i.kind === "event");
  const crew = Array.from(
    new Set(events.flatMap((i) => (i.kind === "event" ? i.row.photographers : []))),
  );
  const dress = Array.from(
    new Set(events.map((i) => (i.kind === "event" ? i.row.dressCode : "")).filter(Boolean)),
  );
  const stat = (label: string, value: string) => (
    <div>
      <dt className="label-caps">{label}</dt>
      <dd className="font-semibold text-foreground">{value || "—"}</dd>
    </div>
  );
  return (
    <>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
        {stat("First call", edge(items, true))}
        {stat("Wrap", edge(items, false))}
        {stat("Events", String(events.length))}
        {stat("Crew", crew.join(" · "))}
      </dl>
      {dress.length ? (
        <p className="mt-2 text-sm">
          <span className="label-caps mr-1.5">Dress</span>
          <span className="font-medium text-foreground">{dress.join(" · ")}</span>
        </p>
      ) : null}
    </>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <p className="text-xs text-foreground">
      <span className="label-caps mr-1">{label}</span>
      {value}
    </p>
  );
}

function ActivitiesLine({ activities }: { activities: ActivityRow[] }) {
  return (
    <ul className="mt-1 space-y-1">
      {activities.map((a) => (
        <li key={a.id} className="text-xs text-foreground">
          <span className="font-semibold">{a.activity}</span> · {formatTimeRange(a.start, a.end)}
          {a.photographer ? ` · ${a.photographer}` : ""}
          {a.lilaCovering ? ` · LILA covering: ${a.lilaCovering}` : ""}
        </li>
      ))}
    </ul>
  );
}

function PrintItem({ item }: { item: DayItem }) {
  if (item.kind === "activities") {
    return (
      <li className="briefing-event py-3">
        <p className="text-sm font-semibold text-foreground">Activities</p>
        <ActivitiesLine activities={item.activities} />
      </li>
    );
  }
  const r = item.row;
  if (item.kind === "decor") {
    return (
      <li className="briefing-event py-2">
        <p className="text-sm text-foreground">
          <span className="label-caps mr-2">Setup</span>
          <span className="font-semibold">{r.eventName}</span> · Décor Advance {r.decorAdvance}
        </p>
      </li>
    );
  }
  return (
    <li className="briefing-event py-3">
      <div className="flex items-baseline gap-4">
        <div className="w-28 shrink-0 text-sm leading-snug">
          {r.callTime ? (
            <p>
              <span className="label-caps mr-1">Call</span>
              <span className="font-semibold">{r.callTime}</span>
            </p>
          ) : null}
          <p className="font-semibold">{formatTimeRange(r.startTime, r.endTime)}</p>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">
            {item.setup ? <span className="label-caps mr-2">Setup</span> : null}
            {r.eventName}
          </p>
          {r.venue ? <p className="text-sm text-foreground">{r.venue}</p> : null}
          {r.photographers.length ? (
            <p className="text-xs font-semibold text-foreground">{r.photographers.join(" · ")}</p>
          ) : null}
          <Line label="Boat Transfer" value={r.boatTransfer} />
          <Line label="Departure Spot" value={r.departureSpot} />
          <Line label="Dress Code" value={r.dressCode} />
          <Line label="VIP Focus" value={r.vipFocus} />
          {r.photographyRequests ? (
            <NotesList notes={r.photographyRequests} className="mt-1 text-sm" />
          ) : null}
          {r.notes ? <NotesList notes={r.notes} className="mt-1 text-sm" /> : null}
        </div>
      </div>
    </li>
  );
}

function PrintPage() {
  const { data } = useSuspenseQuery(tripQueryOptions);
  const { day, who } = Route.useSearch();
  const grouped = useMemo(() => {
    const rows = day ? data.schedule.filter((r) => r.date === day) : data.schedule;
    const map = new Map<string, DayItem[]>();
    for (const item of buildDayItems(rows, data.activities, who)) {
      map.set(itemDate(item), [...(map.get(itemDate(item)) ?? []), item]);
    }
    return Array.from(map.entries());
  }, [data, day, who]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 print:max-w-none print:px-0 print:py-0">
      <div className="no-print mb-5 flex items-center justify-between gap-3">
        <Link
          to="/"
          search={{ day, who }}
          className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-primary"
        >
          <ArrowLeft className="size-4" /> Back to schedule
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          <Printer className="size-4" /> Print
        </button>
      </div>
      {who ? <p className="mb-2 text-sm text-muted-foreground">Team member: {who}</p> : null}

      {grouped.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Nothing scheduled for this selection.
        </p>
      ) : (
        <div className="space-y-10">
          {grouped.map(([d, items]) => (
            <section key={d} className="briefing-day">
              <header className="border-b-2 border-foreground/80 pb-3 print:border-black">
                <p className="label-caps">LILA PHOTO · Briefing</p>
                <h1 className="ui-page-title mt-1">{formatDayLong(d)}</h1>
                <p className="mt-1 text-xs text-muted-foreground">
                  Four Seasons PPI EMEA · Danieli, Venezia — {TIME_LABEL}
                </p>
              </header>
              <Summary items={items} />
              <ol className="mt-4 divide-y divide-border border-y border-border print:divide-black/30 print:border-black/60">
                {items.map((item) => (
                  <PrintItem key={item.key} item={item} />
                ))}
              </ol>
            </section>
          ))}
        </div>
      )}
      <p className="mt-8 text-center text-[0.65rem] tracking-[0.18em] text-muted-foreground uppercase">
        LILA PHOTO · Read-only schedule · {TIME_LABEL}
      </p>
    </div>
  );
}
