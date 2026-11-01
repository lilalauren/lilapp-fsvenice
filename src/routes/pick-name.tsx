import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { queryOptions } from "@tanstack/react-query";
import { getTeam } from "@/lib/airtable.functions";
import { useDisplayName } from "@/lib/use-display-name";
import brandCrest from "@/assets/northern-crossing-circle.png.asset.json";

const teamQuery = queryOptions({
  queryKey: ["team"],
  queryFn: () => getTeam(),
  refetchInterval: 60_000,
  refetchOnWindowFocus: true,
  refetchOnMount: "always",
  staleTime: 0,
});

export const Route = createFileRoute("/pick-name")({
  head: () => ({
    meta: [{ title: "Choose your name — LILApp" }],
  }),
  loader: ({ context }) => context.queryClient.fetchQuery(teamQuery),
  component: PickName,
  errorComponent: ({ error, reset }) => (
    <div className="mx-auto max-w-md p-8">
      <h1 className="text-lg font-semibold">Couldn't load the team</h1>
      <p className="mt-2 text-sm text-muted-foreground">{error instanceof Error ? error.message : String(error)}</p>
      <button
        onClick={reset}
        className="mt-4 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
      >
        Try again
      </button>
    </div>
  ),
});

function PickName() {
  const { data: team } = useSuspenseQuery(teamQuery);
  const [, setName] = useDisplayName();
  const nav = useNavigate();

  // Preserve Airtable row order.
  const sorted = team;

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-md">
        <div className="mb-6 flex justify-center">
          <img
            src={brandCrest.url}
            alt="The Northern Crossing — Sabbatical 2026"
            className="h-28 w-28 sm:h-32 sm:w-32"
          />
        </div>
        <h1 className="text-center text-2xl font-semibold text-foreground">Who's this?</h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          Pick your name so LILApp knows whose schedule to show.
        </p>
        <ul className="mt-6 divide-y divide-border rounded-lg border border-border bg-card">
          {sorted.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => {
                  setName(t.displayName);
                  nav({ to: "/schedule/full" });
                }}
                className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-accent"
              >
                <div>
                  <div className="text-sm font-medium text-foreground">{t.displayName}</div>
                  {t.role && (
                    <div className="text-xs text-muted-foreground">{t.role}</div>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
