import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";

import { ActivityCard } from "@/components/lilapp/cards";
import { Quiet } from "@/components/lilapp/ui";
import { normalizeName, sortActivities } from "@/lib/schedule";
import { formatDayLong } from "@/lib/time";
import { tripQueryOptions } from "@/lib/trip";

export const Route = createFileRoute("/activities")({
  head: () => ({ meta: [{ title: "Activities — LILApp Venice" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(tripQueryOptions),
  component: ActivitiesPage,
});

function ActivitiesPage() {
  const { data } = useSuspenseQuery(tripQueryOptions);
  const activities = sortActivities(data.activities);
  // The Activities table has no date; it belongs to the day of the Activity rows in Schedule.
  const day = data.schedule.find((r) => normalizeName(r.type) === "activity")?.date;
  const groups = [
    {
      title: "LILA covering: Yes",
      rows: activities.filter((a) => normalizeName(a.lilaCovering) === "yes"),
    },
    {
      title: "LILA covering: Likely",
      rows: activities.filter((a) => normalizeName(a.lilaCovering) === "likely"),
    },
    {
      title: "LILA covering: No",
      rows: activities.filter((a) => !["yes", "likely"].includes(normalizeName(a.lilaCovering))),
    },
  ].filter((g) => g.rows.length > 0);

  return (
    <>
      <h1 className="ui-page-title">Activities</h1>
      {day ? <p className="ui-body mt-0.5 text-muted-foreground">{formatDayLong(day)}</p> : null}
      {activities.length === 0 ? (
        <Quiet>
          {data.loaded.ACTIVITIES ? "No activities yet." : "Activities not loaded yet."}
        </Quiet>
      ) : (
        groups.map((g) => (
          <section key={g.title} className="mt-5">
            <h2 className="label-caps">
              {g.title} · {g.rows.length}
            </h2>
            <ul className="divide-y divide-border">
              {g.rows.map((a) => (
                <li key={a.id}>
                  <ActivityCard activity={a} />
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </>
  );
}
