import { useEffect, useState, type ReactNode, type Ref } from "react";
import { createPortal } from "react-dom";
import { ChevronRight, FileText } from "lucide-react";

import type { ActivityRow, ScheduleRow } from "@/lib/airtable.server";
import { normalizeName } from "@/lib/schedule";
import { parseTimeToMinutes, shortRange, shortTime } from "@/lib/time";
import { cn } from "@/lib/utils";
import { scheduleImages, type VeniceImage } from "@/lib/venice-images";
import { Block, Field, ImageStrip, ImageViewer, NotesList } from "./ui";

/**
 * Sabbatical's time column: "Call | 6:45 am" over "Event | 7–10 pm",
 * small label, hairline divider, then the time.
 */
function TimeColumn({
  call,
  event,
  callLabel = "Call",
}: {
  call?: string;
  event?: string;
  callLabel?: string;
}) {
  if (!call && !event) return <div className="w-[7.25rem] shrink-0" />;
  // A long range wraps after the dash so it never runs into the event name.
  const line = (label: string, value: string, strong: boolean) => {
    const [from, to] = value.split("–");
    return (
      <div className="flex items-baseline gap-2">
        <span className="w-9 shrink-0 text-right text-[11px] text-subtle">{label}</span>
        <span className="h-3 w-px shrink-0 self-center bg-border" />
        <span
          className={cn(
            "text-[14px] leading-tight whitespace-nowrap tabular-nums",
            strong ? "font-semibold text-foreground" : "text-muted-foreground",
          )}
        >
          {from}
          {to ? (
            <>
              –<br />
              {to}
            </>
          ) : null}
        </span>
      </div>
    );
  };
  return (
    <div className="w-[7.25rem] shrink-0 space-y-1 pt-1 select-none">
      {call ? line(callLabel, call, true) : null}
      {event ? line("Event", event, !call) : null}
    </div>
  );
}

/** Past cards start collapsed and re-collapse when they become past. */
function usePastToggle(past: boolean) {
  const [open, setOpen] = useState(!past);
  useEffect(() => setOpen(!past), [past]);
  return [open, setOpen] as const;
}

/** Details open/closed, following the page's "Expand all" when it changes. */
function useDetails(expandAll?: boolean) {
  const [open, setOpen] = useState(Boolean(expandAll));
  useEffect(() => {
    if (expandAll !== undefined) setOpen(expandAll);
  }, [expandAll]);
  return [open, setOpen] as const;
}

/** One-line version of a finished card: chevron, time, title. */
function PastLine({
  time,
  title,
  onOpen,
  cardRef,
}: {
  time: string;
  title: string;
  onOpen: () => void;
  cardRef?: Ref<HTMLElement>;
}) {
  return (
    <article ref={cardRef} className="card scroll-mt-44 opacity-60">
      <button
        type="button"
        onClick={onOpen}
        aria-expanded="false"
        className="flex min-h-12 w-full items-center gap-3 px-4 py-2 text-left"
      >
        <ChevronRight aria-hidden className="size-4 shrink-0 text-subtle" />
        <span className="ui-body shrink-0 font-semibold text-foreground">{time}</span>
        <span className="ui-body min-w-0 flex-1 truncate text-foreground">{title}</span>
      </button>
    </article>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <ChevronRight
      aria-hidden
      className={cn(
        "size-6 shrink-0 self-center text-primary transition-transform",
        open && "rotate-90",
      )}
      strokeWidth={2.5}
    />
  );
}

/** Panattoni's BEO-number chip, for the deck's floor plans: one tap opens the zoom viewer. */
function FloorPlanChip({ plans }: { plans: VeniceImage[] }) {
  const [open, setOpen] = useState<VeniceImage | null>(null);
  if (plans.length === 0) return null;
  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(plans[0]!);
        }}
        className="mt-2 inline-flex min-h-9 items-center gap-1.5 rounded-full bg-secondary px-3 text-sm font-semibold text-primary"
      >
        <FileText className="size-4" aria-hidden />
        {plans.length > 1 ? `Floor plans · ${plans.length}` : "Floor plan"}
      </button>
      {open
        ? createPortal(<ImageViewer image={open} onClose={() => setOpen(null)} />, document.body)
        : null}
    </>
  );
}

