// Parse a free-text Event Timeline / Activity Timeline field into rows of
// { time, text }. Formats we accept per line:
//   "8-8:30pm — Dance show"
//   "8:00 PM Dance show"
//   "- 8pm dance show"
// Lines without a leading time are appended to the previous row's text.

export type TimelineItem = { time: string; text: string };

const TIME_LEAD =
  /^\s*(?:[-*•]\s*)?((?:\d{1,2}(?::\d{2})?\s*(?:am|pm|AM|PM)?)(?:\s*[–—-]\s*\d{1,2}(?::\d{2})?\s*(?:am|pm|AM|PM)?)?)\s*(?:[—–\-:]\s*)?(.*)$/;

export function parseTimeline(input?: string): TimelineItem[] {
  if (!input) return [];
  const lines = input.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const items: TimelineItem[] = [];
  for (const line of lines) {
    const m = line.match(TIME_LEAD);
    if (m && m[1] && /\d/.test(m[1])) {
      const time = m[1].replace(/\s+/g, " ").trim().toLowerCase().replace(/([ap])m/i, " $1m").replace(/\s+/g, " ").trim();
      const text = (m[2] ?? "").trim();
      items.push({ time, text: text || "—" });
    } else if (items.length > 0) {
      items[items.length - 1].text += " " + line;
    } else {
      items.push({ time: "", text: line });
    }
  }
  return items;
}
