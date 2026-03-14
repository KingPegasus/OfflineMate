import { describe, expect, it } from "vitest";
import { webSearchTool } from "@/tools/search-tool";

describe("search.web local deterministic answers", () => {
  it("answers current date locally without web dependency", async () => {
    const result = await webSearchTool.execute({ query: "what is the current date? check online" });
    expect(result.ok).toBe(true);
    expect(result.payload?.source).toBe("local_datetime");
    expect(result.message.toLowerCase()).toContain("today");
  });

  it("answers current time locally without web dependency", async () => {
    const result = await webSearchTool.execute({ query: "what is the current time right now?" });
    expect(result.ok).toBe(true);
    expect(result.payload?.source).toBe("local_datetime");
    expect(result.message.toLowerCase()).toContain("time");
  });

  it("does not treat queries containing 'date' as date-only (e.g. release date, expiration date)", async () => {
    // These should trigger web search, not return today's date
    const queries = [
      "release date of iPhone",
      "date night restaurants near me",
      "expiration date of milk",
    ];
    for (const query of queries) {
      const result = await webSearchTool.execute({ query });
      expect(result.ok).toBe(true);
      // Should NOT be local_datetime — webSearchTool may mock/search; we just assert it didn't short-circuit
      expect(result.payload?.source).not.toBe("local_datetime");
    }
  });
});
