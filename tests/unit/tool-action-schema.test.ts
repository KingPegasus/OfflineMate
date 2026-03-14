import { describe, expect, it } from "vitest";
import { parseToolActionDecision, parseToolActionDecisionLenient } from "@/ai/tool-action-schema";

describe("tool action schema parser", () => {
  it("parses use_tool decision", () => {
    const raw = JSON.stringify({
      decision: "use_tool",
      toolName: "search.web",
      query: "current date today",
      answer: null,
    });
    const parsed = parseToolActionDecision(raw);
    expect(parsed).toEqual({
      decision: "use_tool",
      toolName: "search.web",
      query: "current date today",
      answer: null,
    });
  });

  it("parses answer_direct decision", () => {
    const raw = JSON.stringify({
      decision: "answer_direct",
      toolName: null,
      query: null,
      answer: "Today is Saturday.",
    });
    const parsed = parseToolActionDecision(raw);
    expect(parsed?.decision).toBe("answer_direct");
    expect(parsed?.answer).toBe("Today is Saturday.");
  });

  it("rejects invalid tool decisions", () => {
    const raw = JSON.stringify({
      decision: "use_tool",
      toolName: "calendar.getEvents",
      query: "today",
      answer: null,
    });
    expect(parseToolActionDecision(raw)).toBeNull();
  });

  it("normalizes placeholder-style malformed decision to use_tool", () => {
    const raw = JSON.stringify({
      decision: "use_tool|answer_direct",
      toolName: "search.web|null",
      query: "current date",
      answer: "Today's date is [insert current date here].",
    });
    const parsed = parseToolActionDecision(raw);
    expect(parsed).toEqual({
      decision: "use_tool",
      toolName: "search.web",
      query: "current date",
      answer: "Today's date is [insert current date here].",
    });
  });

  it("leniently parses ACTION/QUERY text", () => {
    const raw = "ACTION:search.web\nQUERY:current date today";
    const parsed = parseToolActionDecisionLenient(raw);
    expect(parsed).toEqual({
      decision: "use_tool",
      toolName: "search.web",
      query: "current date today",
      answer: null,
    });
  });

  it("does not treat structured json-like text as direct answer", () => {
    const raw =
      '{"decision":"use_tool|answer_direct","toolName":"search.web|null","query":"current date","answer":"x"}';
    expect(parseToolActionDecisionLenient(raw)).toBeNull();
  });

  it("rejects <think>/reasoning as direct answer (fallback to search)", () => {
    expect(parseToolActionDecisionLenient("<think>I should search")).toBeNull();
    expect(parseToolActionDecisionLenient("Okay, the user is asking for the current date. Let me see.")).toBeNull();
    expect(parseToolActionDecisionLenient("Since I'm a language model, I don't have real-time data.")).toBeNull();
  });
});

