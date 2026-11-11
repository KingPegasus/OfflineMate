import { vi } from "vitest";
import { buildPrompt } from "@/ai/prompt-builder";
import { formatTokPerSec, stripTokPerSecLines } from "@/utils/tok-per-sec";
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
    expect(result[0].content).toContain("indexed notes");
  });

  it("when memory lookup returns nothing, hints the model not to answer generically", () => {
    const messages: ChatMessage[] = [
      { id: "u1", role: "user", content: "what did I save about X", createdAt: Date.now() },
    ];
    const result = buildPrompt({
      tier: "standard",
      messages,
      contextSnippets: [],
      contextLookupEmpty: true,
    });
    expect(result[0].content).toContain("no relevant passages");
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

  it("keeps the UI speed line out of earlier assistant replies", () => {
    const now = Date.now();
    const messages: ChatMessage[] = [
      { id: "u1", role: "user", content: "Hello", createdAt: now },
      { id: "a1", role: "assistant", content: "Hi there.\n\n(18.3 tok/s)", createdAt: now },
      { id: "u2", role: "user", content: "What is LLM", createdAt: now },
    ];
    const result = buildPrompt({ tier: "lite", messages });
    const assistant = result.find((m) => m.role === "assistant");
    expect(assistant?.content).toBe("Hi there.");
    expect(result.map((m) => m.content).join("\n")).not.toContain("tok/s");
  });
});

describe("stripTokPerSecLines", () => {
  it("removes copied and real speed lines but keeps other text", () => {
    expect(stripTokPerSecLines("Answer.\n\n(18.3 tok/s)\n\n(10.1 tok/s)")).toBe("Answer.");
    expect(stripTokPerSecLines("Answer.\n\n(n/a tok/s)")).toBe("Answer.");
    expect(stripTokPerSecLines("Speed was 18 tok/s (fast).")).toBe("Speed was 18 tok/s (fast).");
  });

  it("strips exactly the lines formatTokPerSec produces", () => {
    for (const speed of [18.25, 0.4, 123]) {
      expect(stripTokPerSecLines(`Answer.\n\n${formatTokPerSec(speed)}`)).toBe("Answer.");
    }
  });
});
