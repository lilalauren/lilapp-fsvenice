import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { ImageZoomSurface } from "./ImageZoomSurface";

const URL_RE = /(https?:\/\/[^\s]+)/g;

/** Turn bare links in Airtable text into tappable links. */
export function Linkify({ text }: { text: string }) {
  // split() with a capture group puts the matched links at the odd indexes.
  const parts = text.split(URL_RE);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="break-all text-primary underline underline-offset-2"
          >
            {part.replace(/^https?:\/\//, "").split(/[/?]/)[0]}
          </a>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

/** Multi-line Airtable notes as a tidy list (each line its own row). */
export function NotesList({ notes, className }: { notes: string; className?: string }) {
  const lines = notes
    .split(/\r?\n/)
    .map((l) =>
      l
        .trim()
        .replace(/^[-–—•*·]+\s*/, "")
        .trim(),
    )
    .filter(Boolean);
  if (lines.length === 0) return null;
  if (lines.length === 1) {
    return (
      <p className={cn("ui-body text-foreground/85", className)}>
        <Linkify text={lines[0]!} />
      </p>
    );
  }
  return (
    <ul className={cn("space-y-1.5", className)}>
      {lines.map((line, i) => (
        <li key={i} className="ui-body flex gap-2 text-foreground/85">
          <span aria-hidden="true" className="mt-[0.6em] size-1 shrink-0 rounded-full bg-subtle" />
          <span className="min-w-0">
            <Linkify text={line} />
          </span>
        </li>
      ))}
    </ul>
  );
}

/** "Label value" on one line; hidden when empty. */
export function Field({
  label,
  value,
  strong,
}: {
  label: string;
  value?: string;
  strong?: boolean;
}) {
  if (!value) return null;
  return (
    <p className="ui-body text-muted-foreground">
      <span className="label-caps mr-1.5 align-[0.08em]">{label}</span>
      <span className={cn("text-foreground", strong && "font-semibold")}>{value}</span>
    </p>
  );
}

/** A labelled block of notes; hidden when empty. */
export function Block({ label, text }: { label: string; text?: string }) {
  if (!text) return null;
  return (
    <section>
      <h4 className="label-caps mb-1">{label}</h4>
      <NotesList notes={text} />
    </section>
  );
}

export function SelectBox({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="relative block min-w-0 flex-1">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="ui-body min-h-11 w-full appearance-none truncate rounded-md border border-border bg-background py-2 pr-9 pl-3 text-foreground focus:border-primary focus:outline-none"
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-subtle"
      />
    </label>
  );
}

export type ViewerImage = { src: string; caption: string };

/** Thumbnails that open a full-screen pinch-zoom viewer. */
export function ImageStrip({ images, title }: { images: ViewerImage[]; title?: string }) {
  const [open, setOpen] = useState<ViewerImage | null>(null);
  if (images.length === 0) return null;
  return (
    <section>
      {title ? <h4 className="label-caps mb-1.5">{title}</h4> : null}
      <ul className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1">
        {images.map((img) => (
          <li key={img.src} className="shrink-0 snap-start">
            <button
              type="button"
              onClick={() => setOpen(img)}
              className="block text-left"
              aria-label={`Enlarge ${img.caption}`}
            >
              <img
                src={img.src}
                alt={img.caption}
                loading="lazy"
                className="h-28 w-auto max-w-[16rem] rounded-md bg-muted object-cover"
              />
              <span className="mt-1 block max-w-[16rem] truncate text-xs text-muted-foreground">
                {img.caption}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {open ? <ImageViewer image={open} onClose={() => setOpen(null)} /> : null}
    </section>
  );
}

export function ImageViewer({ image, onClose }: { image: ViewerImage; onClose: () => void }) {
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    // iOS-safe scroll lock: pin the body where it was and restore on close.
    const old = document.body.style.cssText;
    const scrollY = window.scrollY;
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    close.current?.focus();
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", key);
    return () => {
      document.body.style.cssText = old;
      window.scrollTo(0, scrollY);
      window.removeEventListener("keydown", key);
    };
  }, [onClose]);
  return (
    <div className="viewer" role="dialog" aria-modal="true" aria-label={image.caption}>
      <div className="viewer-bar">
        <span className="min-w-0">{image.caption}</span>
        <button
          ref={close}
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-white/25"
        >
          <X className="size-5" />
        </button>
      </div>
      <div className="viewer-pan">
        <ImageZoomSurface
          key={image.src}
          url={image.src}
          caption={image.caption}
          onClose={onClose}
        />
      </div>
      <div className="viewer-footer">Pinch to zoom · drag to move · tap to close</div>
    </div>
  );
}

/** Small uppercase heading above a list, left-aligned. */
export function SectionHeading({ children }: { children: ReactNode }) {
  return <h2 className="ui-page-title mb-3">{children}</h2>;
}

export function Quiet({ children }: { children: ReactNode }) {
  return <p className="ui-body py-6 text-center text-muted-foreground">{children}</p>;
}
