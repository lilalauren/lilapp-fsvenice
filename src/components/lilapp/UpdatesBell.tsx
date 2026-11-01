import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Bell, X } from "lucide-react";

import { tripQueryOptions } from "@/lib/trip";
import { formatChangeTime } from "@/lib/time";
import {
  collectUpdates,
  markSeen,
  readBaseline,
  readSeen,
  type SeenMap,
  type UpdateItem,
} from "@/lib/updates";

export function UpdatesBell() {
  const { data } = useQuery(tripQueryOptions);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState<SeenMap>({});
  const [baseline, setBaseline] = useState("");

  useEffect(() => {
    setSeen(readSeen());
    setBaseline(readBaseline());
  }, []);

  const updates = useMemo(
    () => (data && baseline ? collectUpdates(data, seen, baseline) : []),
    [data, seen, baseline],
  );

  const go = (item: UpdateItem) => {
    setSeen(markSeen([item]));
    setOpen(false);
    if (item.kind === "schedule") navigate({ to: "/", search: { day: item.date ?? "", who: "" } });
    else navigate({ to: "/resume" });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={updates.length ? `${updates.length} updates` : "Updates"}
        className="relative inline-flex size-11 items-center justify-center rounded-md text-subtle hover:bg-secondary hover:text-foreground"
      >
        <Bell className="size-5" />
        {updates.length > 0 && (
          <span className="absolute top-1.5 right-1.5 min-w-4 rounded-full bg-primary px-1 text-center text-[10px] leading-4 font-semibold text-primary-foreground">
            {updates.length}
          </span>
        )}
      </button>
      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex flex-col bg-background"
            role="dialog"
            aria-modal="true"
            aria-label="Updates"
          >
            <div className="mx-auto flex w-full max-w-2xl items-center justify-between px-4 pt-[calc(0.75rem+env(safe-area-inset-top))] pb-2">
              <h2 className="ui-page-title">Updates</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="inline-flex size-11 items-center justify-center rounded-full text-subtle hover:bg-secondary"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="mx-auto w-full max-w-2xl flex-1 overflow-y-auto px-4 pb-8">
              <p className="ui-body text-muted-foreground">
                Changes in Airtable since you last looked. Tap one to go to it.
              </p>
              {updates.length === 0 ? (
                <p className="ui-body py-10 text-center text-muted-foreground">
                  You're up to date.
                </p>
              ) : (
                <>
                  <ul className="mt-3 divide-y divide-border">
                    {updates.map((u) => (
                      <li key={u.id}>
                        <button
                          type="button"
                          onClick={() => go(u)}
                          className="flex min-h-14 w-full items-center gap-3 py-3 text-left"
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block font-semibold text-foreground">{u.title}</span>
                            <span className="ui-body block text-muted-foreground">
                              {[u.kind === "schedule" ? "Schedule" : "Key People", u.detail]
                                .filter(Boolean)
                                .join(" · ")}
                            </span>
                          </span>
                          <span className="shrink-0 text-xs text-subtle">
                            {formatChangeTime(u.lastModified)}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={() => setSeen(markSeen(updates))}
                    className="mt-4 min-h-11 w-full rounded-md border border-border text-sm font-medium text-foreground hover:bg-secondary"
                  >
                    Mark all as seen
                  </button>
                </>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