export function EventCard({
  row,
  setup,
  past,
  activity,
  expandAll,
  cardRef,
}: {
  row: ScheduleRow;
  setup: boolean;
  past: boolean;
  activity?: ActivityRow;
  expandAll?: boolean;
  cardRef?: Ref<HTMLElement>;
}) {
  const [shown, setShown] = usePastToggle(past);
  const [open, setOpen] = useDetails(expandAll);
  const images = scheduleImages(row.eventName);
  const plans = images.filter((i) => /^floor plan/i.test(i.caption));
  const callText = shortTime(row.callTime);
  const hasDetails = Boolean(
    row.boatTransfer ||
    row.departureSpot ||
    row.dressCode ||
    row.vipFocus ||
    row.notes ||
    row.photographyRequests ||
    row.decorToShoot ||
    activity ||
    images.length ||
    callText !== row.callTime,
  );

  if (past && !shown) {
    return (
      <PastLine
        cardRef={cardRef}
        time={shortTime(row.startTime || row.callTime)}
        title={row.eventName || "Untitled"}
        onOpen={() => setShown(true)}
      />
    );
  }

  return (
    <article
      ref={cardRef}
      className={cn(
        "card scroll-mt-44",
        setup && "border-l-4 border-l-sage-line",
        past && "opacity-60",
      )}
    >
      <button
        type="button"
        onClick={() => (hasDetails ? setOpen((o) => !o) : past && setShown(false))}
        aria-expanded={open}
        className="flex w-full items-start gap-3 p-4 text-left"
      >
        <TimeColumn call={callText} event={shortRange(row.startTime, row.endTime)} />
        <div className="min-w-0 flex-1">
          {setup || row.rush ? (
            <p className="ui-label mb-0.5 text-[11px]">
              {setup ? "Setup" : null}
              {setup && row.rush ? " · " : null}
              {row.rush ? <span className="text-destructive">Rush</span> : null}
            </p>
          ) : null}
          <h3 className="text-[17px] leading-snug font-semibold text-foreground">
            {row.eventName || "Untitled"}
          </h3>
          {row.venue ? (
            <p className="mt-0.5 text-[15px] leading-snug text-muted-foreground">{row.venue}</p>
          ) : null}
          {row.photographers.length ? (
            <p className="mt-1 text-sm font-semibold text-primary">
              {row.photographers.join(" · ")}
            </p>
          ) : null}
        </div>
        {hasDetails ? <Chevron open={open} /> : null}
      </button>
      {plans.length && !open ? (
        <div className="-mt-2 px-4 pb-3 pl-[9rem]">
          <FloorPlanChip plans={plans} />
        </div>
      ) : null}
      {open ? (
        <div className="space-y-3 border-t border-border px-4 pt-3 pb-4">
          {callText !== row.callTime ? <Field label="Call" value={row.callTime} /> : null}
          {row.boatTransfer || row.departureSpot ? (
            <div className="space-y-0.5">
              <Field label="Boat Transfer" value={row.boatTransfer} />
              <Field label="Departure Spot" value={row.departureSpot} />
            </div>
          ) : null}
          <Field label="Dress Code" value={row.dressCode} />
          <Field label="VIP Focus" value={row.vipFocus} />
          <Block label="Briefing" text={row.notes} />
          <Block label="Coverage Requirements" text={row.photographyRequests} />
          <Block label="Décor to Shoot" text={row.decorToShoot} />
          {activity ? <ActivityFacts activity={activity} /> : null}
          <ImageStrip images={images} title="Décor & floor plans" />
          {past ? (
            <button
              type="button"
              onClick={() => setShown(false)}
              className="ui-label min-h-9 text-[11px]"
            >
              Hide
            </button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

/** A Décor Advance becomes its own muted SETUP card ahead of the event. */
export function DecorCard({
  row,
  past,
  cardRef,
}: {
  row: ScheduleRow;
  past: boolean;
  cardRef?: Ref<HTMLElement>;
}) {
  const [shown, setShown] = usePastToggle(past);
  if (past && !shown) {
    return (
      <PastLine
        cardRef={cardRef}
        time="Setup"
        title={row.eventName}
        onOpen={() => setShown(true)}
      />
    );
  }
  const time = shortTime(row.decorAdvance);
  return (
    <article
      ref={cardRef}
      className={cn("card scroll-mt-44 border-l-4 border-l-sage-line", past && "opacity-60")}
    >
      <div className="flex items-start gap-3 p-4">
        <TimeColumn call={time.length <= 9 ? time : "See note"} callLabel="Décor" />
        <div className="min-w-0 flex-1">
          <p className="ui-label mb-0.5 text-[11px]">Setup</p>
          <h3 className="text-[17px] leading-snug font-semibold text-foreground">
            {row.eventName}
          </h3>
          <p className="mt-0.5 text-[15px] leading-snug text-muted-foreground">
            Décor Advance: {row.decorAdvance}
          </p>
        </div>
      </div>
    </article>
  );
}

function ActivityFacts({ activity: a }: { activity: ActivityRow }) {
  return (
    <div className="space-y-0.5">
      <Field label="Run by" value={a.runBy} />
      <Field label="Meeting point" value={a.meetingPoint} />
      <Field label="Getting there" value={a.gettingThere} />
      <Field label="Signed up" value={a.signedUp != null ? String(a.signedUp) : ""} />
      <Field label="LILA covering" value={a.lilaCovering} />
      {a.notes ? (
        <div className="pt-2">
          <Block label="Activities notes" text={a.notes} />
        </div>
      ) : null}
    </div>
  );
}

const covering = (a: ActivityRow) => normalizeName(a.lilaCovering) === "yes";

/** Sabbatical's sage card for each activity: time, name, who runs it; tap for the rest. */
export function ActivityCard({
  activity: a,
  expandAll,
  tone = "sage",
}: {
  activity: ActivityRow;
  expandAll?: boolean;
  tone?: "sage" | "white";
}) {
  const [open, setOpen] = useDetails(expandAll);
  return (
    <article
      className={cn(
        "rounded-[13px]",
        tone === "sage"
          ? "border border-sage-line bg-sage-card"
          : "border border-sage-line bg-card",
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-start gap-3 p-4 text-left"
      >
        <TimeColumn event={shortRange(a.start, a.end)} />
        <div className="min-w-0 flex-1">
          {covering(a) ? <p className="ui-label mb-0.5 text-[11px]">LILA covering</p> : null}
          <h3 className="text-[17px] leading-snug font-semibold text-foreground">{a.activity}</h3>
          {a.runBy ? (
            <p className="mt-0.5 text-[15px] leading-snug text-foreground/75">{a.runBy}</p>
          ) : null}
          {a.photographer ? (
            <p className="mt-1 text-sm font-semibold text-primary">{a.photographer}</p>
          ) : null}
        </div>
        <Chevron open={open} />
      </button>
      {open ? (
        <div className="space-y-0.5 border-t border-sage-line px-4 pt-3 pb-4">
          <Field label="Meeting point" value={a.meetingPoint} />
          <Field label="Getting there" value={a.gettingThere} />
          <Field label="Signed up" value={a.signedUp != null ? String(a.signedUp) : ""} />
          <Field label="LILA covering" value={a.lilaCovering} />
          {a.notes ? <NotesList notes={a.notes} className="pt-2" /> : null}
        </div>
      ) : null}
    </article>
  );
}

/** Saturday's Activities table as one sage card that opens into each activity (Sabbatical's Excursions card). */
export function ActivitiesGroupCard({
  activities,
  past,
  cardRef,
}: {
  activities: ActivityRow[];
  past: boolean;
  cardRef?: Ref<HTMLElement>;
}) {
  const [open, setOpen] = useState(false);
  const starts = activities.map((a) => parseTimeToMinutes(a.start) ?? Infinity);
  const ends = activities.map((a) => parseTimeToMinutes(a.end) ?? -Infinity);
  const first = activities[starts.indexOf(Math.min(...starts))]?.start;
  const last = activities[ends.indexOf(Math.max(...ends))]?.end;
  const covered = activities.filter(covering).length;
  return (
    <article
      ref={cardRef}
      className={cn(
        "scroll-mt-44 rounded-[13px] border border-sage-line bg-sage-card",
        past && "opacity-60",
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-start gap-3 p-4 text-left"
      >
        <TimeColumn event={shortRange(first, last)} />
        <div className="min-w-0 flex-1">
          <span className="inline-block rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold tracking-wide text-primary-foreground uppercase">
            Activities
          </span>
          <h3 className="mt-1 text-[17px] leading-snug font-semibold text-foreground">
            {activities.length} {activities.length === 1 ? "activity" : "activities"}
            {covered ? ` · LILA covering ${covered}` : ""}
          </h3>
          <p className="mt-0.5 text-sm text-foreground/75 italic">
            tap for breakdown of activities
          </p>
        </div>
        <Chevron open={open} />
      </button>
      {open ? (
        <ul className="space-y-2 border-t border-sage-line p-3">
          {activities.map((a) => (
            <li key={a.id}>
              <ActivityCard activity={a} tone="white" />
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}

/** Panattoni's collapsible section: title, count and chevron; starts closed. */
export function Section({
  title,
  count,
  open,
  onToggle,
  children,
}: {
  title: string;
  count?: number;
  open: boolean;
  onToggle: (open: boolean) => void;
  children: ReactNode;
}) {
  return (
    <section className="border-b border-border">
      <button
        type="button"
        onClick={() => onToggle(!open)}
        aria-expanded={open}
        className="flex min-h-14 w-full items-center gap-2 text-left"
      >
        <span className="ui-label min-w-0 flex-1">{title}</span>
        {count !== undefined ? <span className="ui-label">{count}</span> : null}
        <ChevronRight
          aria-hidden
          className={cn(
            "size-5 text-primary transition-transform",
            open ? "-rotate-90" : "rotate-90",
          )}
        />
      </button>
      {open ? <div className="space-y-3 pb-4">{children}</div> : null}
    </section>
  );
}

/** "Expand all" / "Collapse all" link, top right like Panattoni. */
export function ExpandAll({ allOpen, onClick }: { allOpen: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="ui-label min-h-11 px-1">
      {allOpen ? "Collapse all" : "Expand all"}
    </button>
  );
}
