import { useSyncExternalStore } from "react";
import { requireOptionalNativeModule } from "expo";
import type { FoldFeature } from "@/utils/layout";

type WindowPostureState = { features: FoldFeature[] };

interface OfflineMateWindowPosture {
  getState(): WindowPostureState;
  addListener(event: "onChange", listener: (state: WindowPostureState) => void): { remove(): void };
}

/**
 * The local window-posture module (`modules/window-posture`, Jetpack WindowManager). Android
 * only; on iOS and in tests it's missing and the app behaves as if the screen were flat.
 */
const native = requireOptionalNativeModule<OfflineMateWindowPosture>("OfflineMateWindowPosture");

const EMPTY: FoldFeature[] = [];
let features: FoldFeature[] = EMPTY;
const listeners = new Set<() => void>();
let subscription: { remove(): void } | null = null;

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (native && !subscription) {
    subscription = native.addListener("onChange", (state) => {
      features = state.features ?? EMPTY;
      listeners.forEach((l) => l());
    });
    try {
      features = native.getState().features ?? EMPTY;
    } catch (e) {
      console.warn("[OfflineMate] Window posture unavailable:", e);
    }
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && subscription) {
      subscription.remove();
      subscription = null;
    }
  };
}

const getSnapshot = () => features;

/** Folds and hinges in the app window; empty on phones, tablets, iOS and flat-only devices. */
export function useFoldFeatures(): FoldFeature[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
