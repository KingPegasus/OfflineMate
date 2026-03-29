import { describe, expect, it } from "vitest";
import { routeIntent } from "@/ai/intent-router";
import { runWebSearchPipeline } from "@/tools/web-search-pipeline";

const live = process.env.OFFLINEMATE_LIVE_SEARCH === "1";

/**
 * Hits DuckDuckGo (network). Not run in default CI.
 *
 * OFFLINEMATE_LIVE_SEARCH=1 npx vitest run tests/integration/live-web-search.test.ts
 */
describe.runIf(live)("live web search — same pipeline as app (runWebSearchPipeline)", () => {
  it("routes website-style queries to tool and returns substantive text", async () => {
    const q = "Search for population of Tokyo";
    expect(routeIntent(q)).toBe("tool");
    const r = await runWebSearchPipeline({ query: q, text: q });
    expect(r.ok).toBe(true);
    expect(r.message.length).toBeGreaterThan(30);
    if ("payload" in r && r.payload && "source" in r.payload) {
      expect(r.payload.source).not.toBe("local_datetime");
    }
  });

  it("handles current-price style query", async () => {
    const q = "What is the current price of bitcoin?";
    expect(routeIntent(q)).toBe("tool");
    const r = await runWebSearchPipeline({ query: q, text: q });
    expect(r.ok).toBe(true);
    expect(r.message.length).toBeGreaterThan(10);
  });
});
