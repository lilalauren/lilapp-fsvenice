import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { getAgenda, getExcursionAssignments, getRoomDrops, getTeam } from "@/lib/airtable.functions";
import { useDisplayName } from "@/lib/use-display-name";
import { PageHeader } from "@/components/lilapp/PageHeader";
import { ScheduleCard } from "@/components/lilapp/ScheduleCard";
import { DetailSheet } from "@/components/lilapp/DetailSheet";
import { DayPicker } from "@/components/lilapp/DayPicker";
import { ExcursionGroupCard } from "@/components/lilapp/ExcursionGroupCard";
import { RoomDropCard } from "@/components/lilapp/RoomDropCard";
import { RoomDropSheet } from "@/components/lilapp/RoomDropSheet";
import {
  agendaWithTeamOrder,
  buildDayList,
  excursionsForPhotographerOnDay,
  excursionsOnDay,
  filterForPhotographer,
  isPortExcursionRow,
  nowAndNext,
  roomDropsOnDay,
} from "@/lib/schedule";
import { isEventPast, relativeUntil, todayISO } from "@/lib/time";
import type { AgendaRow, ExcursionAssignRow, RoomDropRow } from "@/lib/airtable.server";

const agendaQuery = queryOptions({
  queryKey: ["agenda"],
  queryFn: () => getAgenda(),
  refetchInterval: 60_000,
  refetchOnWindowFocus: true,
  refetchOnMount: "always",
  staleTime: 0,
});

const excursionsQuery = queryOptions({
  queryKey: ["excursions"],
  queryFn: () => getExcursionAssignments(),
  refetchInterval: 60_000,
  refetchOnWindowFocus: true,
  refetchOnMount: "always",
  staleTime: 0,
});

const teamQuery = queryOptions({
  queryKey: ["team"],
  queryFn: () => getTeam(),
  refetchInterval: 60_000,
  refetchOnWindowFocus: true,
  refetchOnMount: "always",
  staleTime: 0,
});
const roomDropsQuery = queryOptions({
  queryKey: ["roomDrops"],
  queryFn: () => getRoomDrops(),
  refetchInterval: 60_000,
  refetchOnWindowFocus: true,
  refetchOnMount: "always",
  staleTime: 0,
});

const searchSchema = z.object({
  day: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/schedule/mine")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({ meta: [{ title: "My Schedule — LILApp" }] }),
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.fetchQuery(agendaQuery),
      context.queryClient.fetchQuery(excursionsQuery),
      context.queryClient.fetchQuery(teamQuery),
      context.queryClient.fetchQuery(roomDropsQuery),
    ]);
  },
  component: MyScheduleNowNext,
  errorComponent: DefaultError,
});

function DefaultError({ error: rawError, reset }: { error: unknown; reset: () => void }) {
  const error = rawError instanceof Error ? rawError : new Error(String(rawError));
  return (
    <div className="mx-auto max-w-md p-8">
      <h1 className="text-lg font-semibold">Couldn't load your schedule</h1>
      <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
      <button onClick={reset} className="mt-4 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">
        Try again
      </button>
    </div>
  );
}

