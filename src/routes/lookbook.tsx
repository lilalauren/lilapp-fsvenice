import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";

import { Block, Field, ImageStrip, Quiet } from "@/components/lilapp/ui";
import type { AttireRow, LookbookRow } from "@/lib/airtable.server";
import { scheduleDays } from "@/lib/schedule";
import { formatDayPlain } from "@/lib/time";
import { tripQueryOptions } from "@/lib/trip";
import { lookbookImages } from "@/lib/venice-images";

export const Route = createFileRoute("/lookbook")({
  head: () => ({ meta: [{ title: "Lookbook — LILApp Venice" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(tripQueryOptions),
  component: LookbookPage,
});

const weekday = (day: string) =>
  day
    .trim()
    .split(/[\s,]+/)[0]
    ?.toLowerCase() ?? "";

function LookbookPage() {
  const { data } = useSuspenseQuery(tripQueryOptions);
  // Order the Lookbook's free-text days ("Friday, November 6") by the Schedule's dates.
  const order = scheduleDays(data.schedule).map((d) => weekday(formatDayPlain(d)));
  const rank = (day: string) => {
    const i = order.indexOf(weekday(day));
    return i < 0 ? 99 : i;
  };
  const days = Array.from(
    new Set([...data.lookbook.map((l) => l.day), ...data.attire.map((a) => a.day)]),
  )
    .filter(Boolean)
    .sort((a, b) => rank(a) - rank(b));
  // Attire and Lookbook may write the day differently; match on the weekday.
  const byDay = days.reduce<Array<{ day: string; attire?: AttireRow; looks: LookbookRow[] }>>(
    (out, day) => {
      const existing = out.find((g) => weekday(g.day) === weekday(day));
      if (existing) return out;
      return [
        ...out,
        {
          day,
          attire: data.attire.find((a) => weekday(a.day) === weekday(day)),
          looks: data.lookbook.filter((l) => weekday(l.day) === weekday(day)),
        },
      ];
    },
    [],
  );

  return (
    <>
      {byDay.length === 0 ? (
        <Quiet>{data.loaded.LOOKBOOK ? "No looks yet." : "Lookbook not loaded yet."}</Quiet>
      ) : (
        byDay.map(({ day, attire, looks }) => (
          <section key={day} className="mb-6">
            <h2 className="ui-label mb-2">{day}</h2>
            {attire ? (
              <div className="card mb-3 space-y-0.5 p-4">
                <Field label="Daytime Attire" value={attire.daytimeAttire} strong />
                <Field label="Evening Attire" value={attire.eveningAttire} strong />
                {attire.whatToWear ? (
                  <div className="pt-2">
                    <Block label="What to Wear" text={attire.whatToWear} />
                  </div>
                ) : null}
              </div>
            ) : null}
            <ul className="space-y-3">
              {looks.map((l) => (
                <li key={l.id}>
                  <Look look={l} />
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </>
  );
}

function Look({ look: l }: { look: LookbookRow }) {
  const images = [
    ...lookbookImages(l.event),
    ...l.images
      .filter((a) => !a.type || a.type.startsWith("image/"))
      .map((a) => ({ src: a.thumb ?? a.url, caption: a.filename ?? l.event })),
  ];
  return (
    <article className="card space-y-3 p-4">
      <div>
        <h3 className="font-serif text-xl leading-snug text-foreground">{l.event}</h3>
        <Field label="Dress Code" value={l.dressCode} strong />
      </div>
      <ImageStrip images={images} />
      {l.theme ? <p className="ui-body text-foreground/85">{l.theme}</p> : null}
      <Block label="Palette" text={l.palette} />
      <Block label="What to Wear" text={l.whatToWear} />
    </article>
  );
}
