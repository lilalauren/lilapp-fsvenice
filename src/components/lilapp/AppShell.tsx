import { useEffect, useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  CalendarDays,
  CalendarRange,
  CircleHelp,
  Compass,
  Shirt,
  Smartphone,
  UserRound,
} from "lucide-react";

import { cventUrl } from "@/lib/briefing";
import { tripQueryOptions } from "@/lib/trip";
import { OfflineBanner } from "./OfflineBanner";
import { UpdatesBell } from "./UpdatesBell";

const tabs = [
  { to: "/resume", label: "Resume", icon: UserRound },
  { to: "/", label: "Schedule", icon: CalendarDays },
  { to: "/activities", label: "Activities", icon: Compass },
  { to: "/lookbook", label: "Lookbook", icon: Shirt },
  { to: "/briefing", label: "Briefing", icon: BookOpen },
] as const;

const TITLES: Record<string, string> = {
  "/": "Schedule",
  "/activities": "Activities",
  "/resume": "Resume",
  "/lookbook": "Lookbook",
  "/briefing": "Briefing",
  "/glance": "At a Glance",
  "/questions": "Questions",
};

export const roundButton =
  "inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-card text-primary shadow-[var(--card-shadow)] outline-none focus-visible:ring-2 focus-visible:ring-primary";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: trip } = useQuery(tripQueryOptions);
  // Header extras wait for the first client render so server and phone HTML match.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const data = mounted ? trip : undefined;
  const cvent = data ? cventUrl(data.briefing) : undefined;
  const pending = data ? data.questions.filter((q) => !q.done).length : 0;
  // Print and name-picking pages render without the app chrome.
  if (pathname.startsWith("/print") || pathname.startsWith("/pick-name")) {
    return <div className="min-h-screen bg-background">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-background pb-[calc(6rem+env(safe-area-inset-bottom))]">
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-1.5 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold tracking-[0.14em] text-subtle uppercase">
              LILApp · Venice
            </p>
            <h1 className="mt-0.5 truncate font-serif text-[1.65rem] leading-tight tracking-[0.06em] text-foreground uppercase">
              {TITLES[pathname] ?? "LILApp"}
            </h1>
          </div>
          <Link to="/glance" aria-label="At a Glance" title="At a Glance" className={roundButton}>
            <CalendarRange className="size-5" />
          </Link>
          {cvent ? (
            <a
              href={cvent}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Client App (Cvent)"
              title="Client App (Cvent)"
              className={roundButton}
            >
              <Smartphone className="size-5" />
            </a>
          ) : null}
          <UpdatesBell />
          <Link
            to="/questions"
            aria-label="Pending Questions"
            title="Pending Questions"
            className={`${roundButton} relative`}
          >
            <CircleHelp className="size-5" />
            {pending ? (
              <span className="absolute -top-1 -right-1 grid min-w-5 place-items-center rounded-full bg-primary px-1 text-[11px] font-semibold text-primary-foreground">
                {pending}
              </span>
            ) : null}
          </Link>
        </div>
        <OfflineBanner />
      </header>

      <main className="mx-auto max-w-2xl px-4 pt-4 pb-8">{children}</main>

      <nav
        aria-label="Main navigation"
        className="fixed inset-x-3 bottom-[max(env(safe-area-inset-bottom),0.75rem)] z-30 mx-auto max-w-2xl touch-manipulation rounded-full bg-sage p-1.5 shadow-[0_6px_18px_rgb(26_33_24/0.22)]"
      >
        <div className="flex">
          {tabs.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              preload="render"
              className="flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-full text-[10px] font-semibold tracking-[0.06em] text-foreground/75 uppercase select-none"
              activeOptions={{ exact: to === "/", includeSearch: false }}
              activeProps={{ className: "bg-white/60 text-foreground" }}
            >
              <Icon className="size-5" strokeWidth={1.9} aria-hidden />
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
