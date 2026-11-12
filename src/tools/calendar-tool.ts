import * as Calendar from "expo-calendar/legacy";
import type { Calendar as CalendarRecord } from "expo-calendar/legacy";
import { wantsCalendarAddIntent } from "@/ai/intent-router";
import type { Tool } from "@/tools/tool-registry";
import { parseDateRange, parseEventStart, eventEndFromStart } from "@/tools/date-parser";
import { permissionOffMessage } from "@/tools/permission-message";

async function ensureCalendarPermissions() {
  const current = await Calendar.getCalendarPermissionsAsync();
  if (current.granted) return true;
  const requested = await Calendar.requestCalendarPermissionsAsync();
  return requested.granted;
}

function getWritableCalendar(calendars: CalendarRecord[]): CalendarRecord | undefined {
  return calendars.find((c) => c.allowsModifications ?? true) ?? calendars[0];
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

const timeOf = (d: Date) => d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
const dayOf = (d: Date) => d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });

/** "today", "tomorrow", "on Fri, Nov 20", or "from Mon, Nov 16 to Sun, Nov 22", for the reply. */
export function describeDateRange(range: { start: Date; end: Date }, now: Date = new Date()): string {
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (isSameDay(range.start, range.end)) {
    if (isSameDay(range.start, now)) return "today";
    if (isSameDay(range.start, tomorrow)) return "tomorrow";
    return `on ${dayOf(range.start)}`;
  }
  // parseDateRange ends a week at midnight of the 8th day; show the last day the range covers.
  const lastDay = new Date(range.end.getTime() - 1);
  return `from ${dayOf(range.start)} to ${dayOf(lastDay)}`;
}

/** 'Added "Dentist appointment" tomorrow, 3:00 PM – 4:00 PM.' */
export function describeCreatedEvent(title: string, start: Date, end: Date, now: Date = new Date()): string {
  const day = describeDateRange({ start, end: start }, now);
  return `Added "${title}" ${day}, ${timeOf(start)} – ${timeOf(end)}.`;
}

/** "Dentist appointment, 3:00 PM – 4:00 PM" (the day too when the range spans several days). */
export function describeEvent(
  e: { title?: string | null; startDate?: string | Date; endDate?: string | Date; allDay?: boolean },
  sameDay: boolean,
): string {
  const title = e.title?.trim() || "Untitled";
  if (!e.startDate) return title;
  const start = new Date(e.startDate);
  const day = sameDay ? "" : `${dayOf(start)} `;
  if (e.allDay) return `${title}, ${day}all day`.replace(/, $/, "");
  const end = e.endDate ? new Date(e.endDate) : null;
  const span = end && end > start ? `${timeOf(start)} – ${timeOf(end)}` : timeOf(start);
  return `${title}, ${day}${span}`;
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
        message: permissionOffMessage("Calendar"),
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
    const label = describeDateRange(range);
    const sameDay = isSameDay(range.start, range.end);
    const summary = events.map((e) => `- ${describeEvent(e, sameDay)}`);
    const message =
      events.length === 0
        ? `No events ${label}.`
        : `${events.length} ${events.length === 1 ? "event" : "events"} ${label}:\n${summary.join("\n")}`;
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

/** "Book a meeting with the bank on Friday at 10am" -> "meeting with the bank"; null when it isn't an add command. */
export function titleFromCommand(text: string): string | null {
  const m = text.trim().match(COMMAND_TITLE);
  const title = m?.[1]?.replace(CALENDAR_SUFFIX, "").trim();
  return title || null;
}
const COMMAND_TITLE =
  /^(?:please\s+)?(?:add|create|schedule|book|put|set up|make)\s+(?:a\s+|an\s+|my\s+)?(.+?)\s+(?:tomorrow|today|tonight|at|on|next|this)\b/i;
const CALENDAR_SUFFIX = /\s+(?:to|on|in)\s+(?:my\s+|the\s+)?calendar$/i;

/** Extract event title from query (e.g. "Meeting with John tomorrow at 2pm" -> "Meeting with John"). */
export function extractEventTitle(query: string, startStr?: string): string {
  const text = (query || "").trim();
  if (!text) return "Event";
  const lower = text.toLowerCase();
  const patterns = [
    /\b(?:schedule|create|add|set up)\s+(?:a\s+)?(?:meeting|event)\s+(?:called?\s+)?(.+?)(?:\s+(?:tomorrow|today|at|on|next))/i,
    /\b(?:meeting|event)\s+(?:with\s+)?(.+?)(?:\s+(?:tomorrow|today|at|on|next))/i,
    // "Add dentist appointment tomorrow at 3pm" -> "Dentist appointment"
    /^(?:please\s+)?(?:add|create|schedule|book|put|set up|make)\s+(?:a\s+|an\s+|my\s+)?(.+?)\s+(?:tomorrow|today|tonight|at|on|next|this)\b/i,
    /^(.+?)\s+(?:tomorrow|today|at|on|next\s+(?:monday|week))/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    const title = m?.[1]?.replace(/\s+(?:to|on|in)\s+(?:my\s+|the\s+)?calendar$/i, "").trim();
    if (title) return title.charAt(0).toUpperCase() + title.slice(1);
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
  matches: wantsCalendarAddIntent,
  params: { optional: ["title", "start", "end", "location", "notes"] },
  execute: async (params) => {
    const granted = await ensureCalendarPermissions();
    if (!granted) {
      return {
        ok: false,
        message: permissionOffMessage("Calendar"),
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
    // The user's own words ("Add dinner with Ali tomorrow…") beat the planner's title, which can be partial ("The bank").
    const rawTitle = titleFromCommand(sourceText) || params.title?.trim() || extractEventTitle(sourceText, params.start);
    const title = rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1);
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
    // The planner sometimes passes the start time again as the end; fall back to an hour.
    const end = parsedEnd && parsedEnd > start ? parsedEnd : eventEndFromStart(start, 60);
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
      const msg = describeCreatedEvent(title || "Event", start, end);
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
