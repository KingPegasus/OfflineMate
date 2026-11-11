/**
 * When to ask for a Google Play / App Store rating with the platform's in-app review sheet.
 *
 * The platform APIs never say whether the sheet was shown, whether the user rated, or how many
 * stars they gave, so "stop after a 4 or 5 star rating" can't be done. Instead the prompt stops for
 * good once the user taps "Rate OfflineMate" in Settings, and is capped per version, by time and in
 * total. Play and the App Store also throttle the sheet themselves.
 *
 * Kept free of React Native imports so it can be unit tested.
 */

export interface ReviewPromptState {
  /** Epoch ms of the first launch this feature saw; null until recorded. */
  firstSeenAt: number | null;
  /** Replies delivered without an error, a failed tool or a model fallback. */
  successCount: number;
  /** Epoch ms of the last time the review sheet was requested. */
  lastPromptAt: number | null;
  /** App version the sheet was last requested in. */
  lastPromptVersion: string | null;
  /** How many times the sheet has been requested. */
  promptCount: number;
  /** The user opened the store from Settings → Rate OfflineMate: never prompt again. */
  ratedFromSettings: boolean;
}

export const REVIEW_PROMPT_RULES = {
  minDaysSinceFirstSeen: 3,
  minSuccesses: 5,
  minDaysBetweenPrompts: 90,
  maxPrompts: 3,
} as const;

const DAY_MS = 24 * 60 * 60 * 1000;

export const INITIAL_REVIEW_PROMPT_STATE: ReviewPromptState = {
  firstSeenAt: null,
  successCount: 0,
  lastPromptAt: null,
  lastPromptVersion: null,
  promptCount: 0,
  ratedFromSettings: false,
};

export function shouldRequestReview(
  state: ReviewPromptState,
  now: number,
  appVersion: string | null,
  rules = REVIEW_PROMPT_RULES,
): boolean {
  if (state.ratedFromSettings) return false;
  if (state.promptCount >= rules.maxPrompts) return false;
  if (state.firstSeenAt === null) return false;
  if (now - state.firstSeenAt < rules.minDaysSinceFirstSeen * DAY_MS) return false;
  if (state.successCount < rules.minSuccesses) return false;
  if (state.lastPromptAt !== null && now - state.lastPromptAt < rules.minDaysBetweenPrompts * DAY_MS) return false;
  if (appVersion !== null && state.lastPromptVersion === appVersion) return false;
  return true;
}

/** Normalizes persisted state; anything missing or malformed falls back to the initial value. */
export function migrateReviewPromptState(persisted: unknown): ReviewPromptState {
  const p = (persisted && typeof persisted === "object" ? persisted : {}) as Record<string, unknown>;
  const num = (v: unknown, fallback: number) =>
    typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : fallback;
  const numOrNull = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null);
  return {
    firstSeenAt: numOrNull(p.firstSeenAt),
    successCount: Math.floor(num(p.successCount, 0)),
    lastPromptAt: numOrNull(p.lastPromptAt),
    lastPromptVersion: typeof p.lastPromptVersion === "string" ? p.lastPromptVersion : null,
    promptCount: Math.floor(num(p.promptCount, 0)),
    ratedFromSettings: p.ratedFromSettings === true,
  };
}
