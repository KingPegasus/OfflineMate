import type { ChatMessage } from "@/types/assistant";
import { vi } from "vitest";

vi.mock("@/tools/tool-registry", () => ({
  getToolByName: (name: string) => (name === "notes.search" ? { name, params: {} } : undefined),
  listToolDescriptors: () => [{ name: "notes.search", description: "Search notes", params: {} }],
  selectToolFromInput: () => ({ name: "notes.search" }),
  filterArgsForTool: (tool: { name: string }, args: Record<string, string>) => args,
}));

describe("agent planner", () => {
  it("parses and validates planner JSON output", async () => {
    const { planStepsFromPrompt } = await import("@/ai/agent-planner");
    const generate = async (_messages: ChatMessage[]) =>
      JSON.stringify({
        steps: [
          {
            id: "1",
            description: "Find notes",
            toolName: "notes.search",
            args: { query: "meeting" },
          },
        ],
      });

    const steps = await planStepsFromPrompt({ prompt: "Find my meeting notes" }, generate);
    expect(steps).toHaveLength(1);
    expect(steps[0].toolName).toBe("notes.search");
  });

  it("falls back to deterministic planning on invalid model output", async () => {
    const { planStepsFromPrompt } = await import("@/ai/agent-planner");
    const steps = await planStepsFromPrompt(
      { prompt: "Remind me tomorrow at 9" },
      async () => "not-json",
    );
    expect(steps.length).toBeGreaterThan(0);
    expect(steps[0].description).toContain("Execute");
  });

  it("executes tool steps sequentially and returns summaries", async () => {
    const { executePlanSteps } = await import("@/ai/agent-planner");
    const result = await executePlanSteps(
      [
        { id: "1", description: "Search", toolName: "notes.search", args: { query: "q" } },
        { id: "2", description: "Respond" },
      ],
      async (toolName) => `${toolName} done`,
    );
    expect(result.toolSummary).toContain("notes.search done");
    expect(result.planSummary).toContain("Search");
  });
});
