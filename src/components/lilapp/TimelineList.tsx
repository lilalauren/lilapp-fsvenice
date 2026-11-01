import { useState } from "react";
import { parseTimeline } from "@/lib/timeline";

export function TimelineList({ raw }: { raw?: string }) {
  const [expanded, setExpanded] = useState(false);
  const items = parseTimeline(raw);
  if (!items.length) return null;
  const preview = 5;
  const shown = expanded ? items : items.slice(0, preview);
  const remaining = items.length - shown.length;

  return (
    <div className="relative">
      <ul className="space-y-1.5">
        {shown.map((it, i) => (
          <li key={i} className="flex items-start gap-3 text-sm">
            <span className="time-col shrink-0 font-medium text-foreground">{it.time}</span>
            <span className="flex-1 text-foreground/90">{it.text}</span>
          </li>
        ))}
      </ul>
      {remaining > 0 && (
        <>
          <div className="pointer-events-none absolute inset-x-0 bottom-8 h-8 bg-gradient-to-t from-background to-transparent" />
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="mt-2 text-xs text-primary hover:underline"
          >
            {remaining} more item{remaining === 1 ? "" : "s"} · tap to expand full timeline
          </button>
        </>
      )}
      {expanded && items.length > preview && (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="mt-2 text-xs text-subtle hover:text-foreground"
        >
          Collapse
        </button>
      )}
    </div>
  );
}
