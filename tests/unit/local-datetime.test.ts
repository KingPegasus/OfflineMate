import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { routeIntent } from "@/ai/intent-router";
import { buildLocalDateTimeAnswer } from "@/utils/local-datetime";
import { runWebSearchPipeline } from "@/tools/web-search-pipeline";

// Curly apostrophes as an iPhone keyboard types them (U+2019).
const CURLY_DATE = "What is today’s date?";
const CURLY_TIME = "What’s the time?";

beforeEach(() => {
  // Thu 12 Nov 2026, 01:45 local time.
  vi.useFakeTimers({ now: new Date(2026, 10, 12, 1, 45, 0), toFake: ["Date"] });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("buildLocalDateTimeAnswer", () => {
  it("answers the date with a straight or curly apostrophe", () => {
    for (const q of ["What is today's date?", CURLY_DATE]) {
      expect(routeIntent(q)).toBe("datetime");
      expect(buildLocalDateTimeAnswer(q)).toMatch(/^Today is Thursday, November 12, 2026 \(/);
    }
  });

  it("answers the time with a curly apostrophe", () => {
    expect(routeIntent(CURLY_TIME)).toBe("datetime");
    expect(buildLocalDateTimeAnswer(CURLY_TIME)).toMatch(/^The current time is /);
  });

  it("returns null for other questions", () => {
    expect(buildLocalDateTimeAnswer("How is today’s weather?")).toBeNull();
  });
});

describe("web search date shortcut", () => {
  it("answers a curly-apostrophe date question locally, without searching", async () => {
    const result = await runWebSearchPipeline({ query: CURLY_DATE });
    expect(result.ok).toBe(true);
    expect(result.message).toMatch(/^Today is Thursday, November 12, 2026 \(/);
    expect(result.payload).toMatchObject({ source: "local_datetime" });
  });
});
