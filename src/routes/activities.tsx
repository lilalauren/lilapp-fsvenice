import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";

import { useState } from "react";

import { ActivityCard, ExpandAll } from "@/components/lilapp/cards";
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
  const [expandAll, setExpandAll] = useState<boolean | undefined>(undefined);
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
      <div className="flex items-center justify-between">
        {day ? <h2 className="ui-page-title">{formatDayLong(day)}</h2> : <span />}
        <ExpandAll allOpen={Boolean(expandAll)} onClick={() => setExpandAll(!expandAll)} />
      </div>
      {activities.length === 0 ? (
        <Quiet>
          {data.loaded.ACTIVITIES ? "No activities yet." : "Activities not loaded yet."}
        </Quiet>
      ) : (
        groups.map((g) => (
          <section key={g.title} className="mt-4">
            <h3 className="ui-label mb-2">
              {g.title} · {g.rows.length}
            </h3>
            <ul className="space-y-3">
              {g.rows.map((a) => (
                <li key={a.id}>
                  <ActivityCard activity={a} expandAll={expandAll} />
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </>
  );
}
