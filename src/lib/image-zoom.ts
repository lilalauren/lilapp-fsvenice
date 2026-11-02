export type ZoomState = { scale: number; x: number; y: number };
export type ZoomBounds = { width: number; height: number; imageWidth: number; imageHeight: number };
/** Opens the whole image fitted to the screen; pinch to zoom in. */
export function centeredZoom(bounds: ZoomBounds, scale = 1): ZoomState {
  return clampPan(
    {
      scale,
      x: (bounds.width - bounds.imageWidth * scale) / 2,
      y: (bounds.height - bounds.imageHeight * scale) / 2,
    },
    bounds,
  );
}
export function clampPan(state: ZoomState, bounds: ZoomBounds): ZoomState {
  const scale = Math.min(6, Math.max(1, state.scale));
  const axis = (offset: number, viewport: number, image: number) => {
    const size = image * scale;
    return size <= viewport
      ? (viewport - size) / 2
      : Math.min(0, Math.max(viewport - size, offset));
  };
  return {
    scale,
    x: axis(state.x, bounds.width, bounds.imageWidth),
    y: axis(state.y, bounds.height, bounds.imageHeight),
  };
}
export function zoomAt(
  state: ZoomState,
  scale: number,
  point: { x: number; y: number },
  bounds: ZoomBounds,
): ZoomState {
  const next = Math.min(6, Math.max(1, scale));
  const ratio = next / state.scale;
  return clampPan(
    {
      scale: next,
      x: point.x - (point.x - state.x) * ratio,
      y: point.y - (point.y - state.y) * ratio,
    },
    bounds,
  );
}
