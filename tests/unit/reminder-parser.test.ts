import { afterEach, beforeEach, vi } from "vitest";
import {
  describeReminderTime,
  isPastTimeToday,
  resolveReminderSeconds,
  resolveReminderText,
} from "@/tools/reminder-parser";

describe("reminder clock times", () => {
  // Monday 9 Nov 2026, 23:00 local time.
  const now = new Date(2026, 10, 9, 23, 0, 0);
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });
  afterEach(() => vi.useRealTimers());

  const fireTime = (text: string) => new Date(now.getTime() + resolveReminderSeconds(undefined, text) * 1000);

  it("uses the clock time with tomorrow instead of a flat 24 hours", () => {
    const when = fireTime("Remind me tomorrow at 9 AM to call the bank");
    expect([when.getDate(), when.getHours(), when.getMinutes()]).toEqual([10, 9, 0]);
    expect(fireTime("remind me to call the bank tomorrow at 9:30pm").getHours()).toBe(21);
    expect(fireTime("remind me tomorrow at 14:15 to stretch").getMinutes()).toBe(15);
  });

  it("uses the clock time with tonight", () => {
    const at = new Date(2026, 10, 9, 18, 0, 0);
    vi.setSystemTime(at);
    const seconds = resolveReminderSeconds(undefined, "remind me tonight at 8pm to water the plants");
    expect(new Date(at.getTime() + seconds * 1000).getHours()).toBe(20);
  });

  it("schedules 'tomorrow at 9 AM' for 09:00 tomorrow, not now + 24 h", () => {
    const seconds = resolveReminderSeconds(undefined, "remind me tomorrow at 9 AM to call the bank");
    expect(seconds).not.toBe(86400);
    expect(new Date(now.getTime() + seconds * 1000)).toEqual(new Date(2026, 10, 10, 9, 0, 0));
  });

  it("schedules 'today at 5 PM' for 17:00 today", () => {
    const morning = new Date(2026, 10, 9, 10, 30, 0);
    vi.setSystemTime(morning);
    const seconds = resolveReminderSeconds(undefined, "remind me today at 5 PM to pick up the kids");
    expect(new Date(morning.getTime() + seconds * 1000)).toEqual(new Date(2026, 10, 9, 17, 0, 0));
  });

  it("schedules 'in 2 hours' exactly two hours ahead", () => {
    expect(resolveReminderSeconds(undefined, "remind me in 2 hours to stretch")).toBe(7200);
    expect(resolveReminderSeconds(undefined, "remind me in two hours to stretch")).toBe(7200);
  });

  it("moves a clock time that already passed today to tomorrow", () => {
    // 23:00 now, so 9 AM today is gone.
    const seconds = resolveReminderSeconds(undefined, "remind me at 9 AM to call the bank");
    expect(new Date(now.getTime() + seconds * 1000)).toEqual(new Date(2026, 10, 10, 9, 0, 0));
  });

  it("does not schedule 'today at 5 PM' once 5 PM has passed", () => {
    // Firing tomorrow would contradict "today", so the tool asks for a time instead (0 = not scheduled).
    expect(resolveReminderSeconds(undefined, "remind me today at 5 PM to pick up the kids")).toBe(0);
    expect(isPastTimeToday("remind me today at 5 PM to pick up the kids", now)).toBe(true);
    expect(isPastTimeToday("remind me today at 11:30 PM to lock up", now)).toBe(false);
    expect(isPastTimeToday("remind me at 9 AM to call the bank", now)).toBe(false);
  });

  it("keeps the 24-hour offset when there is no clock time", () => {
    expect(resolveReminderSeconds(undefined, "remind me tomorrow")).toBe(86400);
  });

  it("extracts the action when the time comes before or after it", () => {
    expect(resolveReminderText(undefined, "Remind me tomorrow at 9 AM to call the bank")).toBe("call the bank");
    expect(resolveReminderText(undefined, "remind me to call the bank tomorrow at 9:30pm")).toBe("call the bank");
    expect(resolveReminderText(undefined, "remind me to go to the store tonight")).toBe("go to the store");
    expect(resolveReminderText(undefined, "remind me in 5 minutes to call 911 back")).toBe("call 911 back");
  });

  it("describes when the reminder fires", () => {
    expect(describeReminderTime(600, now)).toBe("in 10 minutes");
    expect(describeReminderTime(60, now)).toBe("in 1 minute");
    expect(describeReminderTime(10 * 3600, now)).toMatch(/^tomorrow at 9:00\s?AM$/i);
    expect(describeReminderTime(3 * 86400, now)).toMatch(/Nov 12 at 11:00\s?PM$/i);
  });
});

describe("reminder parser", () => {
  it("uses explicit seconds when provided", () => {
    expect(resolveReminderSeconds("600", "remind me in 10 minutes")).toBe(600);
  });

  it("infers minutes from natural language", () => {
    expect(resolveReminderSeconds(undefined, "Remind me in 10 minutes to drink water")).toBe(600);
  });

  it("infers minutes from number words in natural language", () => {
    expect(resolveReminderSeconds(undefined, "remind me in two minutes to drink water")).toBe(120);
    expect(resolveReminderSeconds(undefined, "remind me after fifteen minutes to stretch")).toBe(900);
  });

  it("uses chrono fallback for more complex duration phrases", () => {
    const seconds = resolveReminderSeconds(undefined, "remind me in half an hour to stretch");
    expect(seconds).toBeGreaterThan(20 * 60);
    expect(seconds).toBeLessThanOrEqual(40 * 60);
  });

  it("extracts concise reminder text", () => {
    expect(resolveReminderText("Remind me in 10 minutes to drink water")).toBe("drink water");
    expect(resolveReminderText("Remind me in two minutes to drink water")).toBe("drink water");
  });

  it("falls back to query text when explicit text is empty", () => {
    expect(resolveReminderText("", "Remind me in 5 minutes to sleep")).toBe("sleep");
    expect(resolveReminderSeconds(undefined, "Remind me in 5 minutes to sleep")).toBe(300);
  });

  it("strips trailing time from reminder body so notification shows only the action", () => {
    expect(resolveReminderText(undefined, "Remind me to eat icecream in 3 mins.")).toBe("eat icecream");
    expect(resolveReminderText(undefined, "Remind me in 5 minutes to call mom")).toBe("call mom");
    expect(resolveReminderText(undefined, "Remind me to wake up tomorrow same time.")).toBe("wake up");
  });

  it("parses relative times: tomorrow / same time as ~24h", () => {
    expect(resolveReminderSeconds(undefined, "Remind me to wake up tomorrow same time.")).toBe(86400);
    expect(resolveReminderSeconds(undefined, "remind me tomorrow")).toBe(86400);
  });

  it("returns 0 when no duration can be parsed (caller should not default to 60s)", () => {
    expect(resolveReminderSeconds(undefined, "remind me to buy milk")).toBe(0);
  });

  it("falls back safely", () => {
    expect(resolveReminderSeconds(undefined, "please remind me")).toBe(0);
    expect(resolveReminderText(undefined, undefined)).toBe("Reminder");
  });
});

