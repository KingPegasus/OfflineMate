import * as Calendar from "expo-calendar";
import type { Tool } from "@/tools/tool-registry";

async function ensureCalendarPermissions() {
  const current = await Calendar.getCalendarPermissionsAsync();
  if (current.granted) return true;
  const requested = await Calendar.requestCalendarPermissionsAsync();
  return requested.granted;
}

export const getCalendarEventsTool: Tool = {
  name: "calendar.getEvents",
  description: "Fetch events from device calendar for a date range",
  keywords: ["calendar", "event", "meeting", "schedule"],
  params: { optional: ["query"] },
  execute: async () => {
    const granted = await ensureCalendarPermissions();
    if (!granted) return { ok: false, message: "Calendar permission denied." };
    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    return {
      ok: true,
      message: `Found ${calendars.length} calendars.`,
      payload: { calendars: calendars.map((c) => ({ id: c.id, title: c.title })) },
    };
  },
};

export const createCalendarTool: Tool = {
  name: "calendar.createEvent",
  description: "Create an event in the default calendar",
  keywords: ["create event", "add event", "schedule meeting"],
  params: { optional: ["title", "start", "end", "location", "notes"] },
  execute: async () => ({ ok: true, message: "Event creation flow placeholder." }),
};

