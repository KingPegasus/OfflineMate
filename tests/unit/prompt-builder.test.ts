import { vi } from "vitest";
import { buildPrompt } from "@/ai/prompt-builder";
import type { ChatMessage } from "@/types/assistant";

vi.mock("@/context/long-term-memory", () => ({
  getImportantMemories: () => [{ id: "m1", content: "User likes concise summaries", created_at: Date.now() }],
}));

describe("buildPrompt", () => {
  it("injects memory and tool output into system prompt", () => {
    const messages: ChatMessage[] = [
      { id: "u1", role: "user", content: "hello", createdAt: Date.now() },
    ];
    const result = buildPrompt({
      tier: "standard",
      messages,
      contextSnippets: ["first context"],
      toolResult: "Tool ok",
    });

    expect(result[0].role).toBe("system");
    expect(result[0].content).toContain("User asked to remember");
    expect(result[0].content).toContain("Tool output:");
    expect(result[0].content).toContain("Context:");
  });

  it("applies tight context budget on lite tier", () => {
    const messages: ChatMessage[] = [
      { id: "u1", role: "user", content: "hello", createdAt: Date.now() },
    ];
    const result = buildPrompt({
      tier: "lite",
      messages,
      contextSnippets: ["x".repeat(2000)],
    });
    expect(result[0].content).not.toContain("Context:");
  });
});
