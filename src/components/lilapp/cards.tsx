import { useEffect, useState, type ReactNode, type Ref } from "react";
import { createPortal } from "react-dom";
import { ChevronRight, Map } from "lucide-react";

import type { ActivityRow, ScheduleRow } from "@/lib/airtable.server";
import { hasDecorCard, normalizeName } from "@/lib/schedule";
import { parseTimeToMinutes, shortRange, shortTime } from "@/lib/time";
import { cn } from "@/lib/utils";
import { scheduleImages, type VeniceImage } from "@/lib/venice-images";
import { Block, Field, ImageViewer, NotesList } from "./ui";

/**
 * Sabbatical's times: "Call | 6:15 pm" stacked over "Event | 7–10 pm", at the top
 * of the card; everything else sits underneath, left-aligned, full width.
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
  if (!call && !event) return null;
  const line = (label: string, value: string) => {
    const [from, to] = value.split("–");
    return (
      <div className="flex items-baseline gap-1.5">
        <span className="w-10 shrink-0 text-[11px] text-subtle">{label}</span>
        <span className="h-3 w-px shrink-0 self-center bg-border" />
        <span className="text-[14px] leading-tight font-semibold text-foreground tabular-nums">
          <span className="whitespace-nowrap">
            {from}
            {to ? "–" : ""}
          </span>
          {to ? (
            <>
              <wbr />
              <span className="whitespace-nowrap">{to}</span>
            </>
          ) : null}
        </span>
      </div>
    );
  };
  return (
    <div className="space-y-1 select-none">
      {call ? line(callLabel, call) : null}
      {event ? line("Event", event) : null}
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

/**
 * Small pills at the card's bottom right: the deck's décor renders and its floor plans.
 * Each opens the full-screen viewer, fitted to the phone's width.
 */
function MediaButtons({ decor, plans }: { decor: VeniceImage[]; plans: VeniceImage[] }) {
  const [open, setOpen] = useState<VeniceImage[] | null>(null);
  if (decor.length === 0 && plans.length === 0) return null;
  const pill =
    "inline-flex min-h-9 items-center gap-1.5 rounded-full bg-secondary pr-3 pl-1.5 text-[13px] font-semibold text-primary";
  return (
    <div className="flex justify-end gap-2 px-4 pb-3">
      {decor.length ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setOpen(decor);
          }}
          className={pill}
        >
          <img
            src={decor[0]!.src}
            alt=""
            loading="lazy"
            className="size-6 rounded-full bg-muted object-cover"
          />
          Décor · {decor.length}
        </button>
      ) : null}
      {plans.length ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setOpen(plans);
          }}
          className={cn(pill, "pl-3")}
        >
          <Map className="size-4" aria-hidden />
          {plans.length > 1 ? `Layout · ${plans.length}` : "Layout"}
        </button>
      ) : null}
      {open
        ? createPortal(<ImageViewer images={open} onClose={() => setOpen(null)} />, document.body)
        : null}
    </div>
  );
}

const isPlan = (i: VeniceImage) =>
  /^(floor plan|layout|entrance layout|tunnel layout)/i.test(i.caption);

