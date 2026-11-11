import { describe, expect, it } from "vitest";
import {
  INITIAL_REVIEW_PROMPT_STATE,
  migrateReviewPromptState,
  REVIEW_PROMPT_RULES,
  shouldRequestReview,
  type ReviewPromptState,
} from "@/utils/review-prompt";

const DAY = 24 * 60 * 60 * 1000;
const START = Date.UTC(2026, 10, 1);

function eligible(overrides: Partial<ReviewPromptState> = {}): ReviewPromptState {
  return {
    ...INITIAL_REVIEW_PROMPT_STATE,
    firstSeenAt: START,
    successCount: REVIEW_PROMPT_RULES.minSuccesses,
    ...overrides,
  };
}

const LATER = START + REVIEW_PROMPT_RULES.minDaysSinceFirstSeen * DAY;

describe("shouldRequestReview", () => {
  it("asks once the install is old enough and has enough clean replies", () => {
    expect(shouldRequestReview(eligible(), LATER, "0.10.0")).toBe(true);
  });

  it("waits until first launch has been recorded", () => {
    expect(shouldRequestReview(eligible({ firstSeenAt: null }), LATER, "0.10.0")).toBe(false);
  });

  it("does not ask in the first days after install", () => {
    expect(shouldRequestReview(eligible(), LATER - 1, "0.10.0")).toBe(false);
  });

  it("needs enough clean replies", () => {
    const state = eligible({ successCount: REVIEW_PROMPT_RULES.minSuccesses - 1 });
    expect(shouldRequestReview(state, LATER, "0.10.0")).toBe(false);
  });

  it("never asks again after Rate OfflineMate was tapped in Settings", () => {
    expect(shouldRequestReview(eligible({ ratedFromSettings: true }), LATER, "0.10.0")).toBe(false);
  });

  it("asks at most once per app version", () => {
    const state = eligible({ lastPromptAt: START, lastPromptVersion: "0.10.0", promptCount: 1 });
    const muchLater = START + 365 * DAY;
    expect(shouldRequestReview(state, muchLater, "0.10.0")).toBe(false);
    expect(shouldRequestReview(state, muchLater, "0.11.0")).toBe(true);
  });

  it("leaves the minimum gap between prompts even across versions", () => {
    const state = eligible({ lastPromptAt: LATER, lastPromptVersion: "0.10.0", promptCount: 1 });
    const gap = REVIEW_PROMPT_RULES.minDaysBetweenPrompts * DAY;
    expect(shouldRequestReview(state, LATER + gap - 1, "0.11.0")).toBe(false);
    expect(shouldRequestReview(state, LATER + gap, "0.11.0")).toBe(true);
  });

  it("stops after the maximum number of prompts", () => {
    const state = eligible({
      lastPromptAt: START,
      lastPromptVersion: "0.1.0",
      promptCount: REVIEW_PROMPT_RULES.maxPrompts,
    });
    expect(shouldRequestReview(state, START + 365 * DAY, "0.12.0")).toBe(false);
  });

  it("still applies the other rules when the app version is unknown", () => {
    const state = eligible({ lastPromptAt: START, lastPromptVersion: "0.10.0", promptCount: 1 });
    expect(shouldRequestReview(state, START + 365 * DAY, null)).toBe(true);
    expect(shouldRequestReview(state, START + DAY, null)).toBe(false);
  });
});

describe("migrateReviewPromptState", () => {
  it("returns the initial state for missing or malformed data", () => {
    expect(migrateReviewPromptState(undefined)).toEqual(INITIAL_REVIEW_PROMPT_STATE);
    expect(migrateReviewPromptState("nope")).toEqual(INITIAL_REVIEW_PROMPT_STATE);
    expect(
      migrateReviewPromptState({
        firstSeenAt: "yesterday",
        successCount: -4,
        lastPromptAt: Number.NaN,
        lastPromptVersion: 7,
        promptCount: Infinity,
        ratedFromSettings: "yes",
      }),
    ).toEqual(INITIAL_REVIEW_PROMPT_STATE);
  });

  it("keeps valid values", () => {
    const saved: ReviewPromptState = {
      firstSeenAt: START,
      successCount: 12,
      lastPromptAt: LATER,
      lastPromptVersion: "0.10.0",
      promptCount: 1,
      ratedFromSettings: true,
    };
    expect(migrateReviewPromptState(saved)).toEqual(saved);
  });
});
