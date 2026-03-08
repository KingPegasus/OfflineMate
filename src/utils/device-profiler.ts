import * as Device from "expo-device";
import DeviceInfo from "react-native-device-info";
import type { ModelTier } from "@/types/assistant";

export async function getDeviceRamGb(): Promise<number> {
  const bytes = await DeviceInfo.getTotalMemory();
  return bytes / 1024 ** 3;
}

export async function getDeviceTierRecommendation(): Promise<ModelTier> {
  const ram = await getDeviceRamGb();
  const yearClass = Device.deviceYearClass ?? 0;

  if (ram >= 10 || yearClass >= 2024) return "full";
  if (ram >= 5 || yearClass >= 2021) return "standard";
  return "lite";
}

