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
  /** The moment chrono resolved ("November 20 at 7am" → that day). Keeps dates more than a week out. */
  date?: Date;
  /**
   * True when `date` is an exact moment rather than a clock time: relative phrases ("in 2 minutes")
   * keep the current seconds. `hour`/`minutes` are then rounded up, so a minute-only alarm is never early.
   */
  exact?: boolean;
  message?: string;
}

/**
 * The exact moment an alarm should ring, for APIs that take a date (iOS AlarmKit), at `hour:minutes`:
 * - recurring (or no resolved `date`) with `days`: the next day whose weekday is in `days`
 *   ("every weekday at 9" on a Friday evening → Monday). Recurring alarms are set as one-time, as on Android.
 * - otherwise the resolved `date` ("November 20", "tomorrow"), if that's still ahead;
 * - otherwise today if the time is still ahead, else tomorrow.
 */
export function nextAlarmDate(
  time: Pick<AlarmTime, "hour" | "minutes" | "days" | "recurring" | "date">,
  now: Date = new Date(),
): Date {
  const atTime = (day: Date, daysAhead = 0) => {
    const t = new Date(day);
    t.setDate(t.getDate() + daysAhead);
    t.setHours(time.hour, time.minutes, 0, 0);
    return t;
  };
  if (time.days?.length && (time.recurring || !time.date)) {
    for (let ahead = 0; ahead <= 7; ahead++) {
      const candidate = atTime(now, ahead);
      if (candidate > now && time.days.includes(toAlarmDay(candidate.getDay()))) return candidate;
    }
  }
  if (time.date) {
    const onDate = atTime(time.date);
    if (onDate > now) return onDate;
  }
  const today = atTime(now);
  return today > now ? today : atTime(now, 1);
}

/** Parse "7am", "7:30", "tomorrow at 8", "every weekday at 9" into AlarmTime. */
export function parseAlarmTime(text: string): AlarmTime | null {
  const ref = new Date();
  const parsed = chrono.parseDate(text, ref, { forwardDate: true });
  if (!parsed) return null;
  const d = new Date(parsed);
  // "in 2 minutes" sent at 00:12:51 is 00:14:51. Dropping the seconds (00:14) rang about a minute
  // early, so round up to the next whole minute (00:15) for APIs that take only hour and minute.
  const exact = d.getSeconds() !== 0 || d.getMilliseconds() !== 0;
  const clock = exact ? new Date(Math.ceil(d.getTime() / 60000) * 60000) : d;

  const hour = clock.getHours();
  const minutes = clock.getMinutes();

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
    date: d,
    ...(exact && { exact: true }),
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
