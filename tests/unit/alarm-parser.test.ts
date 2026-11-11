import { describe, expect, it } from "vitest";
import { extractAlarmMessage, nextAlarmDate, parseAlarmTime } from "@/tools/alarm-parser";

describe("alarm parser", () => {
  it("parses simple time like 7am", () => {
    const r = parseAlarmTime("set alarm for 7am");
    expect(r).not.toBeNull();
    expect(r!.hour).toBe(7);
    expect(r!.minutes).toBe(0);
  });

  it("parses time with minutes", () => {
    const r = parseAlarmTime("7:30");
    expect(r).not.toBeNull();
    expect(r!.hour).toBe(7);
    expect(r!.minutes).toBe(30);
  });

  it("parses tomorrow at 8", () => {
    const r = parseAlarmTime("tomorrow at 8");
    expect(r).not.toBeNull();
    expect(r!.hour).toBe(8);
    expect(r!.minutes).toBe(0);
    expect(r!.days).toBeDefined();
    expect(r!.days!.length).toBe(1);
  });

  it("extracts alarm message", () => {
    expect(extractAlarmMessage("set alarm for 7am to wake up")).toBe("wake up");
    expect(extractAlarmMessage("set an alarm for 8 to wake me")).toBe("wake me");
    expect(extractAlarmMessage("set an alarm in 5 minutes to stretch")).toBe("stretch");
    expect(extractAlarmMessage("Set alarm for 5mins to stretch")).toBe("stretch");
  });

  it("does not use the time as the alarm label", () => {
    expect(extractAlarmMessage("set an alarm for 7am")).toBeUndefined();
    expect(extractAlarmMessage("set an alarm for tomorrow at 8")).toBeUndefined();
  });

  it("marks only every/daily/weekday phrases as recurring", () => {
    expect(parseAlarmTime("set an alarm every weekday at 9")!.recurring).toBe(true);
    expect(parseAlarmTime("set an alarm daily at 6")!.recurring).toBe(true);
    // "tomorrow" sets one day in `days` but is a one-time alarm.
    const tomorrow = parseAlarmTime("set an alarm for tomorrow at 8")!;
    expect(tomorrow.days).toHaveLength(1);
    expect(tomorrow.recurring).toBeUndefined();
  });
});

describe("nextAlarmDate", () => {
  // Tuesday 10 Nov 2026, 16:50 local time. AlarmTime days: 1=Sunday ... 7=Saturday (Tuesday = 3).
  const now = new Date(2026, 10, 10, 16, 50, 0);

  it("uses today when the time is still ahead", () => {
    expect(nextAlarmDate({ hour: 18, minutes: 30 }, now)).toEqual(new Date(2026, 10, 10, 18, 30, 0));
  });

  it("moves to tomorrow when the time has passed today", () => {
    expect(nextAlarmDate({ hour: 7, minutes: 0 }, now)).toEqual(new Date(2026, 10, 11, 7, 0, 0));
  });

  it("moves to tomorrow when the time is exactly now", () => {
    expect(nextAlarmDate({ hour: 16, minutes: 50 }, now)).toEqual(new Date(2026, 10, 11, 16, 50, 0));
  });

  it("uses the requested weekday (Friday = 6)", () => {
    expect(nextAlarmDate({ hour: 7, minutes: 0, days: [6] }, now)).toEqual(new Date(2026, 10, 13, 7, 0, 0));
  });

  it("goes a week ahead for today's weekday when the time has passed", () => {
    expect(nextAlarmDate({ hour: 9, minutes: 0, days: [3] }, now)).toEqual(new Date(2026, 10, 17, 9, 0, 0));
  });

  it("treats several days (recurring) as the next one-time occurrence", () => {
    expect(nextAlarmDate({ hour: 9, minutes: 0, days: [2, 3, 4, 5, 6] }, now)).toEqual(new Date(2026, 10, 11, 9, 0, 0));
  });
});
