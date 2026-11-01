import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";

import { ExpandAll, Section } from "@/components/lilapp/cards";
import { NotesList, Quiet } from "@/components/lilapp/ui";
import type { PersonRow, TripData } from "@/lib/airtable.server";
import { peopleInGroup, RESUME_GROUPS } from "@/lib/people";
import { personInitials, resumePhoto } from "@/lib/resume-photos";
import { normalizeName, scheduleDays } from "@/lib/schedule";
import { tripQueryOptions } from "@/lib/trip";

export const Route = createFileRoute("/resume")({
  head: () => ({ meta: [{ title: "Resume — LILApp Venice" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(tripQueryOptions),
  component: ResumePage,
});

function ResumePage() {
  const { data } = useSuspenseQuery(tripQueryOptions);
  // Every section starts closed, like Panattoni.
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());
  const titles = RESUME_GROUPS.map((g) => g.label);
  const allOpen = titles.every((t) => openSections.has(t));
  const toggle = (title: string, open: boolean) =>
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (open) next.add(title);
      else next.delete(title);
      return next;
    });

  return (
    <>
      <Hero data={data} />
      <div className="mt-3 flex justify-end">
        <ExpandAll
          allOpen={allOpen}
          onClick={() => setOpenSections(allOpen ? new Set() : new Set(titles))}
        />
      </div>
      {!data.loaded.KEY_PEOPLE && data.people.length === 0 ? (
        <Quiet>Key People not loaded yet.</Quiet>
      ) : (
        RESUME_GROUPS.map((g) => {
          const people = peopleInGroup(data.people, g.label);
          return (
            <Section
              key={g.label}
              title={g.label}
              count={people.length}
              open={openSections.has(g.label)}
              onToggle={(open) => toggle(g.label, open)}
            >
              {people.length === 0 ? (
                <Quiet>No one in this group yet.</Quiet>
              ) : (
                people.map((p) => <Person key={p.id} person={p} />)
              )}
            </Section>
          );
        })
      )}
    </>
  );
}

/** Panattoni's sage hero: the event and a few numbers, all from Airtable. */
function Hero({ data }: { data: TripData }) {
  const overview = data.briefing.find((b) => normalizeName(b.section) === "event overview");
  const lines = overview?.content.split(/\r?\n/).filter(Boolean) ?? [];
  const stats = [
    { value: scheduleDays(data.schedule).length, label: "Days" },
    { value: data.schedule.length, label: "Schedule" },
    { value: data.activities.length, label: "Activities" },
    { value: data.people.length, label: "Key People" },
  ].filter((s) => s.value > 0);
  return (
    <section className="rounded-[18px] bg-sage px-5 py-5 text-foreground">
      <p className="text-xs font-semibold tracking-[0.14em] text-foreground/70 uppercase">
        Preferred Partner Insider
      </p>
      <h2 className="mt-1 font-serif text-2xl leading-tight italic">
        {lines[0] ?? "Four Seasons PPI EMEA 2026"}
      </h2>
      {lines.slice(1, 3).map((l, i) => (
        <p key={i} className="mt-2 text-[15px] leading-relaxed text-foreground/85">
          {l}
        </p>
      ))}
      {stats.length ? (
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          {stats.map((s) => (
            <div key={s.label} className="rounded-[13px] bg-white/25 px-4 py-3">
              <strong className="block font-serif text-3xl leading-none font-normal">
                {s.value}
              </strong>
              <span className="mt-1.5 block text-[11px] font-semibold tracking-[0.08em] uppercase">
                {s.label}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function Person({ person: p }: { person: PersonRow }) {
  const photo = resumePhoto(p.name, p.photo);
  const role = [p.title, p.company].filter(Boolean).join(" · ");
  return (
    <article className="card p-4">
      <div className="flex items-center gap-3.5">
        {photo ? (
          <img
            src={photo}
            alt={p.name}
            loading="lazy"
            className="h-[88px] w-[76px] shrink-0 rounded-[10px] bg-muted object-cover object-top"
          />
        ) : (
          <span
            aria-hidden
            className="grid size-[60px] shrink-0 place-items-center rounded-full bg-secondary text-lg font-semibold text-primary"
          >
            {personInitials(p.name)}
          </span>
        )}
        <div className="min-w-0">
          <h3 className="text-[17px] leading-snug font-semibold text-foreground">{p.name}</h3>
          {role ? <p className="mt-0.5 text-sm text-muted-foreground">{role}</p> : null}
          {p.activity ? <p className="text-sm text-muted-foreground">{p.activity}</p> : null}
        </div>
      </div>
      {p.personalAttention ? <NotesList notes={p.personalAttention} className="mt-3" /> : null}
      {p.phone ? (
        <a
          href={`tel:${p.phone.replace(/[^\d+]/g, "")}`}
          className="mt-1 inline-flex min-h-11 items-center text-sm font-semibold text-primary"
        >
          {p.phone}
        </a>
      ) : null}
    </article>
  );
}
