import { useEffect } from "react";
import { X, Gift } from "lucide-react";
import type { RoomDropRow } from "@/lib/airtable.server";
import { AttachmentGallery } from "./AttachmentGallery";

export function RoomDropSheet({
  row,
  onClose,
}: {
  row: RoomDropRow | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!row) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [row, onClose]);
  if (!row) return null;
  const captured = row.captured;
  const media = [...row.images, ...row.attachments];
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-foreground/30 backdrop-blur-[1px]"
      />
      <div className="relative flex max-h-[92vh] w-full flex-col rounded-t-2xl border border-border bg-background shadow-2xl sm:max-w-lg sm:rounded-2xl">
        <header className="shrink-0 border-b border-border px-5 pb-4 pt-4">
          <div className="mb-2 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-[#8a6a1f]" strokeWidth={2.25} aria-hidden />
                <span className="rounded-full bg-[#8a6a1f] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                  Room Drop
                </span>
              </div>
              <h2 className="mt-2 text-lg font-semibold leading-tight text-foreground">
                {row.name}
              </h2>
              {row.location && (
                <p className="mt-0.5 text-sm text-muted-foreground">{row.location}</p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1 text-subtle hover:bg-secondary hover:text-foreground"
              aria-label="Close details"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
            {row.giftCategory && (
              <span className="text-muted-foreground">
                <span className="label-caps">Category</span> {row.giftCategory}
              </span>
            )}
            {row.deliveryStatus && (
              <span className="text-muted-foreground">
                <span className="label-caps">Delivery</span> {row.deliveryStatus}
              </span>
            )}
            <span
              className={captured ? "text-foreground/80" : "text-[#8a6a1f]"}
            >
              <span className="label-caps">Status</span>{" "}
              {captured
                ? `Captured${row.capturedBy ? ` by ${row.capturedBy}` : ""}`
                : "Not yet captured"}
            </span>
          </div>
        </header>
        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          {row.details && (
            <section>
              <h4 className="label-caps mb-1.5">Details</h4>
              <p className="whitespace-pre-wrap text-sm leading-snug text-foreground/90">
                {row.details}
              </p>
            </section>
          )}
          {row.notes && (
            <section>
              <h4 className="label-caps mb-1.5">Notes</h4>
              <p className="whitespace-pre-wrap text-sm leading-snug text-foreground/90">
                {row.notes}
              </p>
            </section>
          )}
          {media.length > 0 && (
            <section>
              <h4 className="label-caps mb-2">Reference images</h4>
              <AttachmentGallery items={media} />
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
