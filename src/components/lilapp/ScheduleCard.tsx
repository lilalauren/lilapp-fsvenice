import { ChevronRight } from "lucide-react";
import type { AgendaRow } from "@/lib/airtable.server";
import { AssigneePills } from "./AssigneePills";
import { CallEventTimes } from "./CallEventTimes";
import { isEventPast } from "@/lib/time";
import { isPortExcursionRow } from "@/lib/schedule";

export type ScheduleCardProps = {
  row: AgendaRow;
  active?: boolean; // Happening Now
  showAssignees?: boolean;
  onOpen?: () => void;
};

export function ScheduleCard({ row, active, showAssignees, onOpen }: ScheduleCardProps) {
  const past = !active && isEventPast(row);
  const isExcursion = isPortExcursionRow(row);
  const title = isExcursion
    ? row.eventName.replace(/^\s*port\s*:\s*/i, "").trim()
    : row.eventName;
  return (
    <button
      type="button"
      onClick={onOpen}
      className={[
        "group w-full rounded-lg border p-4 text-left transition-colors",
        isExcursion
          ? "border-[#8fa889] bg-[#c4d4bd] hover:bg-[#b8cbb0]"
          : active
            ? "border-primary bg-accent"
            : "border-border bg-card hover:border-primary/40 hover:bg-accent/40",
        past ? "opacity-40" : "",
      ].join(" ")}
    >
      <div className="flex items-center gap-4">
        {!isExcursion && (
          <CallEventTimes
            callTime={row.callTime}
            startTime={row.startTime}
            endTime={row.endTime}
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start gap-x-2 gap-y-1">
            {isExcursion && (
              <span className="rounded-full bg-[#3a4a3a] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                Excursion
              </span>
            )}
            <h3 className="min-w-0 flex-1 text-base font-semibold leading-tight text-foreground">
              {title}
            </h3>
          </div>
          {row.location && !isExcursion && (
            <p className="mt-0.5 text-sm leading-snug text-muted-foreground">{row.location}</p>
          )}
          {isExcursion && (
            <p className="mt-1 text-xs italic text-foreground/70">
              click for breakdown of activities
            </p>
          )}
          {showAssignees && !isExcursion && row.assignedPhotographers.length > 0 && (
            <div className="mt-2">
              <AssigneePills names={row.assignedPhotographers} />
            </div>
          )}
        </div>
        <ChevronRight
          className="h-7 w-7 shrink-0 self-center text-foreground"
          strokeWidth={3}
          aria-hidden
        />
      </div>
    </button>
  );
}
