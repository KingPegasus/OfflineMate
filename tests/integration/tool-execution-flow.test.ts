import { describe, expect, it } from "vitest";
import { parseDateRange } from "@/tools/date-parser";
import { parseAlarmTime } from "@/tools/alarm-parser";
import { routeIntent } from "@/ai/intent-router";

describe("tool execution flow", () => {
  it("routes alarm prompt to tool intent", () => {
    expect(routeIntent("set alarm for 7am tomorrow")).toBe("tool");
  });

  it("routes calendar prompt to tool intent", () => {
    expect(routeIntent("what's on my calendar today")).toBe("tool");
  });

  it("parses date range for calendar get", () => {
    const r = parseDateRange("today");
    expect(r).not.toBeNull();
    expect(r!.start.getHours()).toBe(0);
  });

  it("parses alarm time for set alarm", () => {
    const r = parseAlarmTime("7am");
    expect(r).not.toBeNull();
    expect(r!.hour).toBe(7);
    expect(r!.minutes).toBe(0);
  });
});
