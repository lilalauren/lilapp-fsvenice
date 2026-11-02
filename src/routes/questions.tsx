import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";

import { Field, NotesList, Quiet } from "@/components/lilapp/ui";
import { tripQueryOptions } from "@/lib/trip";

export const Route = createFileRoute("/questions")({
  head: () => ({ meta: [{ title: "Pending Questions — LILApp Venice" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(tripQueryOptions),
  component: QuestionsPage,
});

/** Open Questions still pending. Tick "Done" in Airtable and it leaves the app. */
function QuestionsPage() {
  const { data } = useSuspenseQuery(tripQueryOptions);
  const pending = data.questions.filter((q) => !q.done);
  if (!data.loaded.OPEN_QUESTIONS && data.questions.length === 0) {
    return <Quiet>Questions not loaded yet.</Quiet>;
  }
  if (pending.length === 0) return <Quiet>Nothing pending. All questions are resolved.</Quiet>;
  return (
    <ul className="space-y-3">
      {pending.map((q) => (
        <li key={q.id} className="card p-4">
          {q.category ? <p className="label-caps">{q.category}</p> : null}
          <h3 className="mt-0.5 font-semibold text-foreground">{q.question}</h3>
          <Field label="Ask" value={q.ask} />
          {q.answer ? <NotesList notes={q.answer} className="mt-1" /> : null}
        </li>
      ))}
    </ul>
  );
}