/** Photographer names: visible on every card, all caps and bold. */
function Photographers({ names }: { names: string[] }) {
  if (names.length === 0) return null;
  return (
    <p className="mt-2 text-[13px] font-bold tracking-[0.08em] text-primary uppercase">
      {names.join(" · ")}
    </p>
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
  const plans = images.filter(isPlan);
  const decor = images.filter((i) => !isPlan(i));
  const callText = shortTime(row.callTime);
  // Repeat the call time in the details only when it carries a note, e.g. "(team leaves the Danieli)".
  const callNote = /[a-z]{3,}/i.test(row.callTime.replace(/\b[ap]\.?m\.?\b/gi, ""));
  // Décor to Shoot lives on the separate Décor card when the event has one.
  const decorCardShown = hasDecorCard(row);
  const hasDetails = Boolean(
    row.boatTransfer ||
    row.departureSpot ||
    row.notes ||
    row.photographyRequests ||
    (row.decorToShoot && !decorCardShown) ||
    activity?.meetingPoint ||
    callNote,
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
        <div className="min-w-0 flex-1 space-y-2.5">
          <TimeColumn call={callText} event={shortRange(row.startTime, row.endTime)} />
          <div>
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
            <Photographers names={row.photographers} />
            {row.vipFocus ? (
              <p className="mt-1 text-[13px] text-muted-foreground">
                <span className="label-caps mr-1">VIP</span>
                {row.vipFocus}
              </p>
            ) : null}
          </div>
        </div>
        {hasDetails ? <Chevron open={open} /> : null}
      </button>
      <MediaButtons decor={decor} plans={plans} />
      {open ? (
        <div className="space-y-3 border-t border-border px-4 pt-3 pb-4">
          {/* 1. Where to be */}
          {callNote ? <Field label="Call" value={row.callTime} /> : null}
          {row.departureSpot || row.boatTransfer || activity?.meetingPoint ? (
            <div className="space-y-0.5">
              <Field label="Meet at" value={activity?.meetingPoint} />
              <Field label="Departs from" value={row.departureSpot} />
              <Field label="Boat" value={row.boatTransfer} />
            </div>
          ) : null}
          {/* 2. What to photograph */}
          <Block label="Coverage Requirements" text={row.photographyRequests} />
          {decorCardShown ? null : <Block label="Décor to Shoot" text={row.decorToShoot} />}
          {/* 3. Briefing */}
          <Block label="Briefing" text={row.notes} />
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

/**
 * The Décor line ahead of a main event: when to get in, which event, who shoots it,
 * and (on tap) the Décor to Shoot list.
 */
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
  const [open, setOpen] = useState(false);
  if (past && !shown) {
    return (
      <PastLine
        cardRef={cardRef}
        time="Décor"
        title={row.eventName}
        onOpen={() => setShown(true)}
      />
    );
  }
  const time = shortTime(row.decorAdvance);
  const isTime = parseTimeToMinutes(row.decorAdvance) !== null && time.length <= 9;
  return (
    <article
      ref={cardRef}
      className={cn("card scroll-mt-44 border-l-4 border-l-sage-line", past && "opacity-60")}
    >
      <button
        type="button"
        onClick={() => row.decorToShoot && setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-start gap-3 p-4 text-left"
      >
        <div className="min-w-0 flex-1 space-y-2.5">
          <TimeColumn call={isTime ? time : "TBD"} callLabel="Décor" />
          <div>
            <p className="ui-label mb-0.5 text-[11px]">Décor shoot</p>
            <h3 className="text-[17px] leading-snug font-semibold text-foreground">
              {row.eventName}
            </h3>
            {!isTime && row.decorAdvance ? (
              <p className="mt-0.5 text-[14px] leading-snug text-muted-foreground">
                {row.decorAdvance}
              </p>
            ) : null}
            <Photographers names={row.photographers} />
          </div>
        </div>
        {row.decorToShoot ? <Chevron open={open} /> : null}
      </button>
      {open ? (
        <div className="border-t border-border px-4 pt-3 pb-4">
          <Block label="Décor to Shoot" text={row.decorToShoot} />
        </div>
      ) : null}
    </article>
  );
}

/** "Amenities" rows (one at the end of each day in Airtable): a card that's hard to miss. */
export function isAmenityRow(row: Pick<ScheduleRow, "type" | "eventName">): boolean {
  return normalizeName(row.type) === "amenities";
}

export function AmenityCard({ row, cardRef }: { row: ScheduleRow; cardRef?: Ref<HTMLElement> }) {
  const lines = [row.photographyRequests, row.notes].filter(Boolean).join("\n");
  return (
    <article
      ref={cardRef}
      className="scroll-mt-44 rounded-[13px] border-2 border-primary bg-sage-card p-4"
    >
      <h3 className="text-[15px] font-bold tracking-[0.12em] text-foreground uppercase">
        Amenities
      </h3>
      <Photographers names={row.photographers} />
      {lines ? <NotesList notes={lines} className="mt-2" /> : null}
    </article>
  );
}

const covering = (a: ActivityRow) => normalizeName(a.lilaCovering) === "yes";

/** Sabbatical's sage card for each activity: time, name, who runs it; tap for the rest. */
export function ActivityCard({
  activity: a,
  vips,
  expandAll,
  tone = "sage",
}: {
  activity: ActivityRow;
  /** Key People on this activity, e.g. "Carolyn Mar". */
  vips?: string;
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
        <div className="min-w-0 flex-1 space-y-2.5">
          <TimeColumn event={shortRange(a.start, a.end)} />
          <div>
            {covering(a) ? <p className="ui-label mb-0.5 text-[11px]">LILA covering</p> : null}
            <h3 className="text-[17px] leading-snug font-semibold text-foreground">{a.activity}</h3>
            {a.runBy ? (
              <p className="mt-0.5 text-[15px] leading-snug text-foreground/75">{a.runBy}</p>
            ) : null}
            <Photographers names={a.photographer ? [a.photographer] : []} />
            {vips ? (
              <p className="mt-1 text-[13px] text-foreground/75">
                <span className="label-caps mr-1">VIP</span>
                {vips}
              </p>
            ) : null}
          </div>
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
        <div className="min-w-0 flex-1 space-y-2.5">
          <TimeColumn event={shortRange(first, last)} />
          <div>
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
