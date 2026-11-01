import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

// Short heuristic: does this look like a generic tier description
// (matching or repeating the category label) rather than an event-specific note?
function firstLine(s: string): string {
  return s.split(/\r?\n/)[0]?.trim() ?? "";
}

function isEventSpecificNote(attire: string, details: string): string | null {
  const first = firstLine(details);
  if (!first) return null;
  if (first.length > 140) return null;
  const a = attire.toLowerCase();
  const f = first.toLowerCase();
  if (a && (f === a || f.includes(a))) return null;
  // Skip generic tier-description openers.
  const generic = /^(please wear|wear |a |the |for )/i;
  if (generic.test(first) && details.length > 200) return null;
  return first;
}

export function AttireBlock({
  attire,
  details,
}: {
  attire?: string;
  details?: string;
}) {
  const [open, setOpen] = useState(false);
  if (!attire && !details) return null;
  const category = attire ?? "Attire";
  const inlineNote = attire && details ? isEventSpecificNote(attire, details) : null;
  const hasMore = !!details && details.trim() !== inlineNote?.trim();
  return (
    <section>
      <h4 className="label-caps mb-1.5">Attire</h4>
      <button
        type="button"
        onClick={() => hasMore && setOpen((o) => !o)}
        disabled={!hasMore}
        className={[
          "flex w-full items-center gap-2 rounded-md border border-border bg-secondary/60 px-3 py-2 text-left",
          hasMore ? "hover:bg-secondary" : "cursor-default",
        ].join(" ")}
        aria-expanded={open}
      >
        <span className="flex-1 text-sm font-medium text-foreground">{category}</span>
        {hasMore &&
          (open ? (
            <ChevronDown className="h-4 w-4 text-subtle" strokeWidth={2.5} />
          ) : (
            <ChevronRight className="h-4 w-4 text-subtle" strokeWidth={2.5} />
          ))}
      </button>
      {inlineNote && (
        <p className="mt-1.5 px-1 text-xs text-foreground/80">{inlineNote}</p>
      )}
      {open && details && (
        <div className="mt-2 whitespace-pre-wrap rounded-md border border-border bg-background px-3 py-2 text-sm leading-snug text-foreground/90">
          {details}
        </div>
      )}
    </section>
  );
}
