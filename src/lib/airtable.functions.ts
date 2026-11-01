import { createServerFn } from "@tanstack/react-start";

export const getTrip = createServerFn({ method: "GET" }).handler(async () => {
  // Local preview only: serve a saved copy of the base instead of calling Airtable.
  const fixture = process.env.LILAPP_FIXTURE;
  if (fixture) {
    const { readFile } = await import("node:fs/promises");
    const { tripFromRecords } = await import("./airtable.server");
    return tripFromRecords(JSON.parse(await readFile(fixture, "utf8")));
  }
  const { fetchTrip } = await import("./airtable.server");
  return fetchTrip();
});
