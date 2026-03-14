import * as Calendar from "expo-calendar";
import type { Tool } from "@/tools/tool-registry";
import { parseDateRange, parseEventStart, eventEndFromStart } from "@/tools/date-parser";

async function ensureCalendarPermissions() {
  const current = await Calendar.getCalendarPermissionsAsync();
  if (current.granted) return true;
  const requested = await Calendar.requestCalendarPermissionsAsync();
  return requested.granted;
}

function getWritableCalendar(calendars: Calendar.Calendar[]): Calendar.Calendar | undefined {
  return calendars.find((c) => c.allowsModifications ?? true) ?? calendars[0];
}

export const getCalendarEventsTool: Tool = {
  name: "calendar.getEvents",
  description: "Fetch events from device calendar for a date range",
  keywords: ["calendar", "event", "meeting", "schedule"],
  params: { optional: ["query"] },
  execute: async (params) => {
    const granted = await ensureCalendarPermissions();
    if (!granted) {
      return {
        ok: false,
        message: "Calendar permission denied. Please enable it in Settings.",
        errorCode: "PERMISSION_DENIED",
        retryable: true,
      };
    }
    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    if (calendars.length === 0) {
      return { ok: true, message: "No calendars found.", payload: { events: [] } };
    }
    const query = (params.query || params.text || "today").trim();
    const range = parseDateRange(query);
    if (!range) {
      return {
        ok: false,
        message: "Could not parse date. Try \"today\", \"tomorrow\", or \"next week\".",
        errorCode: "PARSE_FAILURE",
      };
    }
    const calendarIds = calendars.map((c) => c.id);
    const events = await Calendar.getEventsAsync(calendarIds, range.start, range.end);
    const summary = events.map((e) => {
      const start = e.startDate ? new Date(e.startDate).toLocaleString() : "?";
      const end = e.endDate ? new Date(e.endDate).toLocaleString() : "";
      return `${e.title ?? "Untitled"} (${start}${end ? ` - ${end}` : ""})`;
    });
    const message =
      events.length === 0
        ? `No events found for ${query}.`
        : `Found ${events.length} event(s):\n${summary.join("\n")}`;
    return {
      ok: true,
      message,
      payload: {
        events: events.map((e) => ({
          id: e.id,
          title: e.title,
          startDate: e.startDate,
          endDate: e.endDate,
          location: e.location,
        })),
      },
    };
  },
};

/** Extract event title from query (e.g. "Meeting with John tomorrow at 2pm" -> "Meeting with John"). */
function extractEventTitle(query: string, startStr?: string): string {
  const text = (query || "").trim();
  if (!text) return "Event";
  const lower = text.toLowerCase();
  const patterns = [
    /\b(?:schedule|create|add|set up)\s+(?:a\s+)?(?:meeting|event)\s+(?:called?\s+)?(.+?)(?:\s+(?:tomorrow|today|at|on|next))/i,
    /\b(?:meeting|event)\s+(?:with\s+)?(.+?)(?:\s+(?:tomorrow|today|at|on|next))/i,
    /^(.+?)\s+(?:tomorrow|today|at|on|next\s+(?:monday|week))/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m?.[1]) return m[1].trim();
  }
  if (startStr && lower.includes(startStr.toLowerCase())) {
    const idx = lower.indexOf(startStr.toLowerCase());
    return text.slice(0, idx).trim() || text;
  }
  return text.slice(0, 80);
}

export const createCalendarTool: Tool = {
  name: "calendar.createEvent",
  description: "Create an event in the default calendar",
  keywords: ["create event", "add event", "schedule meeting"],
  params: { optional: ["title", "start", "end", "location", "notes"] },
  execute: async (params) => {
    const granted = await ensureCalendarPermissions();
    if (!granted) {
      return {
        ok: false,
        message: "Calendar permission denied. Please enable it in Settings.",
        errorCode: "PERMISSION_DENIED",
        retryable: true,
      };
    }
    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    if (calendars.length === 0) {
      return { ok: false, message: "No calendars available to add events." };
    }
    const calendar = getWritableCalendar(calendars);
    if (!calendar) {
      return { ok: false, message: "No writable calendar found." };
    }
    const sourceText = (params.text || params.query || "").trim();
    const title =
      params.title?.trim() ||
      extractEventTitle(sourceText, params.start);
    const startStr = params.start?.trim() || sourceText;
    const start = parseEventStart(startStr);
    if (!start) {
      return {
        ok: false,
        message: "Could not parse when. Try something like \"tomorrow at 2pm\" or \"March 15 at 10am\".",
        errorCode: "PARSE_FAILURE",
      };
    }
    const endStr = params.end?.trim();
    const parsedEnd = endStr ? parseEventStart(endStr) : null;
    const end = parsedEnd ?? eventEndFromStart(start, 60);
    const location = params.location?.trim();
    const notes = params.notes?.trim();

    try {
      const id = await Calendar.createEventAsync(calendar.id, {
        title: title || "Event",
        startDate: start,
        endDate: end,
        ...(location && { location }),
        ...(notes && { notes }),
      });
      const msg = `Created "${title || "Event"}" on ${start.toLocaleDateString()} at ${start.toLocaleTimeString()}.`;
      return { ok: true, message: msg, payload: { eventId: id } };
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : "Failed to create event.";
      return {
        ok: false,
        message: `Could not create event: ${errMsg}`,
        errorCode: "UNKNOWN",
        retryable: true,
      };
    }
  },
};
