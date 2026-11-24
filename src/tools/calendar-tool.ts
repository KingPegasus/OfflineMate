import * as Calendar from "expo-calendar/legacy";
import type { Calendar as CalendarRecord } from "expo-calendar/legacy";
import { wantsCalendarAddIntent } from "@/ai/intent-router";
import type { Tool } from "@/tools/tool-registry";
import { parseDateRange, parseEventStart, eventEndFromStart } from "@/tools/date-parser";
import { findMeetingLink, type MeetingLink, type MeetingService } from "@/tools/meeting-link";
import { permissionOffMessage } from "@/tools/permission-message";
import type { MessageLink } from "@/types/assistant";
import { waitingForUser } from "@/utils/user-wait";

async function ensureCalendarPermissions() {
  const current = await Calendar.getCalendarPermissionsAsync();
  if (current.granted) return true;
  const requested = await waitingForUser(Calendar.requestCalendarPermissionsAsync());
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

/**
 * "Dentist appointment, 3:00 PM – 4:00 PM" (the day too when the range spans several days), with
 * " · Google Meet" when the event has a meeting link (its Join button sits under the reply).
 */
export function describeEvent(
  e: { title?: string | null; startDate?: string | Date; endDate?: string | Date; allDay?: boolean },
  sameDay: boolean,
  meeting?: MeetingService | null,
): string {
  const title = e.title?.trim() || "Untitled";
  const via = meeting ? ` · ${meeting}` : "";
  if (!e.startDate) return `${title}${via}`;
  const start = new Date(e.startDate);
  const day = sameDay ? "" : `${dayOf(start)} `;
  if (e.allDay) return `${title}, ${day}all day`.replace(/, $/, "") + via;
  const end = e.endDate ? new Date(e.endDate) : null;
  const span = end && end > start ? `${timeOf(start)} – ${timeOf(end)}` : timeOf(start);
  return `${title}, ${day}${span}${via}`;
}

type CalendarEventLike = {
  id?: string;
  title?: string | null;
  startDate?: string | Date;
  endDate?: string | Date;
  allDay?: boolean;
  location?: string | null;
  notes?: string | null;
  url?: string | null;
};

/** The event's meeting link: the location (Teams/Zoom invites), then iOS's URL field, then the description. */
export function eventMeetingLink(e: CalendarEventLike): MeetingLink | null {
  return findMeetingLink(e.location, e.url, e.notes);
}

/**
 * Join buttons for events with a meeting link. One event: "Join Google Meet". Several: the event's
 * title is added so each button says which meeting it opens.
 */
export function joinButtons(items: { title?: string | null; link: MeetingLink | null }[]): MessageLink[] {
  const withLinks = items.filter((i): i is { title?: string | null; link: MeetingLink } => !!i.link);
  return withLinks.map(({ title, link }) => ({
    label: withLinks.length > 1 ? `Join ${link.service}: ${title?.trim() || "Untitled"}` : `Join ${link.service}`,
    url: link.url,
  }));
}

/** "When's my next meeting?", "Join my next call", "What's my next event?" */
export function asksForNextEvent(text: string): { join: boolean } | null {
  const t = text.toLowerCase();
  const join = /\bjoin\b/.test(t) && /\b(meeting|call)\b/.test(t);
  if (join || /\b(next|upcoming)\s+(meeting|call|event|appointment)\b/.test(t)) return { join };
  return null;
}

const NEXT_EVENT_DAYS = 14;

/** "in 25 min", "in 2 hr 5 min", or "" once it has started. */
export function startsIn(start: Date, now: Date = new Date()): string {
  const mins = Math.round((start.getTime() - now.getTime()) / 60000);
  if (mins <= 0) return "";
  if (mins < 60) return `in ${mins} min`;
  if (mins < 24 * 60) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m ? `in ${h} hr ${m} min` : `in ${h} hr`;
  }
  return "";
}

