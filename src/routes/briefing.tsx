import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";

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

  return (
    <>
      <h1 className="ui-page-title">Briefing</h1>
      {data.briefing.length === 0 ? (
        <Quiet>
          {data.loaded.BRIEFING ? "Nothing in the Briefing yet." : "Briefing not loaded yet."}
        </Quiet>
      ) : (
        <div className="mt-2 divide-y divide-border">
          {data.briefing.map((b) => (
            <section key={b.id} className="py-4">
              {b.section ? <h2 className="ui-item-title mb-1.5">{b.section}</h2> : null}
              <NotesList notes={b.content} />
            </section>
          ))}
        </div>
      )}

      {team.length > 0 ? (
        <section className="mt-6">
          <h2 className="ui-page-title">Team</h2>
          <ul className="divide-y divide-border">
            {team.map((t) => (
              <li key={t.id}>
                <TravelCard member={t} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {questions.length > 0 ? (
        <section className="mt-6">
          <h2 className="ui-page-title">Open Questions</h2>
          <ul className="divide-y divide-border">
            {questions.map((q) => (
              <li key={q.id}>
                <Question question={q} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}

function TravelCard({ member: t }: { member: TeamRow }) {
  return (
    <article className="space-y-0.5 py-4">
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
    <article className={q.done ? "py-4 opacity-60" : "py-4"}>
      <p className="label-caps">{[q.category, q.done ? "Done" : ""].filter(Boolean).join(" · ")}</p>
      <h3 className="mt-0.5 font-semibold text-foreground">{q.question}</h3>
      <Field label="Ask" value={q.ask} />
      {q.answer ? <NotesList notes={q.answer} className="mt-1" /> : null}
    </article>
  );
}
