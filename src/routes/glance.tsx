import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";

import { Quiet } from "@/components/lilapp/ui";
import { isSetupRow, scheduleDays, sortSchedule } from "@/lib/schedule";
import { formatDayLabel, formatDayPlain } from "@/lib/time";
import { tripQueryOptions } from "@/lib/trip";

export const Route = createFileRoute("/glance")({
  head: () => ({ meta: [{ title: "Program at a Glance — LILApp Venice" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(tripQueryOptions),
  component: GlancePage,
});

const weekday = (day: string) =>
  day
    .trim()
    .split(/[\s,]+/)[0]
    ?.toLowerCase() ?? "";

/** One row per day: that day's guest events (no setups), plus the day's attire. */
function GlancePage() {
  const { data } = useSuspenseQuery(tripQueryOptions);
  const days = scheduleDays(data.schedule);

  return (
    <>
      {days.length === 0 ? (
        <Quiet>Schedule not loaded yet.</Quiet>
      ) : (
        <div className="card divide-y divide-border px-4">
          {days.map((d) => {
            const rows = sortSchedule(data.schedule.filter((r) => r.date === d && !isSetupRow(r)));
            const attire = data.attire.find((a) => weekday(a.day) === weekday(formatDayPlain(d)));
            return (
              <Link
                key={d}
                to="/"
                search={{ day: d }}
                className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-3 py-3.5"
              >
                <span className="text-sm leading-6 font-semibold text-primary">
                  {formatDayLabel(d)}
                </span>
                <span className="min-w-0">
                  {rows.map((r) => (
                    <span key={r.id} className="ui-body block text-foreground">
                      {r.startTime ? (
                        <span className="text-muted-foreground">{r.startTime} · </span>
                      ) : null}
                      {r.eventName}
                    </span>
                  ))}
                  {attire?.daytimeAttire || attire?.eveningAttire ? (
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {[
                        attire.daytimeAttire && `Daytime: ${attire.daytimeAttire}`,
                        attire.eveningAttire && `Evening: ${attire.eveningAttire}`,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  ) : null}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
