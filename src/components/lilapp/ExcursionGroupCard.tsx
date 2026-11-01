import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { ExcursionAssignRow } from "@/lib/airtable.server";
import { AssigneePills } from "./AssigneePills";
import { CallEventTimes } from "./CallEventTimes";

type Props = {
  portName?: string;
  excursions: ExcursionAssignRow[];
  onOpenActivity: (ex: ExcursionAssignRow) => void;
  initiallyOpen?: boolean;
};

export function ExcursionGroupCard({
  portName,
  excursions,
  onOpenActivity,
  initiallyOpen = false,
}: Props) {
  const [open, setOpen] = useState(initiallyOpen);
  const title = `${(portName ?? "Port").replace(/\s*&\s*/g, " & ")} Excursions`;
  return (
    <div className="rounded-lg border border-[#8fa889] bg-[#c4d4bd]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-start gap-3 rounded-lg p-4 text-left transition-colors hover:bg-[#b8cbb0]"
        aria-expanded={open}
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#3a4a3a] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
              Excursions
            </span>
            <h3 className="text-base font-semibold leading-tight text-foreground">
              {title}
            </h3>
          </div>
          <p className="mt-1 text-xs italic text-foreground/75">
            click for breakdown of activities
          </p>
        </div>
        {open ? (
          <ChevronDown
            className="h-6 w-6 shrink-0 self-center text-foreground"
            strokeWidth={3}
          />
        ) : (
          <ChevronRight
            className="h-6 w-6 shrink-0 self-center text-foreground"
            strokeWidth={3}
          />
        )}
      </button>

      {open && (
        <ul className="space-y-2 border-t border-[#8fa889] px-3 pb-3 pt-3">
          {excursions.length === 0 ? (
            <li className="px-1 py-1 text-xs text-foreground/70">
              No activities found for this day.
            </li>
          ) : (
            excursions.map((ex) => {
              return (
                <li key={ex.id}>
                  <button
                    type="button"
                    onClick={() => onOpenActivity(ex)}
                    className="group flex w-full items-start gap-2 rounded-md border border-[#8fa889] bg-background/90 px-3 py-2.5 text-left transition-colors hover:border-primary hover:bg-background"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold leading-snug text-foreground">
                        {ex.excursion ?? "Excursion"}
                      </p>
                      {(ex.callTime || ex.busDepartureTime || ex.arrivalBackAtPort) && (
                        <div className="mt-1.5">
                          <CallEventTimes
                            callTime={ex.callTime}
                            startTime={ex.busDepartureTime}
                            endTime={ex.arrivalBackAtPort}
                          />
                        </div>
                      )}
                      {ex.photographers.length > 0 && (
                        <div className="mt-2">
                          <AssigneePills names={ex.photographers} />
                        </div>
                      )}
                    </div>
                    <ChevronRight
                      className="h-6 w-6 shrink-0 self-center text-foreground"
                      strokeWidth={3}
                      aria-hidden
                    />
                  </button>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
