import { useEffect } from "react";
import { Dimensions, type ScaledSize } from "react-native";
import * as ScreenOrientation from "expo-screen-orientation";
import { shouldLockPortrait } from "@/utils/layout";

/**
 * Keeps phones in portrait and lets tablets and foldables rotate.
 * Uses the physical screen size (not the window), so split screen on a tablet doesn't lock it,
 * and re-checks when the screen changes (for example a foldable being unfolded).
 */
export function usePhonePortraitLock() {
  useEffect(() => {
    const apply = (width: number, height: number) => {
      const action = shouldLockPortrait(width, height)
        ? ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP)
        : ScreenOrientation.unlockAsync();
      action.catch((e) => console.warn("[OfflineMate] Orientation lock failed:", e));
    };
    const { width, height } = Dimensions.get("screen");
    apply(width, height);
    const sub = Dimensions.addEventListener("change", ({ screen }: { screen: ScaledSize }) => apply(screen.width, screen.height));
    return () => sub.remove();
  }, []);
}
