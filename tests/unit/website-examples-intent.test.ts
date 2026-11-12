/**
 * Regression tests for marketing copy on website/index.html (feature-example lines).
 * Validates routeIntent only: the gate for tool / context / direct in useLLMChat. What each tool replies
 * is covered by keyword-notes, tool-wording and contacts-tool tests; all examples were also run end to end
 * on the Lite tier for 0.11.0 (planner, permissions, network and model output aren't unit-testable here).
 */
import { describe, expect, it } from "vitest";
import { routeIntent } from "@/ai/intent-router";
describe("website index.html examples → routeIntent", () => {
  it("tiered chat example is direct (no tool/RAG gate)", () => {
    expect(routeIntent("Explain recursion like I'm new to code")).toBe("direct");
    expect(routeIntent("Explain recursion like I’m new to code")).toBe("direct"); // U+2019 apostrophe
  });

  it("semantic memory example is context (RAG path when tier allows)", () => {
    expect(routeIntent("What did I save about the dentist?")).toBe("context");
  });

  it("device tools examples are tool", () => {
    expect(routeIntent("Remind me in 20 minutes to stretch")).toBe("tool");
    expect(routeIntent("What's on my calendar tomorrow?")).toBe("tool");
    expect(routeIntent("What’s on my calendar tomorrow?")).toBe("tool"); // U+2019 as on the site
  });

  it("web search example is tool", () => {
    expect(routeIntent("Search for population of Tokyo")).toBe("tool");
  });

  it("voice example (same pipeline as typed text) is tool", () => {
    expect(routeIntent("Add a note to pick up bread")).toBe("tool");
  });

  it("intent routing blurb: Remind me… still hits remind keyword", () => {
    expect(routeIntent("Remind me…")).toBe("tool"); // U+2026 ellipsis as on the site
    expect(routeIntent("Remind me...")).toBe("tool");
  });
});
