import * as chrono from "chrono-node";

/** Calendar.SUNDAY=1, MONDAY=2, ... SATURDAY=7 (JavaScript getDay() is 0=Sun, so +1) */
function toAlarmDay(jsDay: number): number {
  return jsDay + 1;
}

export interface AlarmTime {
  hour: number;
  minutes: number;
  /** Recurring: [1-7] for each weekday. One-time: single day or empty for "next occurrence". */
  days?: number[];
  message?: string;
}

/** Parse "7am", "7:30", "tomorrow at 8", "every weekday at 9" into AlarmTime. */
export function parseAlarmTime(text: string): AlarmTime | null {
  const ref = new Date();
  const parsed = chrono.parseDate(text, ref, { forwardDate: true });
  if (!parsed) return null;
  const d = new Date(parsed);

  const hour = d.getHours();
  const minutes = d.getMinutes();

  const lower = text.toLowerCase();
  const everyWeekday = /\b(?:every\s+)?(?:weekday|week\s*day|mon|tue|wed|thu|fri)\b/i.test(lower);
  const recurring = /\b(?:every|daily|each\s+day)\b/i.test(lower) || everyWeekday;

  let days: number[] | undefined;
  if (recurring) {
    if (everyWeekday || /\bweekday\b/i.test(lower)) {
      days = [2, 3, 4, 5, 6]; // Mon–Fri
    } else {
      const day = toAlarmDay(d.getDay());
      days = [day];
    }
  } else {
    const target = new Date(ref);
    if (d.getDate() !== target.getDate() || d.getMonth() !== target.getMonth() || d.getFullYear() !== target.getFullYear()) {
      days = [toAlarmDay(d.getDay())];
    }
  }

  const msgMatch = text.match(/(?:for|to|about)\s+(.+)$/i);
  const message = msgMatch?.[1]?.trim() || undefined;

  return { hour, minutes, ...(days && days.length > 0 ? { days } : {}), ...(message && { message }) };
}

/** Extract alarm message from query (e.g. "set alarm for 7am to wake up" -> "wake up"). */
export function extractAlarmMessage(query: string): string | undefined {
  const m = query.match(/(?:set\s+)?(?:an?\s+)?alarm\s+(?:for\s+[^t]+?\s+)?(?:to|for)\s+(.+)$/i);
  return m?.[1]?.trim();
}
