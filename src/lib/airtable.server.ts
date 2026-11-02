// Server-only Airtable REST client. Never import from client code.
// Reads env at call time (Netlify injects per-request).

const API = "https://api.airtable.com/v0";

// FS_Venice_PPI_EMEA_2026. Overridable so a copy of the base can be pointed at.
const DEFAULT_BASE_ID = "appYbc2zQI75G8KUu";

// Table IDs (stable, safe from renames). Field names below are Lauren's own.
export const TABLES = {
  SCHEDULE: "tblJCN5HlAUAoyrbP",
  ACTIVITIES: "tbl4hfxY1CVH5QTBJ",
  KEY_PEOPLE: "tblxq08S9VL4cZwXf",
  ATTIRE: "tblkxNfwTaD5XhZGV",
  LOOKBOOK: "tbl1366hwzYyYe7dy",
  TEAM: "tbl7y4TRYSxVbVDFY",
  BRIEFING: "tblHTLwZDopfvKqU7",
  OPEN_QUESTIONS: "tblA8FDtyz7dJ6yeD",
} as const;

export type TableKey = keyof typeof TABLES;

// Grid views whose sort the app keeps (Schedule: Date, then Sort Time).
const VIEWS: Partial<Record<TableKey, string>> = { SCHEDULE: "viw3NK9SzC1MHVStn" };

export type Attachment = {
  url: string;
  thumb?: string;
  filename?: string;
  type?: string;
};

type AirtableRecord = { id: string; createdTime: string; fields: Record<string, unknown> };
type AirtableList = { records: AirtableRecord[]; offset?: string };

function token(): string {
  const pat =
    process.env.AIRTABLE_PAT ??
    process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN ??
    process.env.AIRTABLE_DIRECT_TOKEN;
  if (!pat) throw new Error("AIRTABLE_PAT missing");
  return pat;
}

