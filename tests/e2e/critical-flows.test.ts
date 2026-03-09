import { buildPrompt } from "@/ai/prompt-builder";
import { executePlanSteps, planStepsFromPrompt } from "@/ai/agent-planner";
import { getInitialRoute } from "@/navigation/initial-route";
import { useSettingsStore } from "@/stores/settings-store";
import { vi } from "vitest";

vi.mock("@/tools/tool-registry", () => ({
  getToolByName: (name: string) => (name === "notes.search" ? { name } : undefined),
  listToolDescriptors: () => [{ name: "notes.search", description: "Search notes", params: {} }],
  selectToolFromInput: () => ({ name: "notes.search" }),
}));

vi.mock("@/context/long-term-memory", () => ({
  getImportantMemories: () => [],
}));

describe("critical flow smoke tests", () => {
  it("first launch routing goes to onboarding before completion", () => {
    expect(getInitialRoute(false, false)).toBeNull();
    expect(getInitialRoute(true, false)).toBe("/onboarding");
    expect(getInitialRoute(true, true)).toBe("/chat");
  });

  it("tier selection remains in store after update", () => {
    useSettingsStore.getState().setSelectedTier("lite");
    expect(useSettingsStore.getState().selectedTier).toBe("lite");
    useSettingsStore.getState().setSelectedTier("full");
    expect(useSettingsStore.getState().selectedTier).toBe("full");
  });

  it("planning + execution provides response context for assistant", async () => {
    const steps = await planStepsFromPrompt(
      { prompt: "Find notes about roadmap and summarize" },
      async () =>
        JSON.stringify({
          steps: [
            {
              id: "1",
              description: "Search notes",
              toolName: "notes.search",
              args: { query: "roadmap" },
            },
            { id: "2", description: "Summarize findings" },
          ],
        }),
    );
    const execution = await executePlanSteps(steps, async () => "Found 2 notes.");
    const prompt = buildPrompt({
      tier: "standard",
      messages: [{ id: "u1", role: "user", content: "Summarize", createdAt: Date.now() }],
      toolResult: execution.toolSummary,
    });
    expect(prompt[0].content).toContain("Tool output");
    expect(prompt[0].content).toContain("Found 2 notes");
  });
});
