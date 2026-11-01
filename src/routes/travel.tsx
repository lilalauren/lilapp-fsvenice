import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getTravel } from "@/lib/airtable.functions";
import { useDisplayName } from "@/lib/use-display-name";
import { ChevronLeft } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { formatTime, formatDateShort } from "@/lib/time";
import type { TravelRow } from "@/lib/airtable.server";

const travelQuery = queryOptions({
  queryKey: ["travel"],
  queryFn: () => getTravel(),
  refetchInterval: 60_000,
  refetchOnWindowFocus: true,
  refetchOnMount: "always",
  staleTime: 0,
});


export const Route = createFileRoute("/travel")({
  head: () => ({ meta: [{ title: "Travel — The Northern Crossing" }] }),
  loader: ({ context }) => context.queryClient.fetchQuery(travelQuery),
  component: TravelPage,
});

// "on own" / "self" / empty flight+airport = self-arranged
function isSelfArranged(r: TravelRow, side: "arrival" | "departure"): boolean {
  const joined =
    side === "arrival"
      ? `${r.flightNumber ?? ""} ${r.arrivalAirport ?? ""} ${r.arrivalFrom ?? ""}`
      : `${r.notes ?? ""}`;
  const t = joined.toLowerCase();
  if (/on own|on-own|self|independent/.test(t)) return true;
  if (side === "arrival") {
    return !r.flightNumber && !r.arrivalAirport && !r.arrivalFrom;
  }
  return !r.departureTime && !r.departureDate;
}

function Block({
  title,
  children,
  selfArranged,
}: {
  title: string;
  children: React.ReactNode;
  selfArranged: boolean;
}) {
  return (
    <div>
      <h4 className="label-caps mb-1">{title}</h4>
      {selfArranged ? (
        <p className="text-sm italic text-muted-foreground">Traveling independently</p>
      ) : (
        <div className="space-y-0.5 text-sm text-foreground">{children}</div>
      )}
    </div>
  );
}

function TravelPage() {
  const { data } = useSuspenseQuery(travelQuery);
  const [name, , hydrated] = useDisplayName();
  const nav = useNavigate();
  useEffect(() => {
    if (hydrated && !name) nav({ to: "/pick-name" });
  }, [hydrated, name, nav]);

  const [mineOnly, setMineOnly] = useState(true);
  const rows = useMemo(() => {
    if (mineOnly && name) {
      const n = name.toLowerCase();
      return data.filter(
        (r) =>
          r.teamMember.toLowerCase().includes(n) || n.includes(r.teamMember.toLowerCase()),
      );
    }
    return data;
  }, [data, mineOnly, name]);

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
          <h1 className="text-sm font-semibold text-foreground">Travel</h1>
          <div className="ml-auto flex rounded-md border border-border bg-secondary p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setMineOnly(true)}
              className={`rounded px-2 py-1 ${mineOnly ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
            >
              Mine
            </button>
            <button
              type="button"
              onClick={() => setMineOnly(false)}
              className={`rounded px-2 py-1 ${!mineOnly ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
            >
              Team
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-6 px-4 pt-6">
        {rows.length === 0 ? (
          <p className="mt-8 text-center text-sm text-muted-foreground">No travel details.</p>
        ) : (
          <ul className="space-y-3">
            {rows.map((r) => {
              const arrivalSelf = isSelfArranged(r, "arrival");
              const departureSelf = isSelfArranged(r, "departure");
              return (
                <li key={r.id} className="rounded-lg border border-border bg-card p-4">
                  <div className="mb-3">
                    <h3 className="text-base font-semibold text-foreground">{r.teamMember}</h3>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Block title="Arrival" selfArranged={arrivalSelf}>
                      {(r.arrivalDate || r.arrivalTime) && (
                        <div>
                          {formatDateShort(r.arrivalDate)}
                          {r.arrivalTime && <> · {formatTime(r.arrivalTime)}</>}
                        </div>
                      )}
                      {r.flightNumber && (
                        <div className="text-muted-foreground">
                          {r.flightNumber}
                          {r.arrivalFrom && <> from {r.arrivalFrom}</>}
                        </div>
                      )}
                      {r.arrivalAirport && (
                        <div className="text-muted-foreground">into {r.arrivalAirport}</div>
                      )}
                    </Block>
                    <Block title="Departure" selfArranged={departureSelf}>
                      {(r.departureDate || r.departureTime) && (
                        <div>
                          {formatDateShort(r.departureDate)}
                          {r.departureTime && <> · {formatTime(r.departureTime)}</>}
                        </div>
                      )}
                    </Block>
                  </div>
                  <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <div className="min-w-0">
                      <h4 className="label-caps mb-1">Hotel (Pre-cruise)</h4>
                      <p className="text-sm text-foreground/90">
                        Radisson Blu Edwardian, London
                        {r.cabin && (
                          <span className="ml-3 text-muted-foreground">
                            · Cabin {r.cabin}
                          </span>
                        )}
                      </p>
                      {r.hotelConfirmation && (
                        <p className="mt-0.5 whitespace-pre-wrap text-xs text-muted-foreground">
                          {r.hotelConfirmation}
                        </p>
                      )}
                    </div>
                  </div>
                  {r.notes && !/^on own\.?$/i.test(r.notes.trim()) && (
                    <div className="mt-3">
                      <h4 className="label-caps mb-1">Notes</h4>
                      <p className="whitespace-pre-wrap text-sm text-foreground/80">{r.notes}</p>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <section className="rounded-lg border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Transfers</h3>
          <ul className="space-y-3 text-sm text-foreground/90">
            <li>
              <div className="font-medium text-foreground">LHR → Radisson Blu Edwardian</div>
              <p className="mt-0.5 text-foreground/80">
                Ground transportation provided by KMEvents.co, per each guest's individual
                itinerary sent via email.
              </p>
            </li>
            <li>
              <div className="font-medium text-foreground">
                Radisson Blu Edwardian → Dover (July 11)
              </div>
              <p className="mt-0.5 text-foreground/80">
                Coaches depart between 11:00 AM and 1:00 PM. Approximately a 90-minute transfer.
                Guests must board their assigned coach — individual cars will be turned away at
                the port.
              </p>
            </li>
            <li>
              <div className="font-medium text-foreground">
                Port arrival & boarding (July 11)
              </div>
              <p className="mt-0.5 text-foreground/80">
                Boarding begins when the first coach arrives. Guests proceed through terminal
                security, then Seabourn check-in (~15 minutes), before boarding via the gangway.
              </p>
            </li>
            <li>
              <div className="font-medium text-foreground">Disembarking (July 18)</div>
              <p className="mt-0.5 text-foreground/80">
                Ship docks at Ocean Quay, Copenhagen, ~7:00 AM local time. Disembarkation begins
                ~8:00 AM. All guests off by 10:00 AM.
              </p>
              <p className="mt-1 text-foreground/70">
                Note: Copenhagen port now uses the EES (Entry/Exit System) with biometric
                verification, which may add time — keep travel documents accessible and allow
                extra time.
              </p>
            </li>
          </ul>
        </section>
      </main>
    </div>
  );
}
