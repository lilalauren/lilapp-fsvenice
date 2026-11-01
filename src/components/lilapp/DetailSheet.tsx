import { X } from "lucide-react";
import type { AgendaRow, ExcursionAssignRow } from "@/lib/airtable.server";
import { CallEventTimes } from "./CallEventTimes";
import { TimelineList } from "./TimelineList";
import { AssigneePills } from "./AssigneePills";
import { AttireBlock } from "./AttireBlock";
import { AttachmentGallery } from "./AttachmentGallery";

import { isPortExcursionRow } from "@/lib/schedule";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type ExcursionGroup = {
  key: string;
  name: string;
  sample: ExcursionAssignRow;
  rows: ExcursionAssignRow[];
};

function groupExcursions(list: ExcursionAssignRow[]): ExcursionGroup[] {
  const map = new Map<string, ExcursionGroup>();
  for (const ex of list) {
    const key = (ex.excursion ?? ex.id).trim().toLowerCase();
    const g = map.get(key);
    if (g) g.rows.push(ex);
    else map.set(key, { key, name: ex.excursion ?? "Excursion", sample: ex, rows: [ex] });
  }
  return Array.from(map.values());
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section>
      <h4 className="label-caps mb-1.5">{label}</h4>
      <div className="whitespace-pre-wrap text-sm leading-snug text-foreground/90">{children}</div>
    </section>
  );
}

