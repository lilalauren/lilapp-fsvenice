import { ChevronRight, Gift } from "lucide-react";
import type { RoomDropRow } from "@/lib/airtable.server";

export function RoomDropCard({
  row,
  onOpen,
}: {
  row: RoomDropRow;
  onOpen?: () => void;
}) {
  const captured = row.captured;
  return (
    <button
      type="button"
      onClick={onOpen}
      className={[
        "group w-full rounded-lg border p-4 text-left transition-colors",
        captured
          ? "border-border bg-secondary/60 opacity-60"
          : "border-[#d6c48a] bg-[#f7efd0] hover:bg-[#f2e6bd]",
      ].join(" ")}
    >
      <div className="flex items-center gap-3">
        <Gift
          className={captured ? "h-5 w-5 shrink-0 text-subtle" : "h-5 w-5 shrink-0 text-[#8a6a1f]"}
          aria-hidden
          strokeWidth={2.25}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={[
                "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                captured
                  ? "bg-secondary text-subtle"
                  : "bg-[#8a6a1f] text-white",
              ].join(" ")}
            >
              Room Drop
            </span>
            <h3 className="min-w-0 flex-1 text-base font-semibold leading-tight text-foreground">
              {row.name}
            </h3>
          </div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            {row.location && <span>{row.location}</span>}
            {row.giftCategory && <span>· {row.giftCategory}</span>}
          </div>
          {captured ? (
            <p className="mt-1 text-xs font-medium text-foreground/70">
              Captured{row.capturedBy ? ` by ${row.capturedBy}` : ""}
            </p>
          ) : (
            <p className="mt-1 text-xs italic text-foreground/70">
              Capture anytime today · tap for details
            </p>
          )}
        </div>
        <ChevronRight
          className="h-6 w-6 shrink-0 self-center text-foreground"
          strokeWidth={3}
          aria-hidden
        />
      </div>
    </button>
  );
}
