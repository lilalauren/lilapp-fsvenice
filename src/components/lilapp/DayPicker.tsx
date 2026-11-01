import { Anchor, MapPin, Check, X } from "lucide-react";
import type { DayInfo } from "@/lib/schedule";
import { formatDateLong, todayISO } from "@/lib/time";
import { useEffect, useRef } from "react";

export function DayPicker({
  open,
  days,
  selected,
  includeAllDays,
  onSelect,
  onClose,
}: {
  open: boolean;
  days: DayInfo[];
  selected: string;
  includeAllDays?: boolean;
  onSelect: (d: string) => void;
  onClose: () => void;
}) {
  const todayRowRef = useRef<HTMLLIElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    // Anchor to current day when opened
    requestAnimationFrame(() => {
      todayRowRef.current?.scrollIntoView({ block: "center" });
    });
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;
  const today = todayISO();

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute inset-0 bg-foreground/30"
      />
      <div className="relative flex max-h-[80vh] w-full flex-col rounded-t-2xl border border-border bg-background shadow-2xl sm:max-w-md sm:rounded-2xl">
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold text-foreground">Pick a day</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-subtle hover:bg-secondary hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="overflow-y-auto">
          {days.length === 0 && (
            <p className="p-5 text-sm text-muted-foreground">No days yet.</p>
          )}
          <ul className="divide-y divide-border">
            {includeAllDays && (
              <li>
                <button
                  type="button"
                  onClick={() => {
                    onSelect("all");
                    onClose();
                  }}
                  className={[
                    "flex w-full items-center gap-3 px-5 py-3 text-left transition-colors",
                    selected === "all" ? "bg-accent" : "hover:bg-secondary",
                    "text-foreground",
                  ].join(" ")}
                >
                  <div className="flex-1">
                    <div className="text-sm font-medium">All days</div>
                    <div className="text-xs text-muted-foreground">
                      Show the entire schedule
                    </div>
                  </div>
                  {selected === "all" && (
                    <Check className="h-4 w-4 text-primary" aria-hidden />
                  )}
                </button>
              </li>
            )}
            {days.map((d) => {
              const past = d.date < today;
              const isToday = d.date === today;
              const active = d.date === selected;
              const Icon = d.atSea ? Anchor : MapPin;
              return (
                <li key={d.date} ref={isToday ? todayRowRef : undefined}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(d.date);
                      onClose();
                    }}
                    className={[
                      "flex w-full items-center gap-3 px-5 py-3 text-left transition-colors",
                      active ? "bg-accent" : "hover:bg-secondary",
                      past ? "opacity-50" : "",
                      past ? "text-subtle" : "text-foreground",
                    ].join(" ")}
                  >
                    <Icon
                      className={`h-4 w-4 shrink-0 ${d.atSea ? "text-subtle" : "text-primary"}`}
                      aria-hidden
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium">
                        {formatDateLong(d.date)}
                        {isToday && (
                          <span className="ml-2 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                            Today
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {d.portName ?? (d.atSea ? "At sea" : "")}
                      </div>
                    </div>
                    {past && <Check className="h-4 w-4 text-subtle" aria-hidden />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
