import { useEffect, useState, type ReactNode, type Ref } from "react";
import { ChevronRight } from "lucide-react";

import type { ActivityRow, ScheduleRow } from "@/lib/airtable.server";
import { normalizeName } from "@/lib/schedule";
import { formatTimeRange, parseTimeToMinutes } from "@/lib/time";
import { cn } from "@/lib/utils";
import { scheduleImages } from "@/lib/venice-images";
import { Block, Field, ImageStrip, NotesList } from "./ui";

/** Collapsed one-line version of a finished card: chevron, time, title. */
function PastLine({ time, title, onOpen }: { time: string; title: string; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-expanded="false"
      className="flex min-h-11 w-full items-center gap-3 py-2 text-left opacity-60"
    >
      <ChevronRight aria-hidden className="size-4 shrink-0 text-subtle" />
      <span className="ui-body shrink-0 font-semibold text-foreground">{time}</span>
      <span className="ui-body min-w-0 flex-1 truncate text-foreground">{title}</span>
    </button>
  );
}

function HideButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded="true"
      className="label-caps mb-2 flex min-h-8 items-center gap-1.5"
    >
      <ChevronRight aria-hidden className="size-3.5 rotate-90" />
      Hide
    </button>
  );
}

function DetailsToggle({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className="mt-2 -ml-1 flex min-h-11 items-center gap-1 px-1 text-sm font-medium text-primary"
    >
      <ChevronRight
        aria-hidden
        className={cn("size-4 transition-transform", open && "rotate-90")}
      />
      {open ? "Less" : "More"}
    </button>
  );
}

/** Past cards start collapsed and re-collapse when they become past. */
function usePastToggle(past: boolean) {
  const [open, setOpen] = useState(!past);
  useEffect(() => setOpen(!past), [past]);
  return [open, setOpen] as const;
}

function CardShell({
  setup,
  cardRef,
  children,
  className,
}: {
  setup?: boolean;
  cardRef?: Ref<HTMLElement>;
  children: ReactNode;
  className?: string;
}) {
  return (
    <article
      ref={cardRef}
      className={cn("scroll-mt-44 py-4", setup && "border-l-2 border-l-subtle/50 pl-3", className)}
    >
      {children}
    </article>
  );
}

function Times({ call, start, end }: { call?: string; start?: string; end?: string }) {
  const event = formatTimeRange(start, end);
  return (
    <div className="space-y-0.5">
      {call ? <Field label="Call" value={call} strong /> : null}
      {event ? <Field label="Event Time" value={event} strong /> : null}
    </div>
  );
}

function Names({ names }: { names: string[] }) {
  if (names.length === 0) return null;
  return <p className="ui-body mt-1.5 font-semibold text-foreground">{names.join(" · ")}</p>;
}

export function EventCard({
  row,
  setup,
  past,
  activity,
  cardRef,
}: {
  row: ScheduleRow;
  setup: boolean;
  past: boolean;
  activity?: ActivityRow;
  cardRef?: Ref<HTMLElement>;
}) {
  const [open, setOpen] = usePastToggle(past);
  const [details, setDetails] = useState(false);
  const images = scheduleImages(row.eventName);
  const hasDetails = Boolean(
    row.dressCode ||
    row.vipFocus ||
    row.notes ||
    row.photographyRequests ||
    row.decorToShoot ||
    activity ||
    images.length,
  );

  if (past && !open) {
    return (
      <CardShell setup={setup} cardRef={cardRef} className="py-0">
        <PastLine
          time={row.startTime || row.callTime}
          title={row.eventName || "Untitled"}
          onOpen={() => setOpen(true)}
        />
      </CardShell>
    );
  }

  return (
    <CardShell setup={setup} cardRef={cardRef} className={cn(past && "opacity-60")}>
      {past ? <HideButton onClick={() => setOpen(false)} /> : null}
      <Times call={row.callTime} start={row.startTime} end={row.endTime} />
      {setup || row.rush ? (
        <p className="label-caps mt-2.5">
          {setup ? "Setup" : null}
          {setup && row.rush ? " · " : null}
          {row.rush ? <span className="text-destructive">Rush</span> : null}
        </p>
      ) : null}
      <h3 className={cn("ui-item-title", setup || row.rush ? "mt-0.5" : "mt-2")}>
        {row.eventName || "Untitled"}
      </h3>
      {row.venue ? <p className="ui-body mt-0.5 text-foreground/80">{row.venue}</p> : null}
      <Names names={row.photographers} />
      {row.boatTransfer || row.departureSpot ? (
        <div className="mt-2 space-y-0.5">
          <Field label="Boat Transfer" value={row.boatTransfer} />
          <Field label="Departure Spot" value={row.departureSpot} />
        </div>
      ) : null}

      {hasDetails ? <DetailsToggle open={details} onToggle={() => setDetails((d) => !d)} /> : null}
      {details ? (
        <div className="mt-1 space-y-3">
          <Field label="Dress Code" value={row.dressCode} />
          <Field label="VIP Focus" value={row.vipFocus} />
          <Block label="Photography Requests" text={row.photographyRequests} />
          <Block label="Décor to Shoot" text={row.decorToShoot} />
          <Block label="Notes" text={row.notes} />
          {activity ? <ActivityFacts activity={activity} /> : null}
          <ImageStrip images={images} title="Décor & floor plans" />
        </div>
      ) : null}
    </CardShell>
  );
}

