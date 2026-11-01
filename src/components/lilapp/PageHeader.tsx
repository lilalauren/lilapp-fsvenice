import { ChevronDown, Luggage, Plane } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { formatDayShort } from "@/lib/time";
import brandLogo from "@/assets/northern-crossing-circle.png.asset.json";

export function PageHeader({
  displayName,
  dateISO,
  dateLabelOverride,
  portLabel,
  onOpenDayPicker,
  activeTab,
  currentDay,
}: {
  displayName: string | null;
  dateISO: string;
  dateLabelOverride?: string;
  portLabel?: string;
  onOpenDayPicker?: () => void;
  activeTab: "mine" | "full";
  currentDay?: string;
}) {
  const initial = displayName ? displayName.trim().charAt(0).toUpperCase() : "?";
  const dayLabel = dateLabelOverride ?? (dateISO ? formatDayShort(dateISO) : "");
  const isAllDays = dateLabelOverride?.toLowerCase().startsWith("all");
  return (
    <header
      className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur"
      style={{ ["--print-brand-url" as string]: `url(${brandLogo.url})` }}
    >
      <div className="mx-auto grid max-w-2xl grid-cols-[minmax(0,1fr)_auto] items-start gap-3 px-4 py-3">
        <div className="min-w-0">
          <div
            className="font-serif text-[15px] font-semibold uppercase leading-none text-foreground"
            style={{ letterSpacing: "0.22em" }}
          >
            LILAPP
          </div>
          <div className="mt-1 text-[11px] leading-tight text-muted-foreground">
            Sabbatical 2026 · Event Operations
          </div>
          <div className="text-[11px] italic leading-tight text-muted-foreground">
            created by LILA PHOTO
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Link
            to="/packing"
            aria-label="Packing guide"
            className="rounded-md p-2 text-subtle hover:bg-secondary hover:text-foreground"
          >
            <Luggage className="h-5 w-5" />
          </Link>
          <Link
            to="/travel"
            aria-label="Travel"
            className="rounded-md p-2 text-subtle hover:bg-secondary hover:text-foreground"
          >
            <Plane className="h-4 w-4" />
          </Link>
          <Link
            to="/pick-name"
            className="ml-1 inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-secondary text-sm font-semibold text-foreground hover:border-primary"
            aria-label={displayName ?? "Change name"}
            title={displayName ?? "Change name"}
          >
            {initial}
          </Link>
        </div>
      </div>

      <div className="mx-auto flex max-w-2xl flex-wrap items-center gap-x-2 gap-y-2 border-t border-border px-4 py-2">
        {onOpenDayPicker && dayLabel && (
          <button
            type="button"
            onClick={onOpenDayPicker}
            className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border border-primary/60 bg-accent/50 px-2.5 py-1 text-left hover:border-primary hover:bg-accent"
          >
            <span className="flex flex-col leading-tight">
              <span className="text-sm font-semibold tracking-wide text-foreground">
                {dayLabel}
              </span>
              {!isAllDays && portLabel && (
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {portLabel}
                </span>
              )}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-subtle" aria-hidden />
          </button>
        )}
        <nav className="-mb-px flex items-center gap-1">
          <TabLink
            to="/schedule/full"
            active={activeTab === "full"}
            search={{ day: currentDay ?? "", filter: "" }}
          >
            Full Schedule
          </TabLink>
          <TabLink
            to="/schedule/mine"
            active={activeTab === "mine"}
            search={{ day: currentDay && currentDay !== "all" ? currentDay : "" }}
          >
            My Schedule
          </TabLink>
        </nav>
      </div>
    </header>
  );
}

function TabLink({
  to,
  active,
  search,
  children,
}: {
  to: "/schedule/mine" | "/schedule/full";
  active: boolean;
  search?: Record<string, string>;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      search={search as never}
      className={[
        "border-b-2 px-2.5 py-1.5 text-sm font-medium transition-colors",
        active
          ? "border-primary text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground",
      ].join(" ")}
    >
      {children}
    </Link>
  );
}
