import { performance } from "node:perf_hooks";
import { vi } from "vitest";
import { generateEmbedding } from "@/context/embeddings";
import { planStepsFromPrompt } from "@/ai/agent-planner";
import { retrieveContextForQuery } from "@/ai/rag-pipeline";
import type { ChatMessage } from "@/types/assistant";

vi.mock("@/tools/tool-registry", () => ({
  getToolByName: (name: string) => (name === "notes.search" ? { name } : undefined),
  listToolDescriptors: () => [{ name: "notes.search", description: "Search notes", params: {} }],
  selectToolFromInput: () => ({ name: "notes.search" }),
}));

vi.mock("@/context/vector-store", () => ({
  searchRelevantContext: vi.fn(async (_q: string, topK: number) =>
    Array.from({ length: topK }, (_, i) => `Snippet ${i}`),
  ),
}));

describe("perf smoke", () => {
  it("records embedding throughput", async () => {
    const samples = Array.from({ length: 25 }, (_, i) => `sample text ${i}`);
    const start = performance.now();
    for (const sample of samples) {
      await generateEmbedding(sample);
    }
    const elapsed = performance.now() - start;
    const avg = elapsed / samples.length;
    expect(avg).toBeLessThan(80);
  });

  it("records retrieval latency p50/p95", async () => {
    const runs: number[] = [];
    for (let i = 0; i < 20; i += 1) {
      const start = performance.now();
      await retrieveContextForQuery(`q-${i}`, "standard");
      runs.push(performance.now() - start);
    }
    const sorted = [...runs].sort((a, b) => a - b);
    const p50 = sorted[Math.floor(sorted.length * 0.5)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    expect(p50).toBeLessThan(20);
    expect(p95).toBeLessThan(50);
  });

  it("records planner schema success rate", async () => {
    const prompts = [
      "find notes about roadmap",
      "remind me tomorrow",
      "search contacts for alex",
      "summarize meeting notes",
      "create note about launch",
    ];
    let valid = 0;
    for (const prompt of prompts) {
      const steps = await planStepsFromPrompt(
        { prompt },
        async (_messages: ChatMessage[]) =>
          JSON.stringify({
            steps: [{ id: "1", description: "Search notes", toolName: "notes.search", args: { query: prompt } }],
          }),
      );
      if (steps.length > 0) valid += 1;
    }
    const successRate = valid / prompts.length;
    expect(successRate).toBeGreaterThanOrEqual(0.9);
  });
});
