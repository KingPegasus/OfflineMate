import { describe, expect, it } from "vitest";
import { routeIntent } from "@/ai/intent-router";
import { resolveReminderSeconds, resolveReminderText } from "@/tools/reminder-parser";
import { mergeTranscript, normalizeSttResult } from "@/voice/stt-transcript-utils";

describe("voice-to-tool critical flow", () => {
  it("routes merged reminder transcript to tool intent", () => {
    const merged = mergeTranscript("remind me in five", "five minutes to sleep");
    const normalized = normalizeSttResult(merged);
    expect(routeIntent(normalized)).toBe("tool");
  });

  it("extracts reminder action and time from voice transcript", () => {
    const transcript = "Set reminder in 5 minutes to sleep";
    expect(resolveReminderText("", transcript)).toBe("sleep");
    expect(resolveReminderSeconds(undefined, transcript)).toBe(300);
  });
});
