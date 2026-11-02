import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";

import { ExpandAll, Section } from "@/components/lilapp/cards";
import { NotesList, Quiet } from "@/components/lilapp/ui";
import { rowsFor } from "@/lib/briefing";
import { tripQueryOptions } from "@/lib/trip";

export const Route = createFileRoute("/briefing")({
  head: () => ({ meta: [{ title: "Briefing — LILApp Venice" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(tripQueryOptions),
  component: BriefingPage,
});

/** Only the Briefing rows whose "Show On" is Briefing (or empty). */
function BriefingPage() {
  const { data } = useSuspenseQuery(tripQueryOptions);
  const rows = rowsFor(data.briefing, "briefing");
  const [open, setOpen] = useState<Set<string>>(new Set());
  const allOpen = rows.length > 0 && rows.every((r) => open.has(r.id));
  const toggle = (key: string, next: boolean) =>
    setOpen((prev) => {
      const out = new Set(prev);
      if (next) out.add(key);
      else out.delete(key);
      return out;
    });

  return (
    <>
      {rows.length ? (
        <div className="flex justify-end">
          <ExpandAll
            allOpen={allOpen}
            onClick={() => setOpen(allOpen ? new Set() : new Set(rows.map((r) => r.id)))}
          />
        </div>
      ) : (
        <Quiet>{data.loaded.BRIEFING ? "Nothing here yet." : "Briefing not loaded yet."}</Quiet>
      )}
      {rows.map((r) => (
        <Section
          key={r.id}
          title={r.section || "Briefing"}
          open={open.has(r.id)}
          onToggle={(next) => toggle(r.id, next)}
        >
          <div className="card p-4">
            <NotesList notes={r.content} />
          </div>
        </Section>
      ))}
    </>
  );
}