async function listAll(table: string, view?: string): Promise<AirtableRecord[]> {
  const pat = token();
  const baseId = process.env.AIRTABLE_BASE_ID || DEFAULT_BASE_ID;
  const out: AirtableRecord[] = [];
  let offset: string | undefined;
  do {
    const qs = new URLSearchParams({ pageSize: "100" });
    if (view) qs.set("view", view);
    if (offset) qs.set("offset", offset);
    // Cache-buster defeats any intermediate/CDN fetch cache so the app
    // always sees the latest Airtable state within one poll interval.
    qs.set("_ts", String(Date.now()));
    const res = await fetch(`${API}/${baseId}/${table}?${qs.toString()}`, {
      headers: { Authorization: `Bearer ${pat}`, "Cache-Control": "no-cache" },
      cache: "no-store",
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Airtable ${table} ${res.status}: ${body.slice(0, 200)}`);
    }
    const data = (await res.json()) as AirtableList;
    out.push(...data.records);
    offset = data.offset;
  } while (offset);
  return out;
}

// ---- Field mappers ----

function str(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "object" && "name" in (v as Record<string, unknown>)) {
    return String((v as { name: unknown }).name ?? "").trim();
  }
  return String(v).trim();
}

function list(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(str).filter(Boolean);
  const s = str(v);
  return s ? [s] : [];
}

function num(v: unknown): number | null {
  const n = typeof v === "number" ? v : Number(str(v));
  return Number.isFinite(n) && str(v) !== "" ? n : null;
}

function attachments(v: unknown): Attachment[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((a) => a && typeof a === "object" && typeof (a as { url?: unknown }).url === "string")
    .map((a) => {
      const x = a as {
        url: string;
        filename?: string;
        type?: string;
        thumbnails?: { large?: { url: string } };
      };
      return { url: x.url, thumb: x.thumbnails?.large?.url, filename: x.filename, type: x.type };
    });
}

// ---- DTOs (only fields we actually surface) ----

export type ScheduleRow = {
  id: string;
  eventName: string;
  date: string; // ISO YYYY-MM-DD
  day: string;
  callTime: string;
  decorAdvance: string;
  startTime: string;
  endTime: string;
  sortTime: string;
  type: string;
  venue: string;
  boatTransfer: string;
  departureSpot: string;
  photographers: string[];
  dressCode: string;
  vipFocus: string;
  notes: string;
  decorToShoot: string;
  photographyRequests: string;
  rush: boolean;
  lastModified: string;
};

export type ActivityRow = {
  id: string;
  activity: string;
  runBy: string;
  start: string;
  end: string;
  gettingThere: string;
  meetingPoint: string;
  signedUp: number | null;
  lilaCovering: string;
  photographer: string;
  notes: string;
};

export type PersonRow = {
  id: string;
  name: string;
  title: string;
  company: string;
  group: string;
  photo: string;
  activity: string;
  personalAttention: string;
  phone: string;
  order: number | null;
  lastModified: string;
};

export type AttireRow = {
  id: string;
  day: string;
  daytimeAttire: string;
  eveningAttire: string;
  whatToWear: string;
};

export type LookbookRow = {
  id: string;
  event: string;
  day: string;
  theme: string;
  dressCode: string;
  images: Attachment[];
  palette: string;
  whatToWear: string;
};

export type TeamRow = {
  id: string;
  name: string;
  role: string;
  phone: string;
  outboundFlight: string;
  arrivalInVenice: string;
  airportTransfer: string;
  hotelRoom: string;
  returnFlight: string;
  notes: string;
};

export type BriefingRow = {
  id: string;
  section: string;
  content: string;
  order: number | null;
  /** "Briefing" (or empty), "Resume" or "Hidden". */
  showOn: string;
};

export type QuestionRow = {
  id: string;
  question: string;
  category: string;
  ask: string;
  answer: string;
  done: boolean;
};

export type TripData = {
  schedule: ScheduleRow[];
  activities: ActivityRow[];
  people: PersonRow[];
  attire: AttireRow[];
  lookbook: LookbookRow[];
  team: TeamRow[];
  briefing: BriefingRow[];
  questions: QuestionRow[];
  /** Which tables actually loaded this time. A table that failed comes back empty. */
  loaded: Record<TableKey, boolean>;
};

/**
 * Each table loads independently: a missing or failing table must not take
 * down the rest of the app.
 */
async function listSafe(key: TableKey): Promise<{ key: TableKey; rows: AirtableRecord[] | null }> {
  try {
    return { key, rows: await listAll(TABLES[key], VIEWS[key]) };
  } catch (error) {
    console.error(`Airtable table ${key} failed to load; continuing without it.`, error);
    return { key, rows: null };
  }
}

export async function fetchTrip(): Promise<TripData> {
  const results = await Promise.all((Object.keys(TABLES) as TableKey[]).map(listSafe));
  return tripFromRecords(Object.fromEntries(results.map((r) => [r.key, r.rows])));
}

/** Map raw Airtable records (null = table failed to load) into the app's shapes. */
export function tripFromRecords(raw: Partial<Record<TableKey, AirtableRecord[] | null>>): TripData {
  const keys = Object.keys(TABLES) as TableKey[];
  const rows = Object.fromEntries(keys.map((k) => [k, raw[k] ?? []])) as Record<
    TableKey,
    AirtableRecord[]
  >;
  const loaded = Object.fromEntries(keys.map((k) => [k, Array.isArray(raw[k])])) as Record<
    TableKey,
    boolean
  >;

  return {
    loaded,
    schedule: rows.SCHEDULE.map(({ id, fields: f }) => ({
      id,
      eventName: str(f["Event Name"]),
      date: str(f["Date"]).slice(0, 10),
      day: str(f["Day"]),
      callTime: str(f["Call Time"] ?? f["Photographer Call Time"]),
      decorAdvance: str(f["Décor Advance"]),
      startTime: str(f["Start Time"]),
      endTime: str(f["End Time"]),
      sortTime: str(f["Sort Time"] ?? f["Sort Time - hidden"]),
      type: str(f["Type"]),
      venue: str(f["Venue"]),
      boatTransfer: str(f["Boat Transfer"]),
      departureSpot: str(f["Departure Spot"]),
      photographers: list(f["Photographer"]),
      dressCode: str(f["Dress Code"]),
      vipFocus: str(f["VIP Focus"]),
      notes: str(f["Briefing"] ?? f["Notes"]),
      decorToShoot: str(f["Décor to Shoot"]),
      photographyRequests: str(f["Coverage Requirements"] ?? f["Photography Requests"]),
      rush: f["Rush"] === true,
      lastModified: str(f["Last modified"]),
    })).filter((r) => r.eventName || r.startTime || r.venue || r.notes),
    activities: rows.ACTIVITIES.map(({ id, fields: f }) => ({
      id,
      activity: str(f["Activity"]),
      runBy: str(f["Run by"]),
      start: str(f["Start"]),
      end: str(f["End"]),
      gettingThere: str(f["Getting there"]),
      meetingPoint: str(f["Meeting point"]),
      signedUp: num(f["Signed up"]),
      lilaCovering: str(f["LILA covering"]),
      photographer: str(f["Photographer"]),
      notes: str(f["Notes"]),
    })).filter((r) => r.activity),
    people: rows.KEY_PEOPLE.map(({ id, fields: f }) => {
      const photo = attachments(f["Photo"])[0];
      return {
        id,
        name: str(f["Name"]),
        title: str(f["Title"]),
        company: str(f["Company"]),
        group: str(f["Group"]),
        photo: photo?.thumb ?? photo?.url ?? "",
        activity: str(f["Activity"]),
        personalAttention: str(f["Personal Attention"]),
        phone: str(f["Phone"]),
        order: num(f["Order"]),
        lastModified: str(f["Last modified"]),
      };
    }).filter((r) => r.name),
    attire: rows.ATTIRE.map(({ id, fields: f }) => ({
      id,
      day: str(f["Day"]),
      daytimeAttire: str(f["Daytime Attire"]),
      eveningAttire: str(f["Evening Attire"]),
      whatToWear: str(f["What to Wear"]),
    })).filter((r) => r.day),
    lookbook: rows.LOOKBOOK.map(({ id, fields: f }) => ({
      id,
      event: str(f["Event"]),
      day: str(f["Day"]),
      theme: str(f["Theme"]),
      dressCode: str(f["Dress Code"]),
      images: attachments(f["Images"]),
      palette: str(f["Palette"]),
      whatToWear: str(f["What to Wear"]),
    })).filter((r) => r.event),
    team: rows.TEAM.map(({ id, fields: f }) => ({
      id,
      name: str(f["Name"]),
      role: str(f["Role"]),
      phone: str(f["Phone / WhatsApp"]),
      outboundFlight: str(f["Outbound Flight"]),
      arrivalInVenice: str(f["Arrival in Venice"]),
      airportTransfer: str(f["Airport Transfer"]),
      hotelRoom: str(f["Hotel / Room"]),
      returnFlight: str(f["Return Flight"]),
      notes: str(f["Notes"]),
    })).filter((r) => r.name),
    briefing: rows.BRIEFING.map(({ id, fields: f }) => ({
      id,
      section: str(f["Section"]),
      content: str(f["Content"]),
      order: num(f["Order"]),
      showOn: str(f["Show On"]),
    }))
      .filter((r) => r.section || r.content)
      .sort((a, b) => (a.order ?? 999) - (b.order ?? 999)),
    questions: rows.OPEN_QUESTIONS.map(({ id, fields: f }) => ({
      id,
      question: str(f["Question"]),
      category: str(f["Category"]),
      ask: str(f["Ask"]),
      answer: str(f["Answer"]),
      done: f["Done"] === true,
    })).filter((r) => r.question),
  };
}
