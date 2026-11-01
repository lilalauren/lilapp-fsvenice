import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";

import { NotesList, Quiet, SelectBox } from "@/components/lilapp/ui";
import type { PersonRow } from "@/lib/airtable.server";
import { peopleInGroup, RESUME_GROUPS } from "@/lib/people";
import { personInitials, resumePhoto } from "@/lib/resume-photos";
import { tripQueryOptions } from "@/lib/trip";

type ResumeSearch = { group?: string };

export const Route = createFileRoute("/resume")({
  validateSearch: (search: Record<string, unknown>): ResumeSearch => ({
    group: typeof search.group === "string" && search.group ? search.group : undefined,
  }),
  head: () => ({ meta: [{ title: "Resume — LILApp Venice" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(tripQueryOptions),
  component: ResumePage,
});

function ResumePage() {
  const { data } = useSuspenseQuery(tripQueryOptions);
  const { group = RESUME_GROUPS[0].label } = Route.useSearch();
  const navigate = useNavigate({ from: "/resume" });
  const people = peopleInGroup(data.people, group);

  return (
    <>
      <h1 className="ui-page-title">Resume</h1>
      <div className="mt-3 flex">
        <SelectBox
          label="Group"
          value={group}
          onChange={(g) => navigate({ search: { group: g }, replace: true })}
        >
          {RESUME_GROUPS.map((g) => (
            <option key={g.label} value={g.label}>
              {g.label} ({peopleInGroup(data.people, g.label).length})
            </option>
          ))}
        </SelectBox>
      </div>
      {people.length === 0 ? (
        <Quiet>
          {data.loaded.KEY_PEOPLE ? "No one in this group yet." : "Key People not loaded yet."}
        </Quiet>
      ) : (
        <ul className="mt-2 divide-y divide-border">
          {people.map((p) => (
            <li key={p.id}>
              <Person person={p} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function Person({ person: p }: { person: PersonRow }) {
  const photo = resumePhoto(p.name, p.photo);
  const role = [p.title, p.company].filter(Boolean).join(" · ");
  return (
    <article className="py-4">
      <div className="flex items-center gap-3.5">
        {photo ? (
          <img
            src={photo}
            alt={p.name}
            loading="lazy"
            className="h-[88px] w-[76px] shrink-0 rounded-lg bg-muted object-cover object-top"
          />
        ) : (
          <span
            aria-hidden
            className="grid size-[60px] shrink-0 place-items-center rounded-full bg-accent text-lg font-semibold text-primary"
          >
            {personInitials(p.name)}
          </span>
        )}
        <div className="min-w-0">
          <h3 className="ui-item-title">{p.name}</h3>
          {role ? <p className="ui-body text-muted-foreground">{role}</p> : null}
          {p.activity ? <p className="ui-body text-muted-foreground">{p.activity}</p> : null}
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
