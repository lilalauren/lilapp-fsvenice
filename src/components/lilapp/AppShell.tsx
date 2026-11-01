import type { ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { BookOpen, CalendarDays, CalendarRange, Compass, Shirt, Users } from "lucide-react";

import { useDisplayName } from "@/lib/use-display-name";
import { TIME_LABEL } from "@/lib/time";
import { OfflineBanner } from "./OfflineBanner";
import { UpdatesBell } from "./UpdatesBell";

const tabs = [
  { to: "/", label: "Schedule", icon: CalendarDays },
  { to: "/activities", label: "Activities", icon: Compass },
  { to: "/resume", label: "Resume", icon: Users },
  { to: "/lookbook", label: "Lookbook", icon: Shirt },
  { to: "/briefing", label: "Briefing", icon: BookOpen },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [name] = useDisplayName();
  // Print and name-picking pages render without the app chrome.
  if (pathname.startsWith("/print") || pathname.startsWith("/pick-name")) {
    return <div className="min-h-screen bg-background">{children}</div>;
  }
  const initial = name ? name.trim().charAt(0).toUpperCase() : "?";

  return (
    <div className="min-h-screen bg-background pb-[calc(4.25rem+env(safe-area-inset-bottom))]">
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto grid max-w-2xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5">
          <div className="min-w-0">
            <div
              className="font-serif text-[15px] leading-none font-semibold text-foreground uppercase"
              style={{ letterSpacing: "0.22em" }}
            >
              LILAPP
            </div>
            <div className="mt-1 truncate text-xs leading-tight text-muted-foreground">
              Four Seasons PPI EMEA Venice 2026
            </div>
            <div className="text-xs leading-tight text-muted-foreground italic">
              created by LILA PHOTO
            </div>
          </div>
          <div className="flex shrink-0 items-center">
            <Link
              to="/glance"
              aria-label="Program at a Glance"
              title="Program at a Glance"
              className="inline-flex size-11 items-center justify-center rounded-md text-subtle hover:bg-secondary hover:text-foreground"
              activeProps={{ className: "text-foreground" }}
            >
              <CalendarRange className="size-5" />
            </Link>
            <UpdatesBell />
            <Link
              to="/pick-name"
              aria-label={name ? `${name} — change name` : "Pick your name"}
              title={name ?? "Pick your name"}
              className="ml-1 inline-flex size-9 items-center justify-center rounded-full border border-border bg-secondary text-sm font-semibold text-foreground hover:border-primary"
            >
              {initial}
            </Link>
          </div>
        </div>
        <p className="mx-auto max-w-2xl border-t border-border px-4 py-1.5 text-xs text-muted-foreground">
          {TIME_LABEL}
        </p>
        <OfflineBanner />
      </header>

      <main className="mx-auto max-w-2xl px-4 pt-4 pb-8">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-30 touch-manipulation border-t border-border bg-background/95 pb-[max(env(safe-area-inset-bottom),0.25rem)] backdrop-blur">
        <div className="mx-auto flex max-w-2xl">
          {tabs.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              preload="render"
              className="flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] text-subtle select-none active:bg-accent"
              activeOptions={{ exact: to === "/", includeSearch: false }}
              activeProps={{ className: "font-semibold text-primary" }}
            >
              <Icon className="size-5" aria-hidden />
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