/** A Décor Advance becomes its own muted SETUP line ahead of the event. */
export function DecorCard({
  row,
  past,
  cardRef,
}: {
  row: ScheduleRow;
  past: boolean;
  cardRef?: Ref<HTMLElement>;
}) {
  const [open, setOpen] = usePastToggle(past);
  if (past && !open) {
    return (
      <CardShell setup cardRef={cardRef} className="py-0">
        <PastLine time="Setup" title={row.eventName} onOpen={() => setOpen(true)} />
      </CardShell>
    );
  }
  return (
    <CardShell setup cardRef={cardRef} className={cn(past && "opacity-60")}>
      {past ? <HideButton onClick={() => setOpen(false)} /> : null}
      <Field label="Décor Advance" value={row.decorAdvance} strong />
      <p className="label-caps mt-2.5">Setup</p>
      <h3 className="ui-item-title mt-0.5">{row.eventName}</h3>
      {row.venue ? <p className="ui-body mt-0.5 text-foreground/80">{row.venue}</p> : null}
    </CardShell>
  );
}

function ActivityFacts({ activity: a }: { activity: ActivityRow }) {
  return (
    <div className="space-y-0.5">
      <Field label="Run by" value={a.runBy} />
      <Field label="Getting there" value={a.gettingThere} />
      <Field label="Meeting point" value={a.meetingPoint} />
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

/** One activity: name, times, who runs it; tap for the rest. Covered activities open by default. */
export function ActivityCard({
  activity: a,
  defaultOpen,
}: {
  activity: ActivityRow;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen ?? covering(a));
  return (
    <article className="py-4">
      <Field label="Event Time" value={formatTimeRange(a.start, a.end)} strong />
      <h3 className="ui-item-title mt-1.5">{a.activity}</h3>
      <p className="ui-body mt-0.5 text-foreground/80">
        {[a.runBy, a.lilaCovering ? `LILA covering: ${a.lilaCovering}` : ""]
          .filter(Boolean)
          .join(" · ")}
      </p>
      <Names names={a.photographer ? [a.photographer] : []} />
      <DetailsToggle open={open} onToggle={() => setOpen((o) => !o)} />
      {open ? (
        <div className="mt-1 space-y-0.5">
          <Field label="Getting there" value={a.gettingThere} />
          <Field label="Meeting point" value={a.meetingPoint} />
          <Field label="Signed up" value={a.signedUp != null ? String(a.signedUp) : ""} />
          {a.notes ? <NotesList notes={a.notes} className="pt-2" /> : null}
        </div>
      ) : null}
    </article>
  );
}

/** Saturday's Activities table as one card that opens into each activity (Sabbatical's Excursions card). */
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
    <CardShell cardRef={cardRef} className={cn(past && "opacity-60")}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full text-left"
      >
        <Field label="Event Time" value={formatTimeRange(first, last)} strong />
        <div className="mt-2 flex items-center gap-2">
          <h3 className="ui-item-title min-w-0 flex-1">Activities</h3>
          <ChevronRight
            aria-hidden
            className={cn(
              "size-5 shrink-0 text-foreground transition-transform",
              open && "rotate-90",
            )}
          />
        </div>
        <p className="ui-body mt-0.5 text-foreground/80">
          {activities.length} {activities.length === 1 ? "activity" : "activities"}
          {covered ? ` · LILA covering ${covered}` : ""}
        </p>
      </button>
      {open ? (
        <ul className="mt-2 divide-y divide-border border-t border-border pl-3">
          {activities.map((a) => (
            <li key={a.id}>
              <ActivityCard activity={a} />
            </li>
          ))}
        </ul>
      ) : null}
    </CardShell>
  );
}
