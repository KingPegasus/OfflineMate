import { AppState, type AppStateStatus } from "react-native";
import DeviceInfo from "react-native-device-info";

const BACKGROUND_UNLOAD_DELAY_MS = 2000;

export function registerBackgroundUnload(onUnload: () => void) {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const scheduleUnload = () => {
    if (timeoutId) return;
    timeoutId = setTimeout(() => {
      timeoutId = null;
      onUnload();
    }, BACKGROUND_UNLOAD_DELAY_MS);
  };

  const cancelUnload = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return AppState.addEventListener("change", (state: AppStateStatus) => {
    if (state === "active") {
      cancelUnload();
    } else {
      scheduleUnload();
    }
  });
}

export async function isMemoryPressureHigh(thresholdBytes = 1.2 * 1024 ** 3) {
  const used = await DeviceInfo.getUsedMemory();
  return used >= thresholdBytes;
}

