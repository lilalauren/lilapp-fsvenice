import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";

import { ExpandAll, Section } from "@/components/lilapp/cards";

import { Block, Field, NotesList, Quiet } from "@/components/lilapp/ui";
import type { QuestionRow, TeamRow } from "@/lib/airtable.server";
import { tripQueryOptions } from "@/lib/trip";
import { useDisplayName } from "@/lib/use-display-name";

export const Route = createFileRoute("/briefing")({
  head: () => ({ meta: [{ title: "Briefing — LILApp Venice" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(tripQueryOptions),
  component: BriefingPage,
});

function BriefingPage() {
  const { data } = useSuspenseQuery(tripQueryOptions);
  const [name] = useDisplayName();
  // Your own travel card first.
  const team = [...data.team].sort((a, b) => Number(b.name === name) - Number(a.name === name));
  const questions = [...data.questions].sort((a, b) => Number(a.done) - Number(b.done));
  const [open, setOpen] = useState<Set<string>>(new Set());

  const sections = [
    ...data.briefing.map((b) => ({
      key: b.id,
      title: b.section || "Briefing",
      count: undefined as number | undefined,
      body: <NotesList notes={b.content} />,
    })),
    team.length
      ? {
          key: "team",
          title: "Team",
          count: team.length,
          body: team.map((t) => <TravelCard key={t.id} member={t} />),
        }
      : null,
    questions.length
      ? {
          key: "questions",
          title: "Open Questions",
          count: questions.filter((q) => !q.done).length,
          body: questions.map((q) => <Question key={q.id} question={q} />),
        }
      : null,
  ].filter((x) => x !== null);
  const allOpen = sections.length > 0 && sections.every((x) => open.has(x.key));
  const toggle = (key: string, next: boolean) =>
    setOpen((prev) => {
      const out = new Set(prev);
      if (next) out.add(key);
      else out.delete(key);
      return out;
    });

  return (
    <>
      <div className="flex justify-end">
        <ExpandAll
          allOpen={allOpen}
          onClick={() => setOpen(allOpen ? new Set() : new Set(sections.map((x) => x.key)))}
        />
      </div>
      {data.briefing.length === 0 && !data.loaded.BRIEFING ? (
        <Quiet>Briefing not loaded yet.</Quiet>
      ) : null}
      {sections.map((x) => (
        <Section
          key={x.key}
          title={x.title}
          count={x.count}
          open={open.has(x.key)}
          onToggle={(next) => toggle(x.key, next)}
        >
          {x.key === "team" || x.key === "questions" ? (
            x.body
          ) : (
            <div className="card p-4">{x.body}</div>
          )}
        </Section>
      ))}
    </>
  );
}

function TravelCard({ member: t }: { member: TeamRow }) {
  return (
    <article className="card space-y-0.5 p-4">
      <h3 className="ui-item-title">{t.name}</h3>
      {t.role ? <p className="ui-body text-muted-foreground">{t.role}</p> : null}
      {t.phone ? (
        <a
          href={`https://wa.me/${t.phone.replace(/[^\d]/g, "")}`}
          className="inline-flex min-h-11 items-center text-sm font-semibold text-primary"
        >
          {t.phone}
        </a>
      ) : null}
      <Field label="Hotel / Room" value={t.hotelRoom} />
      <Field label="Arrival in Venice" value={t.arrivalInVenice} />
      <div className="space-y-3 pt-2">
        <Block label="Outbound Flight" text={t.outboundFlight} />
        <Block label="Airport Transfer" text={t.airportTransfer} />
        <Block label="Return Flight" text={t.returnFlight} />
        <Block label="Notes" text={t.notes} />
      </div>
    </article>
  );
}

function Question({ question: q }: { question: QuestionRow }) {
  return (
    <article className={q.done ? "card p-4 opacity-60" : "card p-4"}>
      <p className="label-caps">{[q.category, q.done ? "Done" : ""].filter(Boolean).join(" · ")}</p>
      <h3 className="mt-0.5 font-semibold text-foreground">{q.question}</h3>
      <Field label="Ask" value={q.ask} />
      {q.answer ? <NotesList notes={q.answer} className="mt-1" /> : null}
    </article>
  );
}
