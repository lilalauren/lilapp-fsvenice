import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

/**
 * Panattoni's BEO viewer: every page of the PDF drawn at the phone's width, scroll for more.
 * "Open PDF" hands it to the phone's own viewer for pinch-zoom.
 */
export function PdfViewer({
  url,
  caption,
  onClose,
}: {
  url: string;
  caption: string;
  onClose: () => void;
}) {
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
    <div className="viewer viewer-doc" role="dialog" aria-modal="true" aria-label={caption}>
      <div className="viewer-bar">
        <span className="min-w-0">{caption}</span>
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
      <PdfPages url={url} />
      <div className="viewer-footer">
        Scroll for more pages ·{" "}
        <a href={url} target="_blank" rel="noopener noreferrer" className="underline">
          Open PDF to zoom ↗
        </a>
      </div>
    </div>
  );
}

function PdfPages({ url }: { url: string }) {
  const host = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "failed">("loading");

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let disposed = false;
    let destroy: (() => void) | undefined;
    setStatus("loading");
    (async () => {
      try {
        // Legacy build includes browser polyfills; only ever loaded in the browser.
        const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
        pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
        const task = pdfjs.getDocument({ url, isEvalSupported: false });
        destroy = () => void task.destroy();
        const pdf = await task.promise;
        // Show each whole page: as wide as the screen, but never taller than the viewer.
        const box = el.parentElement ?? el;
        const ratio = Math.min(window.devicePixelRatio || 1, 3);
        for (let n = 1; n <= pdf.numPages; n++) {
          if (disposed) return;
          const page = await pdf.getPage(n);
          const base = page.getViewport({ scale: 1 });
          const width = Math.min(
            el.clientWidth,
            (box.clientHeight - 16) * (base.width / base.height),
          );
          const viewport = page.getViewport({ scale: (width / base.width) * ratio });
          const canvas = document.createElement("canvas");
          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);
          canvas.className = "pdf-page";
          canvas.style.width = `${Math.floor(width)}px`;
          canvas.setAttribute("role", "img");
          canvas.setAttribute("aria-label", `Page ${n} of ${pdf.numPages}`);
          el.append(canvas);
          const context = canvas.getContext("2d");
          if (!context) throw new Error("Canvas unavailable");
          await page.render({ canvasContext: context, viewport }).promise;
          if (n === 1 && !disposed) setStatus("ready");
        }
      } catch {
        if (!disposed) setStatus("failed");
      }
    })();
    return () => {
      disposed = true;
      destroy?.();
      el.replaceChildren();
    };
  }, [url]);

  return (
    <div className="pdf-scroll">
      {status === "loading" ? <p className="pdf-status">Loading BEO…</p> : null}
      {status === "failed" ? (
        <p className="pdf-status">
          This PDF couldn't be shown here.{" "}
          <a href={url} target="_blank" rel="noopener noreferrer" className="underline">
            Open it ↗
          </a>
        </p>
      ) : null}
      <div ref={host} className="pdf-pages" />
    </div>
  );
}
