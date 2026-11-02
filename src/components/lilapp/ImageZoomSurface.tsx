import { useEffect, useRef } from "react";
import { clampPan, centeredZoom, zoomAt, type ZoomBounds, type ZoomState } from "@/lib/image-zoom";

export function ImageZoomSurface({
  url,
  caption,
  onClose,
  onPan,
  onPanEnd,
}: {
  url: string;
  caption: string;
  onClose: () => void;
  /** While not zoomed in, a one-finger drag reports its sideways distance (Photos-style paging). */
  onPan?: (dx: number) => void;
  /** The drag ended: distance and speed (px per ms), or 0, 0 when a pinch took over. */
  onPanEnd?: (dx: number, velocity: number) => void;
}) {
  const surface = useRef<HTMLDivElement>(null);
  const image = useRef<HTMLImageElement>(null);
  const zoom = useRef<ZoomState>({ scale: 1, x: 0, y: 0 });
  const bounds = useRef<ZoomBounds>({ width: 0, height: 0, imageWidth: 0, imageHeight: 0 });
  const close = useRef(onClose);
  close.current = onClose;
  const pan = useRef({ onPan, onPanEnd });
  pan.current = { onPan, onPanEnd };
  const apply = (state: ZoomState) => {
    zoom.current = clampPan(state, bounds.current);
    const img = image.current;
    if (img)
      img.style.transform = `translate(${zoom.current.x}px, ${zoom.current.y}px) scale(${zoom.current.scale})`;
  };
  useEffect(() => {
    const host = surface.current;
    const img = image.current;
    if (!host || !img) return;
    const pointers = new Map<number, { x: number; y: number }>();
    let ignoreTapUntil = 0;
    let pinched = false;
    let down: { x: number; y: number; time: number } | undefined;
    let moved = false;
    let tapReady = false;
    let paging = false;
    const fit = () => {
      if (!img.naturalWidth || !host.clientWidth || !host.clientHeight) return;
      const ratio = Math.min(
        host.clientWidth / img.naturalWidth,
        host.clientHeight / img.naturalHeight,
      );
      bounds.current = {
        width: host.clientWidth,
        height: host.clientHeight,
        imageWidth: img.naturalWidth * ratio,
        imageHeight: img.naturalHeight * ratio,
      };
      img.style.width = `${bounds.current.imageWidth}px`;
      img.style.height = `${bounds.current.imageHeight}px`;
      apply(centeredZoom(bounds.current));
    };
    const local = (e: PointerEvent | WheelEvent | MouseEvent) => {
      const rect = host.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    const pair = () => {
      const points = [...pointers.values()];
      const a = points[0],
        b = points[1];
      return a && b
        ? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, distance: Math.hypot(a.x - b.x, a.y - b.y) }
        : undefined;
    };
    const start = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      e.preventDefault();
      tapReady = false;
      host.setPointerCapture(e.pointerId);
      const point = local(e);
      pointers.set(e.pointerId, point);
      if (pointers.size === 1) {
        down = { ...point, time: performance.now() };
        moved = false;
        pinched = false;
      } else {
        moved = true;
        pinched = true;
      }
    };
    const move = (e: PointerEvent) => {
      const previous = pointers.get(e.pointerId);
      if (!previous) return;
      e.preventDefault();
      const before = pair();
      const point = local(e);
      pointers.set(e.pointerId, point);
      if (down && Math.hypot(point.x - down.x, point.y - down.y) > 8) moved = true;
      const after = pair();
      if (before && after && before.distance > 0) {
        const nextScale = Math.min(
          6,
          Math.max(1, (zoom.current.scale * after.distance) / before.distance),
        );
        const ratio = nextScale / zoom.current.scale;
        apply({
          scale: nextScale,
          x: after.x - (before.x - zoom.current.x) * ratio,
          y: after.y - (before.y - zoom.current.y) * ratio,
        });
      } else if (zoom.current.scale > 1) {
        apply({
          ...zoom.current,
          x: zoom.current.x + point.x - previous.x,
          y: zoom.current.y + point.y - previous.y,
        });
      } else if (down && !pinched && pointers.size === 1) {
        paging = true;
        pan.current.onPan?.(point.x - down.x);
      }
      if (pinched && paging) {
        paging = false;
        pan.current.onPanEnd?.(0, 0);
      }
    };
    const end = (e: PointerEvent) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.delete(e.pointerId);
      const time = performance.now();
      if (pinched) ignoreTapUntil = time + 300;
      const point = local(e);
      if (
        e.type === "pointerup" &&
        !moved &&
        !pinched &&
        down &&
        pointers.size === 0 &&
        time >= ignoreTapUntil &&
        time - down.time < 350 &&
        Math.hypot(point.x - down.x, point.y - down.y) <= 8
      ) {
        tapReady = true;
      }
      if (paging && pointers.size === 0) {
        paging = false;
        const dx = down ? point.x - down.x : 0;
        const elapsed = down ? Math.max(1, time - down.time) : 1;
        pan.current.onPanEnd?.(e.type === "pointerup" ? dx : 0, dx / elapsed);
      }
      if (pointers.size === 0) down = undefined;
    };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? host.clientHeight : 1);
      apply(
        zoomAt(
          zoom.current,
          zoom.current.scale * Math.exp(-delta * 0.002),
          local(e),
          bounds.current,
        ),
      );
    };
    const click = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (tapReady) close.current();
      tapReady = false;
    };
    img.addEventListener("load", fit);
    host.addEventListener("pointerdown", start);
    host.addEventListener("pointermove", move);
    host.addEventListener("pointerup", end);
    host.addEventListener("pointercancel", end);
    host.addEventListener("wheel", wheel, { passive: false });
    host.addEventListener("click", click);
    const observer = new ResizeObserver(fit);
    observer.observe(host);
    fit();
    return () => {
      observer.disconnect();
      img.removeEventListener("load", fit);
      host.removeEventListener("pointerdown", start);
      host.removeEventListener("pointermove", move);
      host.removeEventListener("pointerup", end);
      host.removeEventListener("pointercancel", end);
      host.removeEventListener("wheel", wheel);
      host.removeEventListener("click", click);
    };
  }, [url]);
  return (
    <div className="image-zoom-area">
      <div ref={surface} className="image-zoom-surface" aria-label="Zoomable layout">
        <img ref={image} src={url} alt={caption} draggable={false} />
      </div>
    </div>
  );
}
