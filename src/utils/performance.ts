import { AppState } from "react-native";
import DeviceInfo from "react-native-device-info";

export function registerBackgroundUnload(onUnload: () => void) {
  return AppState.addEventListener("change", (state) => {
    if (state !== "active") {
      onUnload();
    }
  });
}

export async function isMemoryPressureHigh(thresholdBytes = 1.2 * 1024 ** 3) {
  const used = await DeviceInfo.getUsedMemory();
  return used >= thresholdBytes;
}

