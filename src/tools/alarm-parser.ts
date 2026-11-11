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
  /** True for "every …" / "daily" / weekday phrases. A single day in `days` without this is a one-time date ("tomorrow"). */
  recurring?: boolean;
  message?: string;
}

/**
 * The exact moment an alarm for `time` should ring, for APIs that take a date (iOS AlarmKit).
 * One weekday in `days` (e.g. "tomorrow at 8", "Friday at 7") means the next such day; otherwise
 * today if the time is still ahead, else tomorrow. Recurring alarms are set as one-time, as on Android.
 */
export function nextAlarmDate(time: Pick<AlarmTime, "hour" | "minutes" | "days">, now: Date = new Date()): Date {
  const target = new Date(now);
  target.setHours(time.hour, time.minutes, 0, 0);
  const singleDay = time.days?.length === 1 ? time.days[0] : undefined;
  if (singleDay !== undefined) {
    const daysAhead = (singleDay - toAlarmDay(now.getDay()) + 7) % 7;
    target.setDate(target.getDate() + daysAhead);
    if (target.getTime() <= now.getTime()) target.setDate(target.getDate() + 7);
  } else if (target.getTime() <= now.getTime()) {
    target.setDate(target.getDate() + 1);
  }
  return target;
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

  return {
    hour,
    minutes,
    ...(days && days.length > 0 ? { days } : {}),
    ...(recurring && { recurring: true }),
    ...(message && { message }),
  };
}

/** Extract alarm message from query (e.g. "set alarm for 7am to wake up" -> "wake up"). */
export function extractAlarmMessage(query: string): string | undefined {
  // The label follows "to": "alarm for 7am to wake up", "alarm in 5 minutes to stretch". Without a
  // "to", "alarm for 7am" has no label (it used to return "7am").
  const m = query.match(/(?:set\s+)?(?:an?\s+)?alarm\s+(?:(?:for|in|at)\s+.+?\s+)?to\s+(.+)$/i);
  return m?.[1]?.trim();
}