function MyScheduleNowNext() {
  const { day } = Route.useSearch();
  const nav = useNavigate({ from: "/schedule/mine" });
  const [name, , hydrated] = useDisplayName();
  useEffect(() => {
    if (hydrated && !name) nav({ to: "/pick-name" });
  }, [hydrated, name, nav]);

  const { data: rawAgenda } = useSuspenseQuery(agendaQuery);
  const { data: excursions } = useSuspenseQuery(excursionsQuery);
  const { data: team } = useSuspenseQuery(teamQuery);
  const { data: roomDrops } = useSuspenseQuery(roomDropsQuery);
  const agenda = useMemo(() => agendaWithTeamOrder(rawAgenda, team), [rawAgenda, team]);
  const [openRow, setOpenRow] = useState<AgendaRow | null>(null);
  const [openActivity, setOpenActivity] = useState<ExcursionAssignRow | null>(null);
  const [openRoomDrop, setOpenRoomDrop] = useState<RoomDropRow | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const [nowTick, setNowTick] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNowTick(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const days = useMemo(() => buildDayList(agenda, excursions), [agenda, excursions]);
  const today = todayISO(nowTick);
  const todayIsInTrip = days.some((d) => d.date === today);
  const selectedDay = day || (todayIsInTrip ? today : days[0]?.date ?? today);
  const mine = useMemo(
    () => (name ? filterForPhotographer(agenda, name) : []),
    [agenda, name],
  );
  const { happening, upNext } = useMemo(
    () => nowAndNext(mine, selectedDay, nowTick),
    [mine, selectedDay, nowTick],
  );

  // Auto-open the "Happening Now" detail sheet when an event is currently
  // in progress. Auto-close it once the event has passed. Respect a manual
  // dismissal so we don't fight the user if they close it while still live.
  const dismissedIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (
      happening &&
      dismissedIdRef.current !== happening.id &&
      !openRow &&
      !openActivity &&
      !openRoomDrop
    ) {
      setOpenRow(happening);
    }
    if (openRow && isEventPast(openRow, nowTick)) {
      setOpenRow(null);
      dismissedIdRef.current = null;
    }
  }, [happening, nowTick, openRow, openActivity, openRoomDrop]);
  const myDayRows = useMemo(
    () => mine.filter((r) => r.date === selectedDay),
    [mine, selectedDay],
  );
  const shownIds = new Set<string>();
  if (happening) shownIds.add(happening.id);
  if (upNext) shownIds.add(upNext.id);
  const hasMore = myDayRows.some((r) => !shownIds.has(r.id));


  const ambient = upNext
    ? relativeUntil(upNext.date, upNext.callTime ?? upNext.startTime, nowTick)
    : "";

  const excursionsForOpen = useMemo(() => {
    if (!openRow) return [];
    if (isPortExcursionRow(openRow)) return excursionsOnDay(excursions, openRow.date);
    return [];
  }, [openRow, excursions]);

  const myExcursions = useMemo(
    () => (name ? excursionsForPhotographerOnDay(excursions, name, selectedDay) : []),
    [excursions, name, selectedDay],
  );
  const portName = useMemo(
    () => days.find((d) => d.date === selectedDay)?.portName,
    [days, selectedDay],
  );

  const syntheticRow: AgendaRow | null = openActivity
    ? {
        id: `activity-${openActivity.id}`,
        eventName: openActivity.excursion ?? "Excursion",
        assignedPhotographers: openActivity.photographers,
        callTime: openActivity.callTime,
        startTime: openActivity.busDepartureTime,
        endTime: openActivity.arrivalBackAtPort,
      }
    : null;
  const activeRow = openActivity ? syntheticRow : openRow;
  const activeExcursions = openActivity ? [openActivity] : excursionsForOpen;

  if (!hydrated || !name) {
    return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-background pb-16">
      <PageHeader
        displayName={name}
        dateISO={selectedDay}
        portLabel={(() => {
          const d = days.find((x) => x.date === selectedDay);
          return d?.atSea ? "At sea" : d?.portName;
        })()}
        activeTab="mine"
        currentDay={selectedDay}
        onOpenDayPicker={() => setPickerOpen(true)}
      />

      <main className="mx-auto max-w-2xl px-4 pt-6">
        {ambient && upNext && !happening && (
          <p className="mb-3 px-1 text-xs text-muted-foreground">
            Next call time <span className="font-medium text-foreground">{ambient}</span>
          </p>
        )}

        {(() => {
          const drops = roomDropsOnDay(roomDrops, selectedDay);
          if (drops.length === 0) return null;
          return (
            <section className="mb-6">
              <h2 className="label-caps mb-2 px-1">Room drops — anytime today</h2>
              <ul className="space-y-2">
                {drops.map((rd) => (
                  <li key={rd.id}>
                    <RoomDropCard row={rd} onOpen={() => setOpenRoomDrop(rd)} />
                  </li>
                ))}
              </ul>
            </section>
          );
        })()}

        {happening && (
          <section className="mb-6">
            <h2 className="label-caps mb-2 px-1">Happening Now</h2>
            <ScheduleCard row={happening} active onOpen={() => setOpenRow(happening)} />
          </section>
        )}

        {upNext && (
          <section className="mb-6">
            <h2 className="label-caps mb-2 px-1">Up Next</h2>
            <ScheduleCard row={upNext} onOpen={() => setOpenRow(upNext)} />
          </section>
        )}

        {myExcursions.length > 0 && (
          <section className="mb-6">
            <h2 className="label-caps mb-2 px-1">Your Excursions</h2>
            <ExcursionGroupCard
              portName={portName}
              excursions={myExcursions}
              onOpenActivity={setOpenActivity}
            />
          </section>
        )}

        {!happening &&
          !upNext &&
          myExcursions.length === 0 &&
          roomDropsOnDay(roomDrops, selectedDay).length === 0 && (
            <p className="mt-8 text-center text-sm text-muted-foreground">
              Nothing scheduled for you on this day.
            </p>
          )}

        {hasMore && (
          <div className="mt-6">
            <Link
              to="/schedule/mine/full"
              search={{ day: selectedDay }}
              className="block w-full rounded-lg border border-border bg-secondary/60 px-4 py-3 text-center text-sm font-medium text-foreground transition-colors hover:border-primary hover:bg-accent"
            >
              See My Full Day
            </Link>
          </div>
        )}
        <p className="mt-8 text-center text-xs text-muted-foreground">
          All times shown in local time.
        </p>
      </main>

      <DetailSheet
        row={activeRow}
        excursions={activeExcursions}
        onClose={() => {
          if (openRow) dismissedIdRef.current = openRow.id;
          setOpenRow(null);
          setOpenActivity(null);
        }}
      />
      <RoomDropSheet row={openRoomDrop} onClose={() => setOpenRoomDrop(null)} />
      <DayPicker
        open={pickerOpen}
        days={days}
        selected={selectedDay}
        onSelect={(d) => nav({ search: { day: d } })}
        onClose={() => setPickerOpen(false)}
      />
    </div>
  );
}
