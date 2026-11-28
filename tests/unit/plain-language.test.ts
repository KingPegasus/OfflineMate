import { describe, expect, it, vi } from "vitest";
import { routeIntent } from "@/ai/intent-router";
import { chatModelBadgeText } from "@/utils/chat-model-label";
import { selectToolFromInput, TOOL_REGISTRY } from "@/tools/tool-registry";
import { HELP_TOPICS, TOOL_DISPLAY, toolTitle } from "@/tools/tool-display";

// The registry imports every tool; stub their native modules (these tests only need routing).
vi.mock("react-native", () => ({ Platform: { OS: "android" } }));
vi.mock("expo-notifications", () => ({}));
vi.mock("expo-calendar/legacy", () => ({}));
vi.mock("expo-contacts/legacy", () => ({}));
vi.mock("expo-alarm", () => ({}));
vi.mock("@/native/ios-alarms", () => ({}));
vi.mock("@/db/database", () => ({ getDb: () => ({}) }));
vi.mock("@/context/context-indexer", () => ({ indexNoteForRetrieval: vi.fn() }));

describe("Tools tab wording", () => {
  it("has a friendly entry for every registered tool, and nothing extra", () => {
    expect(TOOL_DISPLAY.map((t) => t.name).sort()).toEqual(TOOL_REGISTRY.map((t) => t.name).sort());
  });

  it("titles and descriptions avoid tool ids and jargon", () => {
    for (const tool of TOOL_DISPLAY) {
      expect(tool.title).not.toContain(".");
      expect(`${tool.title} ${tool.description}`).not.toMatch(/\b(SQLite|AlarmKit|native|LLM|RAG|API)\b/);
    }
  });

  it.each(TOOL_DISPLAY.filter((t) => t.name !== "notes.search").map((t) => [t.example, t.name] as const))(
    "example %j goes to %s",
    (example, name) => {
      expect(routeIntent(example)).toBe("tool");
      expect(selectToolFromInput(example)?.name).toBe(name);
    },
  );

  it("the find-a-note example searches saved notes", () => {
    const example = TOOL_DISPLAY.find((t) => t.name === "notes.search")!.example;
    expect(routeIntent(example)).toBe("context");
  });

  it("Help topics are short and free of jargon", () => {
    expect(HELP_TOPICS.length).toBeGreaterThanOrEqual(4);
    for (const topic of HELP_TOPICS) {
      expect(topic.body.length).toBeLessThan(200);
      expect(`${topic.title} ${topic.body}`).not.toMatch(/(LLM|RAG|model file|tier|DNS|token|API|Whisper)/i);
    }
  });

  it("toolTitle names a tool in plain words and falls back to the id", () => {
    expect(toolTitle("reminders.set")).toBe("Reminders");
    expect(toolTitle("unknown.tool")).toBe("unknown.tool");
  });
});

describe("chat model badge", () => {
  const base = { tierLabel: "Balanced", modelName: "LFM 2.5 VL 1.6B", modelId: "lfm2.5-vl-1.6b" };

  it("shows only the plain size by default", () => {
    expect(chatModelBadgeText({ ...base, canSeePhotos: false, showTechnicalDetails: false })).toBe("Assistant: Balanced");
    expect(chatModelBadgeText({ ...base, canSeePhotos: true, showTechnicalDetails: false })).toBe(
      "Assistant: Balanced · can look at photos",
    );
  });

  it("adds the model name and id with technical details on", () => {
    expect(chatModelBadgeText({ ...base, canSeePhotos: true, showTechnicalDetails: true })).toBe(
      "Assistant: Balanced · can look at photos · LFM 2.5 VL 1.6B (lfm2.5-vl-1.6b)",
    );
  });
});
