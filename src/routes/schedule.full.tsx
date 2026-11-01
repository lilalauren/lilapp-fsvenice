import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { ChevronDown } from "lucide-react";
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
  isPortExcursionRow,
  roomDropsOnDay,
} from "@/lib/schedule";
import { isEventPast, todayISO, formatDateLong } from "@/lib/time";
import { type AgendaRow, type ExcursionAssignRow, type RoomDropRow } from "@/lib/airtable.server";

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
  filter: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/schedule/full")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({ meta: [{ title: "Full Schedule — LILApp" }] }),
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.fetchQuery(agendaQuery),
      context.queryClient.fetchQuery(excursionsQuery),
      context.queryClient.fetchQuery(teamQuery),
      context.queryClient.fetchQuery(roomDropsQuery),
    ]);
  },
  component: FullSchedule,
});

function FullSchedule() {
  const { day, filter } = Route.useSearch();
  const nav = useNavigate({ from: "/schedule/full" });
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
  const firstDay = days[0]?.date ?? "";
  const selectedDay =
    day === "all" ? "all" : day || (todayIsInTrip ? today : firstDay);
  const showAll = selectedDay === "all";

  const filtered = useMemo(() => {
    // Drop umbrella "Port: … Excursions" rows — they're rendered as a
    // dedicated ExcursionGroupCard, not as a regular schedule card.
    const base = (showAll ? agenda : agenda.filter((r) => r.date === selectedDay)).filter(
      (r) => !isPortExcursionRow(r),
    );
    if (!filter) return base;
    const f = filter.toLowerCase();
    return base.filter((r) =>
      r.assignedPhotographers.some(
        (p) => p.toLowerCase().includes(f) || f.includes(p.toLowerCase()),
      ),
    );
  }, [agenda, selectedDay, filter, showAll]);

  const grouped = useMemo(() => {
    const map = new Map<string, AgendaRow[]>();
    for (const r of filtered) {
      const key = r.date || "";
      const list = map.get(key) ?? [];
      list.push(r);
      map.set(key, list);
    }
    return Array.from(map.entries());
  }, [filtered]);

  // Excursions per date, filtered by the Names filter when active.
  const excursionsByDate = useMemo(() => {
    const map = new Map<string, ExcursionAssignRow[]>();
    const f = filter.trim().toLowerCase();
    const push = (dateISO: string, list: ExcursionAssignRow[]) => {
      const kept = f
        ? list.filter((ex) =>
            ex.photographers.some((p) => {
              const pn = p.toLowerCase();
              return pn === f || pn.includes(f) || f.includes(pn);
            }),
          )
        : list;
      if (kept.length) map.set(dateISO, kept);
    };
    if (showAll) {
      for (const d of days) push(d.date, excursionsOnDay(excursions, d.date));
    } else if (selectedDay) {
      push(selectedDay, excursionsOnDay(excursions, selectedDay));
    }
    return map;
  }, [excursions, days, selectedDay, showAll, filter]);

  const portNameForDate = (dateISO: string) =>
    days.find((d) => d.date === dateISO)?.portName;

  const photographers = useMemo(() => team, [team]);

  // Only attach excursion details when the umbrella "Port: … Excursions" row
  // is opened. Regular events must not show unrelated excursion data.
  const excursionsForOpen = useMemo(() => {
    if (!openRow) return [] as ExcursionAssignRow[];
    if (isPortExcursionRow(openRow)) return excursionsOnDay(excursions, openRow.date);
    return [] as ExcursionAssignRow[];
  }, [openRow, excursions]);

  // Synthetic AgendaRow used when a single activity from the excursion
  // breakdown is opened — reuses DetailSheet without any real ROS row.
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

  const endSentinelRef = useRef<HTMLDivElement | null>(null);
  const [showScrollHint, setShowScrollHint] = useState(false);
  useEffect(() => {
    setShowScrollHint(false);
    if (showAll) return;
    const el = endSentinelRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([entry]) => setShowScrollHint(!entry.isIntersecting),
      { rootMargin: "0px 0px -20px 0px", threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [showAll, selectedDay, filter, filtered.length]);

  // Auto-scroll to the current/next event on mount so past greyed items sit
  // above and the user opens close to what's happening now.
  const currentId = useMemo(
    () => (showAll ? null : filtered.find((r) => !isEventPast(r))?.id ?? null),
    [filtered, showAll],
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

  if (!hydrated || !name) {
    return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-background pb-16">
      <PageHeader
        displayName={name}
        dateISO={showAll ? "" : selectedDay}
        dateLabelOverride={showAll ? "All days" : undefined}
        portLabel={
          showAll
            ? undefined
            : (() => {
                const d = days.find((x) => x.date === selectedDay);
                return d?.atSea ? "At sea" : d?.portName;
              })()
        }
        activeTab="full"
        currentDay={selectedDay}
        onOpenDayPicker={() => setPickerOpen(true)}
      />

      <main className="mx-auto max-w-2xl px-4 pt-6">
        <div className="mb-4 flex items-center gap-2 px-1">
          <label className="label-caps text-[10px]" htmlFor="pfilter">
            Names
          </label>
          <div className="relative">
            <select
              id="pfilter"
              value={filter}
              onChange={(e) =>
                nav({
                  search: {
                    day: showAll ? "all" : selectedDay,
                    filter: e.target.value,
                  },
                })
              }
              className="h-7 appearance-none rounded-md border border-border bg-background pl-2 pr-6 text-xs text-foreground focus:border-primary focus:outline-none"
            >
              <option value="">All Team</option>
              {photographers.map((p) => (
                <option key={p.id} value={p.displayName}>
                  {p.displayName}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-subtle" />
          </div>
        </div>

        {filtered.length === 0 &&
        excursionsByDate.size === 0 &&
        (showAll ? roomDrops.length === 0 : roomDropsOnDay(roomDrops, selectedDay).length === 0) ? (
          <p className="mt-8 text-center text-sm text-muted-foreground">
            {showAll ? "Nothing scheduled yet." : "Nothing scheduled on this day."}
          </p>
        ) : showAll ? (
          <div className="space-y-6">
            {(() => {
              // Merge dates that have either agenda rows or excursions.
              const dateSet = new Set<string>([
                ...grouped.map(([d]) => d),
                ...excursionsByDate.keys(),
              ]);
              const dates = Array.from(dateSet).sort((a, b) => a.localeCompare(b));
              return dates.map((date) => {
                const rows = grouped.find(([d]) => d === date)?.[1] ?? [];
                const exList = excursionsByDate.get(date) ?? [];
                const drops = roomDropsOnDay(roomDrops, date);
                return (
                  <section key={date || "no-date"}>
                    <h2 className="label-caps mb-2 px-1">
                      {date ? formatDateLong(date) : "Unscheduled"}
                    </h2>
                    {drops.length > 0 && (
                      <div className="mb-3">
                        <h3 className="label-caps mb-2 px-1 text-[10px]">
                          Room drops — anytime today
                        </h3>
                        <ul className="space-y-2">
                          {drops.map((rd) => (
                            <li key={rd.id}>
                              <RoomDropCard row={rd} onOpen={() => setOpenRoomDrop(rd)} />
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <ul className="space-y-3">
                      {exList.length > 0 && (
                        <li>
                          <ExcursionGroupCard
                            portName={portNameForDate(date)}
                            excursions={exList}
                            onOpenActivity={setOpenActivity}
                          />
                        </li>
                      )}
                      {rows.map((r) => (
                        <li key={r.id}>
                          <ScheduleCard row={r} showAssignees onOpen={() => setOpenRow(r)} />
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              });
            })()}
          </div>
        ) : (
          <>
            {(() => {
              const drops = roomDropsOnDay(roomDrops, selectedDay);
              if (drops.length === 0) return null;
              return (
                <div className="mb-4">
                  <h3 className="label-caps mb-2 px-1 text-[10px]">
                    Room drops — anytime today
                  </h3>
                  <ul className="space-y-2">
                    {drops.map((rd) => (
                      <li key={rd.id}>
                        <RoomDropCard row={rd} onOpen={() => setOpenRoomDrop(rd)} />
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })()}
            <ul className="space-y-3">
              {(excursionsByDate.get(selectedDay)?.length ?? 0) > 0 && (
                <li>
                  <ExcursionGroupCard
                    portName={portNameForDate(selectedDay)}
                    excursions={excursionsByDate.get(selectedDay) ?? []}
                    onOpenActivity={setOpenActivity}
                  />
                </li>
              )}
              {filtered.map((r) => (
                <li key={r.id} ref={r.id === currentId ? currentRef : undefined}>
                  <ScheduleCard row={r} showAssignees onOpen={() => setOpenRow(r)} />
                </li>
              ))}
            </ul>
            <div ref={endSentinelRef} aria-hidden className="h-px" />
            {showScrollHint && (
              <button
                type="button"
                onClick={() =>
                  endSentinelRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
                }
                className="fixed bottom-6 left-1/2 z-20 -translate-x-1/2 rounded-full border border-border bg-background/95 px-3 py-1 text-xs text-subtle shadow-md backdrop-blur transition-opacity hover:text-foreground"
              >
                <span className="inline-flex items-center gap-1">
                  Scroll for more <ChevronDown className="h-3 w-3" />
                </span>
              </button>
            )}
          </>
        )}

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
        includeAllDays
        onSelect={(d) => nav({ search: { day: d, filter } })}
        onClose={() => setPickerOpen(false)}
      />
    </div>
  );
}
