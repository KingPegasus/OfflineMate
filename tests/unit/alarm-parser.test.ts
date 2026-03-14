import { describe, expect, it } from "vitest";
import { extractAlarmMessage, parseAlarmTime } from "@/tools/alarm-parser";

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
  });
});
