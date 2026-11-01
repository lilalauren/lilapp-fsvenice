import { useState } from "react";
import { X } from "lucide-react";
import type { AirtableAttachment } from "@/lib/airtable.server";

export function AttachmentGallery({ items }: { items: AirtableAttachment[] }) {
  const [open, setOpen] = useState<AirtableAttachment | null>(null);
  const imgs = items.filter((a) => (a.type ?? "").startsWith("image") || /\.(png|jpe?g|gif|webp|heic)$/i.test(a.filename ?? a.url));
  if (imgs.length === 0) return null;
  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {imgs.map((a) => {
          const thumb = a.thumbnails?.large?.url ?? a.thumbnails?.small?.url ?? a.url;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => setOpen(a)}
              className="block overflow-hidden rounded-md border border-border bg-secondary transition-transform hover:scale-[1.01]"
            >
              <img
                src={thumb}
                alt={a.filename ?? "Attachment"}
                loading="lazy"
                className="aspect-square w-full object-cover"
              />
            </button>
          );
        })}
      </div>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/80 p-4">
          <button
            type="button"
            aria-label="Close image"
            onClick={() => setOpen(null)}
            className="absolute inset-0"
          />
          <button
            type="button"
            onClick={() => setOpen(null)}
            className="absolute right-4 top-4 rounded-full bg-background/90 p-2 text-foreground shadow"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={open.thumbnails?.full?.url ?? open.url}
            alt={open.filename ?? "Attachment"}
            className="relative max-h-[90vh] max-w-full rounded-md object-contain"
          />
        </div>
      )}
    </>
  );
}
