import { formatTime, formatTimeRange } from "@/lib/time";

/**
 * Fixed-width time column. Call and Event each sit on ONE line with a
 * small right-aligned label + 1px divider + time value. Exact layout
 * defined in Running Notes #1 — do not reinterpret; inline styles are
 * intentional so this can't drift.
 */
export function CallEventTimes({
  callTime,
  startTime,
  endTime,
}: {
  callTime?: string;
  startTime?: string;
  endTime?: string;
}) {
  const call = formatTime(callTime);
  const evt = formatTimeRange(startTime, endTime);
  if (!call && !evt) return null;
  return (
    <div style={{ width: 145, flexShrink: 0 }} className="select-none">
      {call && (
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 8,
            whiteSpace: "nowrap",
          }}
        >
          <span
            style={{
              width: 30,
              textAlign: "right",
              fontSize: 11,
              fontWeight: 500,
              color: "#3a4a3a",
            }}
          >
            Call
          </span>
          <span style={{ width: 1, height: 12, background: "#c7d0c7" }} />
          <span style={{ fontSize: 14, fontWeight: 500, color: "#3a4a3a" }}>
            {call}
          </span>
        </div>
      )}
      {evt && (
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 8,
            marginTop: call ? 1 : 0,
            whiteSpace: "nowrap",
          }}
        >
          <span
            style={{
              width: 30,
              textAlign: "right",
              fontSize: 11,
              color: "#8b968b",
            }}
          >
            Event
          </span>
          <span style={{ width: 1, height: 11, background: "#c7d0c7" }} />
          <span style={{ fontSize: 14, color: "#6b766b" }}>{evt}</span>
        </div>
      )}
    </div>
  );
}
