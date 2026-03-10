import { describe, expect, it } from "vitest";
import { mergeTranscript, normalizeSttResult } from "@/voice/stt-transcript-utils";

describe("stt transcript utils", () => {
  it("normalizes blank audio markers", () => {
    expect(normalizeSttResult("[BLANK_AUDIO]")).toBe("No speech detected.");
    expect(normalizeSttResult("   [BLANK_AUDIO]  ")).toBe("No speech detected.");
    expect(normalizeSttResult("")).toBe("No speech captured.");
  });

  it("prefers expanded transcript and ignores regressions", () => {
    expect(mergeTranscript("set reminder", "set reminder in 5 minutes")).toBe(
      "set reminder in 5 minutes",
    );
    expect(mergeTranscript("set reminder in 5 minutes to sleep", "set reminder in 5")).toBe(
      "set reminder in 5 minutes to sleep",
    );
  });

  it("merges overlapping chunks for trailing words", () => {
    expect(mergeTranscript("set reminder in five", "five minutes to sleep")).toBe(
      "set reminder in five minutes to sleep",
    );
  });
});
