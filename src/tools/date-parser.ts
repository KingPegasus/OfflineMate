import * as chrono from "chrono-node";

/** Parse natural language into a start date. Returns null if unparseable. */
export function parseStartDate(text: string): Date | null {
  const ref = new Date();
  const parsed = chrono.parseDate(text, ref, { forwardDate: true });
  return parsed ? new Date(parsed) : null;
}

/** Parse natural language into start and end dates for a range (e.g. "today" -> [startOfDay, endOfDay]). */
export function parseDateRange(text: string): { start: Date; end: Date } | null {
  const normalized = (text || "today").toLowerCase().trim();
  const now = new Date();

  const dayMs = 86400000;
  const startOfDay = (d: Date) => {
    const c = new Date(d);
    c.setHours(0, 0, 0, 0);
    return c;
  };
  const endOfDay = (d: Date) => {
    const c = new Date(d);
    c.setHours(23, 59, 59, 999);
    return c;
  };

  if (normalized === "today") {
    return { start: startOfDay(now), end: endOfDay(now) };
  }
  if (normalized === "tomorrow") {
    const next = new Date(now.getTime() + dayMs);
    return { start: startOfDay(next), end: endOfDay(next) };
  }
  if (/\bthis week\b/i.test(normalized) || normalized === "this week") {
    const start = startOfDay(now);
    const end = new Date(start.getTime() + 7 * dayMs);
    return { start, end };
  }
  if (/\bnext week\b/i.test(normalized) || normalized === "next week") {
    const monday = new Date(now);
    const day = monday.getDay();
    const offset = day === 0 ? 1 : day === 1 ? 7 : 8 - day;
    monday.setDate(monday.getDate() + offset);
    const start = startOfDay(monday);
    const end = new Date(start.getTime() + 7 * dayMs);
    return { start, end };
  }

  const single = chrono.parseDate(normalized, now, { forwardDate: true });
  if (single) {
    const d = new Date(single);
    return { start: startOfDay(d), end: endOfDay(d) };
  }

  return { start: startOfDay(now), end: new Date(now.getTime() + 7 * dayMs) };
}

/** Parse event start datetime from natural language (e.g. "tomorrow at 2pm"). */
export function parseEventStart(text: string): Date | null {
  const ref = new Date();
  const parsed = chrono.parseDate(text, ref, { forwardDate: true });
  return parsed ? new Date(parsed) : null;
}

/** Parse event end from start + duration (default 1 hour). */
export function eventEndFromStart(start: Date, durationMinutes = 60): Date {
  const end = new Date(start);
  end.setMinutes(end.getMinutes() + durationMinutes);
  return end;
}
