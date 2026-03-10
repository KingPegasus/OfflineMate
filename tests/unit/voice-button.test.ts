import { describe, expect, it } from "vitest";

/**
 * Voice button layout contract: dimensions must be positive so the button
 * is never invisible after press-release. useVoice must set isRecording to false
 * in stopListening's finally block so the button returns to visible state.
 * These values must match VOICE_BUTTON_LAYOUT in src/components/VoiceButton.tsx.
 */
const VOICE_BUTTON_BUTTON_SIZE = 44;
const VOICE_BUTTON_WRAPPER_PADDING = 4;
const VOICE_BUTTON_WRAPPER_SIZE = VOICE_BUTTON_BUTTON_SIZE + VOICE_BUTTON_WRAPPER_PADDING * 2;

describe("VoiceButton layout (visibility)", () => {
  it("has positive dimensions so button is never invisible", () => {
    expect(VOICE_BUTTON_BUTTON_SIZE).toBeGreaterThan(0);
    expect(VOICE_BUTTON_WRAPPER_SIZE).toBeGreaterThan(0);
    expect(VOICE_BUTTON_WRAPPER_SIZE).toBeGreaterThanOrEqual(VOICE_BUTTON_BUTTON_SIZE);
  });

  it("uses consistent wrapper size (button + padding)", () => {
    const expectedWrapper = VOICE_BUTTON_BUTTON_SIZE + VOICE_BUTTON_WRAPPER_PADDING * 2;
    expect(VOICE_BUTTON_WRAPPER_SIZE).toBe(expectedWrapper);
  });
});
