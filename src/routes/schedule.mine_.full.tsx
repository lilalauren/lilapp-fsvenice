import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useEffect, useMemo, useRef, useState } from "react";
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
  roomDropsOnDay,
} from "@/lib/schedule";
import { isEventPast, todayISO } from "@/lib/time";
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

const searchSchema = z.object({ day: fallback(z.string(), "").default("") });

export const Route = createFileRoute("/schedule/mine_/full")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({ meta: [{ title: "My Schedule — Full Day — LILApp" }] }),
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.fetchQuery(agendaQuery),
      context.queryClient.fetchQuery(excursionsQuery),
      context.queryClient.fetchQuery(teamQuery),
      context.queryClient.fetchQuery(roomDropsQuery),
    ]);
  },
  component: MyFullDay,
});

function MyFullDay() {
  const { day } = Route.useSearch();
  const nav = useNavigate({ from: "/schedule/mine/full" });
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

  const days = useMemo(() => buildDayList(agenda, excursions), [agenda, excursions]);
  const today = todayISO();
  const todayIsInTrip = days.some((d) => d.date === today);
  const selectedDay = day || (todayIsInTrip ? today : days[0]?.date ?? today);
  const mine = useMemo(
    () => (name ? filterForPhotographer(agenda, name) : []),
    [agenda, name],
  );
  const rows = useMemo(
    () => mine.filter((r) => r.date === selectedDay),
    [mine, selectedDay],
  );
  const currentId = useMemo(
    () => rows.find((r) => !isEventPast(r))?.id ?? null,
    [rows],
  );
  const currentRef = useRef<HTMLLIElement | null>(null);
  useEffect(() => {
    if (!currentId) return;
    const el = currentRef.current;
    if (!el) return;
    const t = window.setTimeout(
      () => el.scrollIntoView({ behavior: "auto", block: "center" }),
      50,
    );
    return () => window.clearTimeout(t);
  }, [currentId, selectedDay]);
  const myExcursions = useMemo(
    () => (name ? excursionsForPhotographerOnDay(excursions, name, selectedDay) : []),
    [excursions, name, selectedDay],
  );
  const portName = useMemo(
    () => days.find((d) => d.date === selectedDay)?.portName,
    [days, selectedDay],
  );

  const excursionsForOpen = useMemo(() => {
    if (!openRow) return [];
    if (isPortExcursionRow(openRow)) return excursionsOnDay(excursions, openRow.date);
    return [];
  }, [openRow, excursions]);

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
        {(() => {
          const drops = roomDropsOnDay(roomDrops, selectedDay);
          const nothing = rows.length === 0 && myExcursions.length === 0 && drops.length === 0;
          if (nothing) {
            return (
              <p className="mt-8 text-center text-sm text-muted-foreground">
                Nothing scheduled for you on this day.
              </p>
            );
          }
          return (
            <>
              {drops.length > 0 && (
                <section className="mb-4">
                  <h2 className="label-caps mb-2 px-1">Room drops — anytime today</h2>
                  <ul className="space-y-2">
                    {drops.map((rd) => (
                      <li key={rd.id}>
                        <RoomDropCard row={rd} onOpen={() => setOpenRoomDrop(rd)} />
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {(() => {
                const umbrellaIdx = rows.findIndex((r) => isPortExcursionRow(r));
                const hasUmbrella = umbrellaIdx >= 0;
                const showExcursionsFallback =
                  !hasUmbrella && myExcursions.length > 0;
                let excursionsRendered = false;
                const renderExcursions = (key: string) => (
                  <li key={key}>
                    <ExcursionGroupCard
                      portName={portName}
                      excursions={myExcursions}
                      onOpenActivity={setOpenActivity}
                    />
                  </li>
                );
                return (
                  <ul className="space-y-3">
                    {showExcursionsFallback && renderExcursions("excursions-top")}
                    {rows.map((r) => {
                      if (isPortExcursionRow(r)) {
                        if (excursionsRendered || myExcursions.length === 0) return null;
                        excursionsRendered = true;
                        return (
                          <li
                            key={r.id}
                            ref={r.id === currentId ? currentRef : undefined}
                          >
                            <ExcursionGroupCard
                              portName={portName}
                              excursions={myExcursions}
                              onOpenActivity={setOpenActivity}
                            />
                          </li>
                        );
                      }
                      return (
                        <li
                          key={r.id}
                          ref={r.id === currentId ? currentRef : undefined}
                        >
                          <ScheduleCard row={r} onOpen={() => setOpenRow(r)} />
                        </li>
                      );
                    })}
                  </ul>
                );
              })()}
            </>
          );
        })()}
        <p className="mt-8 text-center text-xs text-muted-foreground">
          All times shown in local time.
        </p>
      </main>

      <DetailSheet
        row={activeRow}
        excursions={activeExcursions}
        onClose={() => {
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