export function DetailSheet({
  row,
  excursions,
  onClose,
}: {
  row: AgendaRow | null;
  excursions?: ExcursionAssignRow[];
  onClose: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [showBottomFade, setShowBottomFade] = useState(false);
  const updateBottomFade = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setShowBottomFade(el.scrollTop + el.clientHeight < el.scrollHeight - 2);
  }, []);

  useEffect(() => {
    if (!row) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [row, onClose]);
  useEffect(() => {
    if (!row) return;
    const el = scrollRef.current;
    if (!el) return;
    updateBottomFade();
    const frame = window.requestAnimationFrame(updateBottomFade);
    const observer = new ResizeObserver(updateBottomFade);
    observer.observe(el);
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [row, excursions, updateBottomFade]);


  const isExcursion = row ? isPortExcursionRow(row) : false;
  const titleClean = row
    ? isExcursion
      ? row.eventName.replace(/^\s*port\s*:\s*/i, "").trim()
      : row.eventName
    : "";
  const excursionGroups = useMemo(
    () => groupExcursions(excursions ?? []),
    [excursions],
  );
  if (!row) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-3 pb-[8svh] pt-[12svh] sm:items-center sm:py-[6svh]">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="fixed inset-0 bg-foreground/30 backdrop-blur-[1px]"
      />
      <div className="relative flex min-h-0 max-h-[80svh] w-full flex-col rounded-2xl border border-border bg-background shadow-2xl sm:max-h-[82svh] sm:max-w-lg">

        {/* Fixed header */}
        <header className="shrink-0 border-b border-border px-5 pb-4 pt-4">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {isExcursion && (
                  <span className="rounded-full bg-[#d9e4d4] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#3a4a3a]">
                    Excursions
                  </span>
                )}
                <h2 className="text-lg font-semibold leading-tight text-foreground">
                  {titleClean}
                </h2>
              </div>
              {row.location && (
                <p className="mt-0.5 text-sm text-muted-foreground">{row.location}</p>
              )}
              {isExcursion && (
                <p className="mt-1 text-xs italic text-muted-foreground">
                  Each activity below has its own call time and assigned photographer.
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-0.5 text-subtle hover:bg-secondary hover:text-foreground"
              aria-label="Close details"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex items-start justify-between gap-3">
            <CallEventTimes
              callTime={row.callTime}
              startTime={row.startTime}
              endTime={row.endTime}
            />
            {row.assignedPhotographers.length > 0 && (
              <section className="flex min-w-0 shrink-0 items-center justify-end gap-2 text-right">
                <h4 className="label-caps">Assigned</h4>
                <div className="flex justify-end">
                  <AssigneePills names={row.assignedPhotographers} max={99} />
                </div>
              </section>
            )}
          </div>
        </header>

        {/* Scrollable body */}
        <div className="relative min-h-0 flex-1 overflow-hidden">
        <div
          ref={scrollRef}
          onScroll={updateBottomFade}
          className="h-full space-y-5 overflow-y-auto px-5 pb-[calc(env(safe-area-inset-bottom)+2rem)] pt-5"
        >
          {row.whereToGo && <Section label="Where to Go">{row.whereToGo}</Section>}
          {row.coverageRequirements && (
            <Section label="Coverage Requirements">{row.coverageRequirements}</Section>
          )}
          <AttireBlock attire={row.attire} details={row.attireDetails} />
          {row.equipmentNeeds && <Section label="Equipment">{row.equipmentNeeds}</Section>}
          {row.eventTimeline && (
            <section>
              <h4 className="label-caps mb-2">Event Timeline</h4>
              <TimelineList raw={row.eventTimeline} />
            </section>
          )}

          {excursionGroups.length > 0 && (
            <section className="space-y-4 border-t border-border pt-5">
              <h4 className="label-caps">
                {isExcursion ? "Activities" : "Excursion Details"}
              </h4>
              {excursionGroups.map((g) => {
                const s = g.sample;
                return (
                  <div
                    key={g.key}
                    className="rounded-md border border-[#c7d0c7] bg-[#eef2ec] p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-[#d9e4d4] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#3a4a3a]">
                            Excursion
                          </span>
                          <p className="text-sm font-semibold text-foreground">
                            {g.name}
                          </p>
                        </div>
                      </div>
                      {s.guestCount && (
                        <span className="shrink-0 rounded-full border border-border bg-background px-2 py-0.5 text-[11px] text-muted-foreground">
                          {s.guestCount} guests
                        </span>
                      )}
                    </div>

                    <div className="mt-3 space-y-1.5">
                      {g.rows.map((ex) => {
                        const names =
                          ex.photographers.length > 0
                            ? ex.photographers.join(", ")
                            : "Unassigned";
                        return (
                          <div
                            key={ex.id}
                            className="rounded-sm bg-background/60 px-2 py-1.5 text-xs"
                          >
                            <div className="font-medium text-foreground">{names}</div>
                          </div>
                        );
                      })}
                    </div>

                    {s.activityOverview && (
                      <div className="mt-3">
                        <h5 className="label-caps mb-1.5">Activity Overview</h5>
                        <p className="whitespace-pre-wrap text-sm text-foreground/90">
                          {s.activityOverview}
                        </p>
                      </div>
                    )}
                    {s.photographyNotes && (
                      <div className="mt-3">
                        <h5 className="label-caps">Photo Notes</h5>
                        <p className="whitespace-pre-wrap text-sm text-foreground/90">
                          {s.photographyNotes}
                        </p>
                      </div>
                    )}
                    {s.activityTimeline && (
                      <div className="mt-3">
                        <h5 className="label-caps mb-1.5">Timeline</h5>
                        <TimelineList raw={s.activityTimeline} />
                      </div>
                    )}
                    {s.vvipAttendees && (
                      <div className="mt-3">
                        <h5 className="label-caps">VVIP</h5>
                        <p className="whitespace-pre-wrap text-sm text-foreground/90">
                          {s.vvipAttendees}
                        </p>
                      </div>
                    )}
                    {s.travelInformation && (
                      <div className="mt-3">
                        <h5 className="label-caps">Travel</h5>
                        <p className="whitespace-pre-wrap text-sm text-foreground/80">
                          {s.travelInformation}
                        </p>
                      </div>
                    )}
                    {s.attachments && s.attachments.length > 0 && (
                      <div className="mt-3">
                        <h5 className="label-caps mb-2">Reference images</h5>
                        <AttachmentGallery items={s.attachments} />
                      </div>
                    )}
                  </div>
                );
              })}
            </section>
          )}
        </div>
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-x-0 bottom-0 h-4 bg-gradient-to-t from-background to-transparent transition-opacity ${showBottomFade ? "opacity-100" : "opacity-0"}`}
        />
        </div>
      </div>

    </div>
  );
}
