import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { noteSuccessfulReply, openStoreListingForRating, useReviewStore } from "@/stores/review-store";
import { INITIAL_REVIEW_PROMPT_STATE, REVIEW_PROMPT_RULES } from "@/utils/review-prompt";

const rn = vi.hoisted(() => ({
  AppState: { currentState: "active" as string },
  Linking: { openURL: vi.fn(async (_url: string) => true) },
}));
const storeReview = vi.hoisted(() => ({
  isAvailableAsync: vi.fn(async () => true),
  requestReview: vi.fn(async () => undefined),
  storeUrl: vi.fn((): string | null => "https://play.google.com/store/apps/details?id=com.offlinemate.app"),
}));

vi.mock("react-native", () => rn);
vi.mock("expo-store-review", () => storeReview);
vi.mock("expo-constants", () => ({ default: { expoConfig: { version: "0.10.0" } } }));

const DAY = 24 * 60 * 60 * 1000;
const notBusy = () => false;

/** Saved state that becomes eligible with one more clean reply. */
function setAlmostEligible() {
  useReviewStore.setState({
    ...INITIAL_REVIEW_PROMPT_STATE,
    firstSeenAt: Date.now() - (REVIEW_PROMPT_RULES.minDaysSinceFirstSeen + 1) * DAY,
    successCount: REVIEW_PROMPT_RULES.minSuccesses - 1,
  });
}

async function firePromptTimer() {
  await vi.advanceTimersByTimeAsync(2000);
}

beforeEach(async () => {
  vi.useFakeTimers();
  await useReviewStore.persist.rehydrate();
  useReviewStore.setState({ ...INITIAL_REVIEW_PROMPT_STATE, firstSeenAt: Date.now() });
  rn.AppState.currentState = "active";
  storeReview.isAvailableAsync.mockResolvedValue(true);
  storeReview.storeUrl.mockReturnValue("https://play.google.com/store/apps/details?id=com.offlinemate.app");
  rn.Linking.openURL.mockResolvedValue(true);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("noteSuccessfulReply", () => {
  it("counts the success and requests a review once eligible, recording the prompt", async () => {
    setAlmostEligible();
    noteSuccessfulReply(notBusy);
    expect(useReviewStore.getState().successCount).toBe(REVIEW_PROMPT_RULES.minSuccesses);
    expect(storeReview.requestReview).not.toHaveBeenCalled();
    await firePromptTimer();
    expect(storeReview.requestReview).toHaveBeenCalledTimes(1);
    const s = useReviewStore.getState();
    expect(s.promptCount).toBe(1);
    expect(s.lastPromptVersion).toBe("0.10.0");
  });

  it("does not request when not yet eligible", async () => {
    noteSuccessfulReply(notBusy);
    await firePromptTimer();
    expect(storeReview.requestReview).not.toHaveBeenCalled();
  });

  it("skips the prompt if another message started during the delay", async () => {
    setAlmostEligible();
    noteSuccessfulReply(() => true);
    await firePromptTimer();
    expect(storeReview.requestReview).not.toHaveBeenCalled();
    expect(useReviewStore.getState().promptCount).toBe(0);
  });

  it("skips the prompt if the app went to the background", async () => {
    setAlmostEligible();
    noteSuccessfulReply(notBusy);
    rn.AppState.currentState = "background";
    await firePromptTimer();
    expect(storeReview.requestReview).not.toHaveBeenCalled();
  });

  it("doesn't use up a prompt when the platform can't show the sheet", async () => {
    setAlmostEligible();
    storeReview.isAvailableAsync.mockResolvedValue(false);
    noteSuccessfulReply(notBusy);
    await firePromptTimer();
    expect(storeReview.requestReview).not.toHaveBeenCalled();
    expect(useReviewStore.getState().promptCount).toBe(0);
  });

  it("keeps successes that finish before the saved counters load", async () => {
    const hydrated = vi.spyOn(useReviewStore.persist, "hasHydrated").mockReturnValue(false);
    noteSuccessfulReply(notBusy);
    noteSuccessfulReply(notBusy);
    expect(useReviewStore.getState().successCount).toBe(0);
    hydrated.mockRestore();
    await useReviewStore.persist.rehydrate();
    expect(useReviewStore.getState().successCount).toBe(2);
  });
});

describe("openStoreListingForRating", () => {
  it("stops automatic prompts once the store opened", async () => {
    await expect(openStoreListingForRating()).resolves.toBe(true);
    expect(useReviewStore.getState().ratedFromSettings).toBe(true);
  });

  it("keeps automatic prompts when the store couldn't be opened", async () => {
    rn.Linking.openURL.mockRejectedValue(new Error("no handler"));
    await expect(openStoreListingForRating()).resolves.toBe(false);
    expect(useReviewStore.getState().ratedFromSettings).toBe(false);
  });

  it("does nothing without a store URL (iOS before an App Store listing)", async () => {
    storeReview.storeUrl.mockReturnValue(null);
    await expect(openStoreListingForRating()).resolves.toBe(false);
    expect(rn.Linking.openURL).not.toHaveBeenCalled();
    expect(useReviewStore.getState().ratedFromSettings).toBe(false);
  });
});
