// Server-only Airtable REST client. Never import from client code.
// Reads env at call time (Workers inject per-request).

const API = "https://api.airtable.com/v0";

// Table IDs (stable, safe from renames)
export const TABLES = {
  ROS: "tblj9BgxOVrrXE7xx", // Full Agenda _ ROS
  EXCURSION_ASSIGN: "tblwnWug4RlNXbYuo", // Excursion Assignments
  TEAM: "tbl5goBLfCVt3qa3Y", // Team LILA
  TRAVEL: "tblhHGAZKHSuH10z6", // Travel Tab
  ROOM_DROPS: "tblynXh2Fg2cKN4lr", // Room Drops
} as const;

export type AirtableAttachment = {
  id: string;
  url: string;
  filename?: string;
  type?: string;
  width?: number;
  height?: number;
  thumbnails?: {
    small?: { url: string; width: number; height: number };
    large?: { url: string; width: number; height: number };
    full?: { url: string; width: number; height: number };
  };
};

type AirtableRecord<T> = { id: string; createdTime: string; fields: T };
type AirtableList<T> = { records: AirtableRecord<T>[]; offset?: string };

async function listAll<T>(table: string, params: Record<string, string> = {}): Promise<AirtableRecord<T>[]> {
  const pat = process.env.AIRTABLE_PAT;
  const baseId = process.env.AIRTABLE_BASE_ID;
  if (!pat) throw new Error("AIRTABLE_PAT missing");
  if (!baseId) throw new Error("AIRTABLE_BASE_ID missing");

  const out: AirtableRecord<T>[] = [];
  let offset: string | undefined;
  do {
    const qs = new URLSearchParams({ pageSize: "100", ...params });
    if (offset) qs.set("offset", offset);
    // Cache-buster defeats any intermediate/CDN/Worker fetch cache so the app
    // always sees the latest Airtable state within one poll interval.
    qs.set("_ts", String(Date.now()));
    const url = `${API}/${baseId}/${table}?${qs.toString()}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${pat}`,
        "Cache-Control": "no-cache",
      },
      cache: "no-store",
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Airtable ${table} ${res.status}: ${body.slice(0, 200)}`);
    }
    const data = (await res.json()) as AirtableList<T>;
    out.push(...data.records);
    offset = data.offset;
  } while (offset);
  return out;
}

// ---- DTOs (only fields we actually surface) ----

export type AgendaRow = {
  id: string;
  eventName: string;
  assignedPhotographers: string[];
  day?: string;
  date?: string; // ISO YYYY-MM-DD
  port?: string; // Port name straight from ROS
  callTime?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  whereToGo?: string;
  coverageRequirements?: string;
  eventTimeline?: string;
  attire?: string;
  attireDetails?: string;
  equipmentNeeds?: string;
  // Client Notes (Internal Only) is intentionally NEVER surfaced.
};

export type ExcursionAssignRow = {
  id: string;
  port?: string;
  excursion?: string;
  photographers: string[];
  callTime?: string;
  busDepartureTime?: string;
  arrivalBackAtPort?: string;
  activityOverview?: string;
  activityInsights?: string;
  photographyNotes?: string;
  activityTimeline?: string;
  vvipAttendees?: string;
  guestCount?: string;
  travelInformation?: string;
  additionalInfo?: string;
  attachments?: AirtableAttachment[];
  // Derived
  date?: string; // parsed from Port field ("Thursday, July 16 - Gothenburg, Sweden")
  portName?: string;
};

export type RoomDropRow = {
  id: string;
  name: string;
  date?: string; // ISO YYYY-MM-DD
  location?: string;
  details?: string;
  notes?: string;
  captured: boolean;
  capturedBy?: string;
  deliveryStatus?: string;
  giftCategory?: string;
  photoApproved: boolean;
  attachments: AirtableAttachment[];
  images: AirtableAttachment[];
};

export type TeamRow = {
  id: string;
  displayName: string;
  role?: string;
};

export type TravelRow = {
  id: string;
  teamMember: string;
  arrivalDate?: string;
  arrivalDay?: string;
  arrivalAirport?: string;
  arrivalTime?: string;
  flightNumber?: string;
  arrivalFrom?: string;
  hotelConfirmation?: string;
  cabin?: string;
  departureDate?: string;
  departureDay?: string;
  departureTime?: string;
  notes?: string;
};

// ---- Field mappers ----

function asArrayOfStrings(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x)).filter(Boolean);
  if (typeof v === "string" && v.trim()) return [v.trim()];
  return [];
}

function str(v: unknown): string | undefined {
  if (v == null) return undefined;
  const s = String(v).trim();
  return s ? s : undefined;
}

function bool(v: unknown): boolean {
  return v === true || v === 1 || v === "true";
}

function attachments(v: unknown): AirtableAttachment[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((a) => a && typeof a === "object" && typeof (a as { url?: unknown }).url === "string")
    .map((a) => a as AirtableAttachment);
}

// Try to pull a YYYY-MM-DD from a Port string like "Thursday, July 16 - Gothenburg, Sweden".
// We don't have year in the port string; fall back to undefined and rely on
// matching by photographer+date when the record has an explicit date field.
// Port strings look like "Thursday, July 16 - Gothenburg, Sweden" or
// "Monday, July 13- Amsterdam, Netherlands" (no space before dash).
function extractPortName(port?: string): string | undefined {
  if (!port) return undefined;
  const m = port.match(/^\s*[^,]+,\s*[A-Za-z]+\s+\d{1,2}\s*-\s*(.+)$/);
  return (m ? m[1] : port).trim();
}

// Extract the numeric month/day from a port string like
// "Monday, July 13 - Amsterdam". Returns { month: 7, day: 13 } or null.
const MONTHS: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};
export function extractPortMonthDay(port?: string): { month: number; day: number } | null {
  if (!port) return null;
  const m = port.match(/([A-Za-z]+)\s+(\d{1,2})/);
  if (!m) return null;
  const mon = MONTHS[m[1].toLowerCase()];
  const day = parseInt(m[2], 10);
  if (!mon || !day) return null;
  return { month: mon, day };
}

export async function fetchAgenda(): Promise<AgendaRow[]> {
  type F = Record<string, unknown>;
  // Pass Grid view so rows arrive in the manual Airtable order (not creation order).
  const recs = await listAll<F>(TABLES.ROS, { view: "viwpCHjqKYGZ4EoVW" });
  return recs.map((r) => {
    const f = r.fields;
    return {
      id: r.id,
      eventName: str(f["Event Name"]) ?? "(untitled)",
      assignedPhotographers: asArrayOfStrings(f["Assigned Photographer"]),
      day: str(f["Day"]),
      date: str(f["Date"]),
      port: str(f["Port"]),
      callTime: str(f["Call Time"]),
      startTime: str(f["Start Time"]),
      endTime: str(f["End Time"]),
      location: str(f["Location"]),
      whereToGo: str(f["Where to Go"]),
      coverageRequirements: str(f["Coverage Requirements"]),
      eventTimeline: str(f["Event Timeline"]),
      attire: str(f["Attire"]),
      attireDetails: str(f["Attire Details"]),
      equipmentNeeds: str(f["Equipment Needs"]),
    };
  });
}

export async function fetchExcursionAssignments(): Promise<ExcursionAssignRow[]> {
  type F = Record<string, unknown>;
  const recs = await listAll<F>(TABLES.EXCURSION_ASSIGN, { view: "viwgiMXLt0k0lwjcb" });
  return recs.map((r) => {
    const f = r.fields;
    const port = str(f["Port"]);
    return {
      id: r.id,
      port,
      portName: extractPortName(port),
      excursion: str(f["Excursion"]),
      photographers: asArrayOfStrings(f["Photographer "] ?? f["Photographer"]),
      callTime: str(f["Call Time"]),
      busDepartureTime: str(f["Bus Departure Time"]),
      arrivalBackAtPort: str(f["Arrival Back at Port"]),
      activityOverview: str(f["Activity Overview"]),
      activityInsights: str(f["Activity Insights"]),
      photographyNotes: str(f["Photography Notes"]),
      activityTimeline: str(f["Activity Timeline"]),
      vvipAttendees: str(f["VVIP Attendees"]),
      guestCount: str(f["# of Guests"]),
      travelInformation: str(f["Travel Information"]),
      additionalInfo: str(f["Additional Info- pictures"]),
      attachments: [
        ...attachments(f["Attachment"]),
        ...attachments(f["Attachments"]),
        ...attachments(f["Image"]),
        ...attachments(f["Images"]),
        ...attachments(f["Photos"]),
      ],
    };
  });
}

export async function fetchRoomDrops(): Promise<RoomDropRow[]> {
  type F = Record<string, unknown>;
  const recs = await listAll<F>(TABLES.ROOM_DROPS);
  return recs.map((r) => {
    const f = r.fields;
    return {
      id: r.id,
      name: str(f["Name"]) ?? "Room Drop",
      date: str(f["Date"]),
      location: str(f["Room(s) / Location"]),
      details: str(f["Details"]),
      notes: str(f["Notes"]),
      captured: bool(f["Captured"]),
      capturedBy: str(f["Captured By"]),
      deliveryStatus: str(f["Delivery Status"]),
      giftCategory: str(f["Gift Category"]),
      photoApproved: bool(f["Photo Approved"]),
      attachments: attachments(f["Attachment"]),
      images: attachments(f["Image"]),
    };
  });
}

export async function fetchTeam(): Promise<TeamRow[]> {
  type F = Record<string, unknown>;
  // Pass view= so records come back in the manual order set in Airtable's Grid view,
  // not creation order.
  const recs = await listAll<F>(TABLES.TEAM, { view: "viw0TF8sxM5xp3hSV" });
  return recs
    .map((r) => ({
      id: r.id,
      displayName: str(r.fields["Display Name"]) ?? "",
      role: str(r.fields["Role"]),
    }))
    .filter((t) => t.displayName);
}

export async function fetchTravel(): Promise<TravelRow[]> {
  type F = Record<string, unknown>;
  const recs = await listAll<F>(TABLES.TRAVEL);
  return recs.map((r) => {
    const f = r.fields;
    return {
      id: r.id,
      teamMember: (() => {
        const v = f["Team Member"];
        if (Array.isArray(v)) return String(v[0] ?? "");
        return str(v) ?? "";
      })(),
      arrivalDate: str(f["Arrival Date"]),
      arrivalDay: str(f["Arrival Day"]),
      arrivalAirport: str(f["Arrival Airport"]),
      arrivalTime: str(f["Arrival Time"]),
      flightNumber: str(f["Flight Number"]),
      arrivalFrom: str(f["Arrival from"]),
      hotelConfirmation: str(f["Radisson Blu - Hotel Confirmations"]),
      cabin: str(f["Cabin #"]),
      departureDate: str(f["Departure Date"]),
      departureDay: str(f["Departure Day"]),
      departureTime: str(f["Departure Time"]),
      notes: str(f["Notes"]),
    };
  });
}
