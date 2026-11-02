import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";

import { ExpandAll, Section } from "@/components/lilapp/cards";
import { NotesList, Quiet } from "@/components/lilapp/ui";
import type { PersonRow, TripData } from "@/lib/airtable.server";
import { peopleInGroup, RESUME_GROUPS } from "@/lib/people";
import { personInitials, resumePhoto } from "@/lib/resume-photos";
import { findSection, guestCounts, rowsFor } from "@/lib/briefing";
import { normalizeName } from "@/lib/schedule";
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
  const resumeRows = rowsFor(data.briefing, "resume");
  const dmcNotes = resumeRows.find((r) => normalizeName(r.section).startsWith("dmc"));
  // Any other Briefing rows set to "Resume" get their own section at the end.
  const extra = resumeRows.filter(
    (r) => r !== dmcNotes && !["event overview", "guest counts"].includes(normalizeName(r.section)),
  );
  const titles = [...RESUME_GROUPS.map((g) => g.label), ...extra.map((r) => r.id)];
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
          const notes = g.label.startsWith("DMC") ? dmcNotes : undefined;
          return (
            <Section
              key={g.label}
              title={g.label}
              count={people.length}
              open={openSections.has(g.label)}
              onToggle={(open) => toggle(g.label, open)}
            >
              {notes ? (
                <div className="card p-4">
                  <NotesList notes={notes.content} />
                </div>
              ) : null}
              {people.length === 0 && !notes ? (
                <Quiet>No one in this group yet.</Quiet>
              ) : (
                people.map((p) => <Person key={p.id} person={p} />)
              )}
            </Section>
          );
        })
      )}
      {extra.map((r) => (
        <Section
          key={r.id}
          title={r.section}
          open={openSections.has(r.id)}
          onToggle={(open) => toggle(r.id, open)}
        >
          <div className="card p-4">
            <NotesList notes={r.content} />
          </div>
        </Section>
      ))}
    </>
  );
}

/** Panattoni's sage hero: the Event overview from Airtable, plus the headcounts. */
function Hero({ data }: { data: TripData }) {
  const overview = findSection(data.briefing, "event overview");
  const lines = (overview?.content.split(/\r?\n/) ?? [])
    .map((l) => l.replace(/^[-–—•*·]+\s*/, "").trim())
    .filter(Boolean)
    // The Schedule already says "Venice time"; keep the green box short.
    .filter((l) => !/^all times/i.test(l));
  const leadership = peopleInGroup(data.people, "Leadership").length;
  const stats = [
    ...guestCounts(data.briefing),
    ...(leadership ? [{ label: "Leadership", value: String(leadership) }] : []),
  ];
  return (
    <section className="rounded-[18px] bg-sage px-5 py-5 text-foreground">
      <h2 className="font-serif text-[1.6rem] leading-tight italic">
        {lines[0] ?? "Four Seasons PPI EMEA 2026"}
      </h2>
      {lines.slice(1).map((l, i) => (
        <p key={i} className="mt-1.5 text-[15px] leading-snug text-foreground/85">
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

// The group heading already says Four Seasons / Danieli, so only other companies are shown.
const OBVIOUS = ["four seasons", "danieli, venezia", "danieli"];

function Person({ person: p }: { person: PersonRow }) {
  const photo = resumePhoto(p.name, p.photo);
  const company = OBVIOUS.includes(normalizeName(p.company)) ? "" : p.company;
  const role = [p.title, company].filter(Boolean).join(" · ");
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
          {role ? (
            <p className="mt-0.5 text-sm leading-snug text-muted-foreground">{role}</p>
          ) : null}
          {p.activity ? (
            <p className="mt-1 text-[13px] font-semibold text-primary">{p.activity}</p>
          ) : null}
          {p.personalAttention ? (
            <p className="mt-1 text-[13px] leading-snug text-foreground/75">
              {p.personalAttention.replace(/\s*\n+\s*/g, " ")}
            </p>
          ) : null}
          {p.phone ? (
            <a
              href={`tel:${p.phone.replace(/[^\d+]/g, "")}`}
              className="inline-flex min-h-9 items-center text-sm font-semibold text-primary"
            >
              {p.phone}
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}
