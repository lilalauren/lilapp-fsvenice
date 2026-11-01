import type { ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { BookOpen, CalendarDays, CalendarRange, Compass, Shirt, UserRound } from "lucide-react";

import { useDisplayName } from "@/lib/use-display-name";
import { OfflineBanner } from "./OfflineBanner";
import { UpdatesBell } from "./UpdatesBell";

const tabs = [
  { to: "/", label: "Schedule", icon: CalendarDays },
  { to: "/activities", label: "Activities", icon: Compass },
  { to: "/resume", label: "Resume", icon: UserRound },
  { to: "/lookbook", label: "Lookbook", icon: Shirt },
  { to: "/briefing", label: "Briefing", icon: BookOpen },
] as const;

const TITLES: Record<string, string> = {
  "/": "Schedule",
  "/activities": "Activities",
  "/resume": "Resume",
  "/lookbook": "Lookbook",
  "/briefing": "Briefing",
  "/glance": "Program at a Glance",
};

export const roundButton =
  "inline-flex size-11 items-center justify-center rounded-full bg-card text-primary shadow-[var(--card-shadow)]";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [name] = useDisplayName();
  // Print and name-picking pages render without the app chrome.
  if (pathname.startsWith("/print") || pathname.startsWith("/pick-name")) {
    return <div className="min-h-screen bg-background">{children}</div>;
  }
  const initial = name ? name.trim().charAt(0).toUpperCase() : "?";

  return (
    <div className="min-h-screen bg-background pb-[calc(6rem+env(safe-area-inset-bottom))]">
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-2 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold tracking-[0.14em] text-subtle uppercase">
              LILApp · PPI EMEA Venice
            </p>
            <h1 className="mt-0.5 truncate font-serif text-[1.65rem] leading-tight tracking-[0.06em] text-foreground uppercase">
              {TITLES[pathname] ?? "LILApp"}
            </h1>
          </div>
          <Link to="/glance" aria-label="Program at a Glance" className={roundButton}>
            <CalendarRange className="size-5" />
          </Link>
          <UpdatesBell />
          <Link
            to="/pick-name"
            aria-label={name ? `${name} — change name` : "Pick your name"}
            className={`${roundButton} font-semibold`}
          >
            {initial}
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
