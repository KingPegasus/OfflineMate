import { describe, expect, it } from "vitest";
import { parseDateRange, parseEventStart } from "@/tools/date-parser";

describe("date parser", () => {
  it("parses today range", () => {
    const r = parseDateRange("today");
    expect(r).not.toBeNull();
    expect(r!.start.getHours()).toBe(0);
    expect(r!.start.getMinutes()).toBe(0);
    expect(r!.end.getHours()).toBe(23);
    expect(r!.end.getMinutes()).toBe(59);
  });

  it("parses tomorrow range", () => {
    const r = parseDateRange("tomorrow");
    expect(r).not.toBeNull();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(r!.start.getDate()).toBe(tomorrow.getDate());
  });

  it("parses event start from natural language", () => {
    const r = parseEventStart("tomorrow at 2pm");
    expect(r).not.toBeNull();
    expect(r!.getHours()).toBe(14);
  });
});
