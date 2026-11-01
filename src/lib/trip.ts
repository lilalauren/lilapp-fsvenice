import { queryOptions } from "@tanstack/react-query";
import { getTrip } from "./airtable.functions";
import { mergeWithCache, readTripCache, saveTripCache } from "./offline";

// One trip payload powers every tab, so switching tabs never waits on the
// network. Airtable is edited on site, so refresh every minute and whenever
// the app regains focus. Offline, fall back to the copy saved on this phone.
export const tripQueryOptions = queryOptions({
  queryKey: ["trip"],
  queryFn: async () => {
    try {
      const fresh = await getTrip();
      const merged = mergeWithCache(fresh, readTripCache()?.data ?? null);
      saveTripCache(merged);
      return merged;
    } catch (error) {
      const cached = readTripCache();
      if (cached) return cached.data;
      throw error;
    }
  },
  staleTime: 0,
  refetchInterval: 60_000,
  refetchOnWindowFocus: true,
  retry: 1,
  networkMode: "always",
});
