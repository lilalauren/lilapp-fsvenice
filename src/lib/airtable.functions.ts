import { createServerFn } from "@tanstack/react-start";

export const getAgenda = createServerFn({ method: "POST" }).handler(async () => {
  const { fetchAgenda } = await import("./airtable.server");
  return fetchAgenda();
});

export const getExcursionAssignments = createServerFn({ method: "POST" }).handler(async () => {
  const { fetchExcursionAssignments } = await import("./airtable.server");
  return fetchExcursionAssignments();
});

export const getTeam = createServerFn({ method: "POST" }).handler(async () => {
  const { fetchTeam } = await import("./airtable.server");
  return fetchTeam();
});

export const getTravel = createServerFn({ method: "POST" }).handler(async () => {
  const { fetchTravel } = await import("./airtable.server");
  return fetchTravel();
});

export const getRoomDrops = createServerFn({ method: "POST" }).handler(async () => {
  const { fetchRoomDrops } = await import("./airtable.server");
  return fetchRoomDrops();
});
