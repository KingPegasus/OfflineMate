import { parseThinkTaggedContent, toThinkingLines } from "@/ai/think-parser";

describe("think parser", () => {
  it("extracts thinking and response when tags are present", () => {
    const raw = "<think>\nstep 1\nstep 2\n</think>\nFinal answer";
    const parsed = parseThinkTaggedContent(raw);
    expect(parsed.hasThinkTag).toBe(true);
    expect(parsed.isClosed).toBe(true);
    expect(parsed.thinking).toContain("step 1");
    expect(parsed.response).toContain("Final answer");
    expect(parsed.response).not.toContain("<think>");
  });

  it("handles in-progress thinking when close tag is missing", () => {
    const raw = "<think>\nworking...";
    const parsed = parseThinkTaggedContent(raw);
    expect(parsed.hasThinkTag).toBe(true);
    expect(parsed.isClosed).toBe(false);
    expect(parsed.response).toBe("");
    expect(parsed.thinking).toContain("working...");
  });

  it("returns raw response when think tags are missing", () => {
    const raw = "Hello without think tag";
    const parsed = parseThinkTaggedContent(raw);
    expect(parsed.hasThinkTag).toBe(false);
    expect(parsed.response).toBe(raw);
    expect(parsed.thinking).toBe("");
  });

  it("normalizes thinking lines", () => {
    const lines = toThinkingLines("  one \n\n two \n");
    expect(lines).toEqual(["one", "two"]);
  });
});

