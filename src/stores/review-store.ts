import { AppState, Linking } from "react-native";
import Constants from "expo-constants";
import * as StoreReview from "expo-store-review";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { createSecureStorage } from "@/stores/settings-store";
import {
  INITIAL_REVIEW_PROMPT_STATE,
  migrateReviewPromptState,
  shouldRequestReview,
  type ReviewPromptState,
} from "@/utils/review-prompt";

/** Wait after a reply appears before showing the sheet, so it doesn't cover the answer mid-read. */
const PROMPT_DELAY_MS = 1500;

interface ReviewStore extends ReviewPromptState {
  ensureFirstSeen: (now: number) => void;
  recordSuccess: (count?: number) => void;
  markPrompted: (now: number, version: string | null) => void;
  markRatedFromSettings: () => void;
}

/** Clean replies that finished before the saved counters loaded; added once hydration completes. */
let successesBeforeHydration = 0;

export const useReviewStore = create<ReviewStore>()(
  persist(
    (set) => ({
      ...INITIAL_REVIEW_PROMPT_STATE,
      ensureFirstSeen: (now) => set((s) => (s.firstSeenAt === null ? { firstSeenAt: now } : {})),
      recordSuccess: (count = 1) => set((s) => ({ successCount: s.successCount + count })),
      markPrompted: (now, version) =>
        set((s) => ({ lastPromptAt: now, lastPromptVersion: version, promptCount: s.promptCount + 1 })),
      markRatedFromSettings: () => set({ ratedFromSettings: true }),
    }),
    {
      name: "offlinemate-review-prompt",
      storage: createJSONStorage(() => createSecureStorage()),
      version: 1,
      // Normalizes whatever was saved (or nothing) on every hydration, so no separate migrate step.
      merge: (persisted, current) => ({ ...current, ...migrateReviewPromptState(persisted) }),
      partialize: (s): ReviewPromptState => ({
        firstSeenAt: s.firstSeenAt,
        successCount: s.successCount,
        lastPromptAt: s.lastPromptAt,
        lastPromptVersion: s.lastPromptVersion,
        promptCount: s.promptCount,
        ratedFromSettings: s.ratedFromSettings,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state.ensureFirstSeen(Date.now());
        if (successesBeforeHydration > 0) {
          state.recordSuccess(successesBeforeHydration);
          successesBeforeHydration = 0;
        }
      },
    },
  ),
);

function appVersion(): string | null {
  return Constants.expoConfig?.version ?? null;
}

let pendingTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Call after a reply was delivered cleanly. Counts the success and, when the rules in
 * `shouldRequestReview` allow it, asks the platform to show its review sheet. Never throws.
 */
export function noteSuccessfulReply(isBusy: () => boolean): void {
  try {
    if (!useReviewStore.persist.hasHydrated()) {
      successesBeforeHydration += 1;
      return;
    }
    useReviewStore.getState().recordSuccess();
    if (!shouldRequestReview(useReviewStore.getState(), Date.now(), appVersion())) return;
    if (pendingTimer) return;
    pendingTimer = setTimeout(() => {
      pendingTimer = null;
      void requestReviewNow(isBusy);
    }, PROMPT_DELAY_MS);
  } catch (e) {
    console.warn("[OfflineMate] Review prompt check failed:", e);
  }
}

async function requestReviewNow(isBusy: () => boolean): Promise<void> {
  try {
    // Re-check: the user may have sent another message or left the app during the delay.
    if (AppState.currentState !== "active" || isBusy()) return;
    const now = Date.now();
    const version = appVersion();
    if (!shouldRequestReview(useReviewStore.getState(), now, version)) return;
    if (!(await StoreReview.isAvailableAsync())) return;
    // Record before asking: the platform doesn't say whether the sheet appeared.
    useReviewStore.getState().markPrompted(now, version);
    await StoreReview.requestReview();
  } catch (e) {
    console.warn("[OfflineMate] Review prompt failed:", e);
  }
}

/**
 * Store listing URL from app.json (`android.playStoreUrl` / `ios.appStoreUrl`), or null when this
 * platform has no listing yet (iOS until it ships), in which case Settings hides the Rate row.
 */
export function getStoreListingUrl(): string | null {
  try {
    return StoreReview.storeUrl();
  } catch {
    return null;
  }
}

/** Settings → Rate OfflineMate: opens the store listing and stops automatic prompts for good. */
export async function openStoreListingForRating(): Promise<boolean> {
  const url = getStoreListingUrl();
  if (!url) return false;
  try {
    await Linking.openURL(url);
    // Only once the store actually opened: a failed open shouldn't switch the prompt off for good.
    useReviewStore.getState().markRatedFromSettings();
    return true;
  } catch (e) {
    console.warn("[OfflineMate] Could not open the store listing:", e);
    return false;
  }
}