/** The next event that hasn't ended (with a meeting link, for "join my next meeting"), as a reply. */
export function describeNextEvent(
  events: CalendarEventLike[],
  join: boolean,
  now: Date = new Date(),
): { message: string; links: MessageLink[]; event: CalendarEventLike | null } {
  const upcoming = events
    .filter((e) => e.startDate && !e.allDay && new Date(e.endDate ?? e.startDate) > now)
    .sort((a, b) => new Date(a.startDate!).getTime() - new Date(b.startDate!).getTime());
  const next = join ? upcoming.find((e) => eventMeetingLink(e)) : upcoming[0];
  if (!next) {
    return {
      message: join
        ? `No meetings with a Zoom, Google Meet, Teams or Webex link in the next ${NEXT_EVENT_DAYS} days.`
        : `Nothing on your calendar in the next ${NEXT_EVENT_DAYS} days.`,
      links: [],
      event: null,
    };
  }
  const link = eventMeetingLink(next);
  const start = new Date(next.startDate!);
  const started = start <= now;
  const day = describeDateRange({ start, end: start }, now);
  const when = started ? `started at ${timeOf(start)}` : `${day} at ${timeOf(start)}`;
  const soon = startsIn(start, now);
  const lead = join || link ? "Your next meeting" : "Next on your calendar";
  const message = `${lead}: ${next.title?.trim() || "Untitled"}, ${when}${soon ? ` (${soon})` : ""}${link ? ` · ${link.service}` : ""}.`;
  return { message, links: joinButtons([{ title: next.title, link }]), event: next };
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
      return {
        ok: true,
        message:
          "There's no calendar on this phone yet. Add a Google account (or another calendar account) in your phone's settings, and its events will show here.",
        payload: { events: [] },
      };
    }
    const query = (params.query || params.text || "today").trim();
    const calendarIds = calendars.map((c) => c.id);
    const next = asksForNextEvent(`${params.text ?? ""} ${params.query ?? ""}`);
    if (next) {
      const now = new Date();
      const until = new Date(now.getTime() + NEXT_EVENT_DAYS * 86400000);
      // From the start of today, so a meeting that has started but not ended still counts.
      const from = new Date(now);
      from.setHours(0, 0, 0, 0);
      const events = await Calendar.getEventsAsync(calendarIds, from, until);
      const reply = describeNextEvent(events, next.join, now);
      return {
        ok: true,
        message: reply.message,
        links: reply.links,
        payload: { next: reply.event ? { title: reply.event.title, startDate: reply.event.startDate } : null },
      };
    }
    const range = parseDateRange(query);
    if (!range) {
      return {
        ok: false,
        message: "Could not parse date. Try \"today\", \"tomorrow\", or \"next week\".",
        errorCode: "PARSE_FAILURE",
      };
    }
    const events = await Calendar.getEventsAsync(calendarIds, range.start, range.end);
    const label = describeDateRange(range);
    const sameDay = isSameDay(range.start, range.end);
    const meetings = events.map((e) => eventMeetingLink(e));
    const summary = events.map((e, i) => `- ${describeEvent(e, sameDay, meetings[i]?.service)}`);
    const message =
      events.length === 0
        ? `No events ${label}.`
        : `${events.length} ${events.length === 1 ? "event" : "events"} ${label}:\n${summary.join("\n")}`;
    return {
      ok: true,
      message,
      links: joinButtons(events.map((e, i) => ({ title: e.title, link: meetings[i] }))),
      payload: {
        // The meeting's service, not its link: the link goes to the Join button, not into the model's prompt.
        events: events.map((e, i) => ({
          id: e.id,
          title: e.title,
          startDate: e.startDate,
          endDate: e.endDate,
          location: e.location,
          ...(meetings[i] && { meeting: meetings[i]!.service }),
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
// Stops at the first word of the date or time, weekdays included ("dentist appointment Friday at 3pm").
const COMMAND_TITLE =
  /^(?:please\s+)?(?:add|create|schedule|book|put|set up|make)\s+(?:a\s+|an\s+|my\s+)?(.+?)\s+(?:tomorrow|today|tonight|at|on|next|this|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i;
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
    /^(?:please\s+)?(?:add|create|schedule|book|put|set up|make)\s+(?:a\s+|an\s+|my\s+)?(.+?)\s+(?:tomorrow|today|tonight|at|on|next|this|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
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
      return {
        ok: false,
        message:
          "There's no calendar on this phone to add this to. Add a Google account (or another calendar account) in your phone's settings, then ask again.",
      };
    }
    const calendar = getWritableCalendar(calendars);
    if (!calendar) {
      return {
        ok: false,
        message:
          "Your phone's calendars can't take new events. Add a Google account (or another calendar account) in your phone's settings, then ask again.",
      };
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
